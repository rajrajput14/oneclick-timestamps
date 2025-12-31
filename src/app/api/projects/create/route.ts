import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { getUserUsage, canProcessVideo, deductMinutes } from '@/lib/payments/usage';
import { getYouTubeVideoId } from '@/lib/youtube/utils';
import { runSTTPipeline } from '@/lib/youtube/stt-pipeline';
import { fetchYouTubeTranscript } from '@/lib/youtube/transcript';
import { parseTranscriptFile, segmentsToText } from '@/lib/transcript/parser';
import { detectLanguage } from '@/lib/transcript/language';
import { generateTimestampsFromText } from '@/lib/ai/gemini-ai';
import { timestampToSeconds } from '@/lib/utils/timestamps';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Create new project and process timestamp generation
 * POST /api/projects/create
 */
export async function POST(req: NextRequest) {
    console.log("🟢 STEP 1: Request received");
    console.log("Backend PID:", process.pid);
    console.log("Function entry timestamp:", Date.now());
    try {
        // Check authentication
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from database
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Get user usage from database
        const usage = await getUserUsage(user.id);

        const formData = await req.formData();
        const youtubeUrl = formData.get('youtubeUrl') as string | null;
        const transcriptFile = formData.get('transcriptFile') as File | null;

        let transcript = '';
        let videoId: string | null = null;
        let title = 'Untitled Project';
        let durationSeconds = 0;

        // Process YouTube URL
        if (youtubeUrl) {
            videoId = getYouTubeVideoId(youtubeUrl);
            if (!videoId) {
                return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
            }
            console.log("🟢 STEP 2: YouTube URL validated");

            // [INSTANT RESPONSE] Create project record immediately
            const [project] = await db
                .insert(projects)
                .values({
                    userId: user.id,
                    title: `YouTube Video ${videoId}`,
                    youtubeUrl,
                    youtubeVideoId: videoId,
                    transcript: 'Initialising...',
                    language: 'Detecting...',
                    status: 'pending',
                    progressPercent: 0,
                    progressStep: 0,
                    progressMessage: 'Request Pending'
                })
                .returning();

            // [BACKGROUND PROCESS] Defer heavy lifting to avoid Vercel timeouts
            setTimeout(async () => {
                const updateProjectProgress = async (step: number, percent: number, message: string, status: string = 'processing') => {
                    console.log(`[Progress Update] Project ${project.id} - Step ${step}: ${percent}% - ${message}`);
                    try {
                        await db.update(projects)
                            .set({
                                progressStep: step,
                                progressPercent: percent,
                                progressMessage: message,
                                status,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Progress Update Error] Project ${project.id}:`, e);
                    }
                };

                try {
                    // --- STEP 1: Processing Media (0-33%) ---
                    console.log(`[Background] Project ${project.id} - Starting Step 1: Media Processing`);
                    await updateProjectProgress(1, 5, 'Analyzing Video Signals...');

                    // 1. Fetch Metadata
                    console.log(`[Background] Project ${project.id} - Fetching video duration...`);
                    const { getVideoDuration, extractAudio } = await import('@/lib/youtube/audio-extractor');
                    durationSeconds = await getVideoDuration(videoId!);
                    console.log(`[Background] Project ${project.id} - Duration acquired: ${durationSeconds}s`);

                    // 2. Validate Usage
                    const usageCheck = await canProcessVideo(user.id, durationSeconds);
                    if (!usageCheck.allowed) {
                        await updateProjectProgress(1, 0, 'Insufficient credits for this video.', 'failed');
                        return;
                    }

                    // 3. Check for YouTube captions (fast path) or prepare for audio extraction
                    const ytTranscriptData = await fetchYouTubeTranscript(videoId!);

                    if (!ytTranscriptData) {
                        // If no YouTube captions, we need to ensure audio can be extracted for STT
                        // This is a crucial part of media processing for the slow path.
                        await updateProjectProgress(1, 15, 'Preparing audio extraction...');
                        const extractionResult = await extractAudio(videoId!);
                        // In a real scenario, we might save the audio or its path.
                        // For now, just validate it can be extracted and clean up.
                        extractionResult.cleanup();
                    }

                    await updateProjectProgress(1, 33, 'Media processed successfully');
                    console.log(`[Background] Project ${project.id} - Step 1 Complete.`);

                    // --- STEP 2: Understanding Content (34-66%) ---
                    console.log(`[Background] Project ${project.id} - Starting Step 2: Content Understanding`);
                    await updateProjectProgress(2, 35, 'Analyzing content...');

                    let finalTranscript = '';
                    let finalLanguage = 'English';
                    let sttTimestamps: { time: string; title: string }[] = []; // To store STT generated timestamps if any

                    if (ytTranscriptData) {
                        // Fast path: Use YouTube captions
                        finalTranscript = ytTranscriptData.transcript;
                        finalLanguage = 'English';
                        await updateProjectProgress(2, 60, 'YouTube captions acquired.');
                    } else {
                        // Slow path: Run STT Pipeline
                        await updateProjectProgress(2, 45, 'Decoding audio streams with AI...');
                        const sttResult = await runSTTPipeline(videoId!, async (p, d) => {
                            // Map internal STT progress (0-100) to Step 2 range (45-65%)
                            const mappedPercent = Math.floor(45 + (p * 0.20)); // 20% of the step
                            await updateProjectProgress(2, mappedPercent, d, 'processing');
                        });
                        finalTranscript = 'Transcript generated via speech-to-text.'; // Actual transcript might be too large to store here
                        finalLanguage = sttResult.language;
                        sttTimestamps = sttResult.timestamps; // Store STT generated timestamps
                        await updateProjectProgress(2, 65, 'Speech-to-text analysis complete.');
                    }

                    await updateProjectProgress(2, 66, 'Content analysis complete.');
                    console.log(`[Background] Project ${project.id} - Step 2 Complete.`);

                    // --- STEP 3: Creating Timestamps (67-100%) ---
                    console.log(`[Background] Project ${project.id} - Starting Step 3: Timestamp Generation`);
                    await updateProjectProgress(3, 70, 'Generating intelligent chapters...');

                    let generatedTimestamps: { time: string; title: string }[] = [];

                    if (ytTranscriptData) {
                        // For fast path, generate timestamps from the full YouTube transcript
                        generatedTimestamps = await generateTimestampsFromText(finalTranscript, finalLanguage);
                    } else {
                        // For slow path, if STT already provided timestamps, use them.
                        // Otherwise, generate from the (potentially summarized) STT transcript.
                        if (sttTimestamps && sttTimestamps.length > 0) {
                            generatedTimestamps = sttTimestamps;
                        } else {
                            // Fallback: generate from the transcript text if STT didn't provide structured timestamps
                            generatedTimestamps = await generateTimestampsFromText(finalTranscript, finalLanguage);
                        }
                    }

                    if (!generatedTimestamps || generatedTimestamps.length === 0) {
                        throw new Error('Failed to generate timestamps.');
                    }

                    await updateProjectProgress(3, 90, 'Finalizing project...');

                    const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                        projectId: project.id,
                        timeSeconds: timestampToSeconds(ts.time),
                        timeFormatted: ts.time,
                        title: ts.title,
                        position: index,
                    }));

                    const processedMinutes = Math.ceil(durationSeconds / 60);

                    // Final Atomic Transaction
                    await db.transaction(async (tx) => {
                        if (timestampRecords.length > 0) {
                            await tx.insert(timestamps).values(timestampRecords);
                        }

                        await tx.update(projects)
                            .set({
                                status: 'completed',
                                progressPercent: 100,
                                progressStep: 3,
                                progressMessage: 'Completed successfully',
                                language: finalLanguage,
                                transcript: finalTranscript, // Store the transcript used for generation
                                processedMinutes,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));

                        await deductMinutes(user.id, durationSeconds || 60, tx);
                    });

                    console.log(`[Project Success] Project ${project.id} completed.`);

                } catch (error: any) {
                    console.error(`[Project Failure] Project ${project.id}:`, error);
                    await updateProjectProgress(1, 0, error.message || 'Processing failed.', 'failed');
                }
            }, 0);

            return NextResponse.json({
                success: true,
                projectId: project.id,
                status: 'pending'
            });
        }
        // Process uploaded transcript
        else if (transcriptFile) {
            const content = await transcriptFile.text();
            const filename = transcriptFile.name;
            title = filename.replace(/\.(txt|srt|vtt)$/i, '');

            // 1. Create project record immediately
            const [project] = await db
                .insert(projects)
                .values({
                    userId: user.id,
                    title,
                    transcript: 'Extracting content...',
                    language: 'Detecting...',
                    status: 'pending',
                    progressPercent: 0,
                    progressStep: 0,
                    progressMessage: 'Request Pending'
                })
                .returning();

            // 3. Launch processing in background
            setTimeout(async () => {
                const updateProjectProgress = async (step: number, percent: number, message: string, status: string = 'processing') => {
                    console.log(`[Transcript Progress] ${project.id} - Step ${step}: ${percent}% - ${message}`);
                    try {
                        await db.update(projects)
                            .set({
                                progressStep: step,
                                progressPercent: percent,
                                progressMessage: message,
                                status,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Transcript Progress Error] ${project.id}:`, e);
                    }
                };

                try {
                    // --- STEP 1: Processing Media (0-33%) ---
                    await updateProjectProgress(1, 15, 'Analyzing transcript structure...');
                    const segments = parseTranscriptFile(content, filename);
                    const fullTranscript = segmentsToText(segments);
                    await updateProjectProgress(1, 33, 'File data extracted.');

                    // --- STEP 2: Understanding Content (34-66%) ---
                    await updateProjectProgress(2, 40, 'Detecting intelligence...');
                    const languageInfo = await detectLanguage(fullTranscript);
                    await updateProjectProgress(2, 66, 'Language detected.');

                    // --- STEP 3: Creating Timestamps (67-100%) ---
                    await updateProjectProgress(3, 70, 'AI Synthesis in progress...');
                    const generatedTimestamps = await generateTimestampsFromText(fullTranscript, languageInfo.language);

                    if (!generatedTimestamps || generatedTimestamps.length === 0) {
                        throw new Error('Failed to generate timestamps from file.');
                    }

                    await updateProjectProgress(3, 90, 'Applying final touches...');

                    const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                        projectId: project.id,
                        timeSeconds: timestampToSeconds(ts.time),
                        timeFormatted: ts.time,
                        title: ts.title,
                        position: index,
                    }));

                    await db.transaction(async (tx) => {
                        await tx.insert(timestamps).values(timestampRecords);
                        await tx.update(projects)
                            .set({
                                status: 'completed',
                                progressPercent: 100,
                                progressStep: 3,
                                progressMessage: 'Success',
                                language: languageInfo.language,
                                transcript: fullTranscript,
                                processedMinutes: 1, // Files treated as 1 minute
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                        await deductMinutes(user.id, 60, tx);
                    });

                    console.log(`[Transcript Success] ${project.id}`);

                } catch (error: any) {
                    console.error(`[Transcript Failure] ${project.id}:`, error);
                    await updateProjectProgress(1, 0, error.message || 'Synthesis failed.', 'failed');
                }
            }, 0);

            return NextResponse.json({
                success: true,
                projectId: project.id,
                status: 'pending'
            });
        }
        else {
            return NextResponse.json(
                { error: 'Please provide a YouTube URL or upload a transcript' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Project creation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process request',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
