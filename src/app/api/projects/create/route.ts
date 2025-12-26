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
    console.log('[API/Create] Request started');
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
                    status: 'processing',
                    progress: 2,
                    statusDescription: 'Validating Video Signal...'
                })
                .returning();

            // [BACKGROUND PROCESS] Defer heavy lifting to avoid Vercel timeouts
            setTimeout(async () => {
                console.log(`[Background] STARTING sequence for project ${project.id} (Video: ${videoId})`);
                const updateProgress = async (progress: number, description: string, status: string = 'processing') => {
                    console.log(`[Background] [Project ${project.id}] Progress Update: ${progress}% - ${description} (Status: ${status})`);
                    try {
                        await db.update(projects)
                            .set({ progress, statusDescription: description, status, updatedAt: new Date() })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Background] [Project ${project.id}] Progress update error:`, e);
                    }
                };

                try {
                    // 1. Fetch Metadata (Slow)
                    let durationSeconds = 0;
                    try {
                        console.log(`[Background] [Project ${project.id}] Fetching video duration...`);
                        const { getVideoDuration } = await import('@/lib/youtube/audio-extractor');
                        durationSeconds = await getVideoDuration(videoId!);
                        console.log(`[Background] [Project ${project.id}] Video duration: ${durationSeconds}s`);
                    } catch (err) {
                        console.error(`[Background] [Project ${project.id}] Duration fetch failed:`, err);
                        await updateProgress(0, 'Failed to retrieve video metadata. Double check the URL.', 'failed');
                        return;
                    }

                    // 2. Validate Usage (Slow)
                    const usageCheck = await canProcessVideo(user.id, durationSeconds);
                    if (!usageCheck.allowed) {
                        console.warn(`[Background] Insufficient minutes for user ${user.id} (Project: ${project.id})`);
                        await db.update(projects)
                            .set({
                                status: 'failed',
                                statusDescription: 'Insufficient credits.',
                                errorMessage: `This video requires ${Math.round(durationSeconds / 60)} minutes. You have ${usageCheck.remainingMinutes} minutes left.`,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                        return;
                    }

                    const PHASE1_DURATION = 1200; // 20 minutes
                    const isLongVideo = durationSeconds > PHASE1_DURATION;

                    // --- TRY YOUTUBE TRANSCRIPT FIRST (FAST FALLBACK) ---
                    await updateProgress(10, 'Checking for available captions...');
                    const ytTranscriptData = await fetchYouTubeTranscript(videoId!);

                    if (ytTranscriptData) {
                        console.log(`[Background] [Project ${project.id}] Found YouTube captions. Using fast path.`);
                        await updateProgress(40, 'Captions found. Analyzing content...');

                        const generatedTimestamps = await generateTimestampsFromText(
                            ytTranscriptData.transcript,
                            'english' // We can improve language detection here if needed
                        );

                        if (generatedTimestamps && generatedTimestamps.length > 0) {
                            const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                                projectId: project.id,
                                timeSeconds: timestampToSeconds(ts.time),
                                timeFormatted: ts.time,
                                title: ts.title,
                                position: index,
                            }));
                            await db.insert(timestamps).values(timestampRecords);

                            await updateProgress(100, 'Completed', 'completed');
                            await db.update(projects)
                                .set({
                                    status: 'completed',
                                    progress: 100,
                                    statusDescription: 'Completed',
                                    language: 'English',
                                    transcript: ytTranscriptData.transcript,
                                    updatedAt: new Date()
                                })
                                .where(eq(projects.id, project.id));

                            await deductMinutes(user.id, durationSeconds || 60);
                            console.log(`[Background] [Project ${project.id}] Fast path successful`);
                            return;
                        }
                    }

                    // --- FALLBACK TO STT PIPELINE (SLOW PATH) ---
                    console.log(`[Background] [Project ${project.id}] No YouTube captions found or AI failed. Rolling out STT Pipeline...`);
                    await updateProgress(15, 'Starting deep audio analysis...');
                    await updateProgress(22, 'Extracting audio layers...');

                    console.log(`[Background] [Project ${project.id}] Running STT Pipeline (Phase 1)...`);
                    const phase1Result = await runSTTPipeline(videoId!, updateProgress, {
                        durationSeconds: isLongVideo ? PHASE1_DURATION : undefined,
                        descriptionPrefix: isLongVideo ? '[Phase 1] ' : ''
                    });
                    console.log(`[Background] [Project ${project.id}] Phase 1 complete. Found ${phase1Result.timestamps.length} timestamps.`);

                    await updateProgress(75, 'Structuring timestamps with AI...');

                    if (phase1Result.timestamps && phase1Result.timestamps.length > 0) {
                        const timestampRecords = phase1Result.timestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: index,
                        }));
                        await db.insert(timestamps).values(timestampRecords);
                    }

                    if (!isLongVideo) {
                        await updateProgress(95, 'Finalizing project...');
                        await db.update(projects)
                            .set({
                                status: 'completed',
                                progress: 100,
                                statusDescription: 'Completed',
                                language: phase1Result.language,
                                transcript: 'Transcript generated via STT.',
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));

                        await deductMinutes(user.id, phase1Result.processedSeconds);
                        console.log(`[Background] Project ${project.id} successful`);
                        return;
                    }

                    // Phase 2 logic (Long Videos)
                    await updateProgress(85, 'Initial timestamps ready. Refining full video...');
                    const phase2Result = await runSTTPipeline(videoId!, updateProgress, {
                        seekSeconds: PHASE1_DURATION,
                        descriptionPrefix: '[Phase 2] '
                    });

                    if (phase2Result.timestamps && phase2Result.timestamps.length > 0) {
                        const timestampRecords = phase2Result.timestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: phase1Result.timestamps.length + index,
                        }));
                        await db.insert(timestamps).values(timestampRecords);
                    }

                    await db.update(projects)
                        .set({
                            status: 'completed',
                            progress: 100,
                            statusDescription: 'Refinement complete.',
                            updatedAt: new Date()
                        })
                        .where(eq(projects.id, project.id));

                    await deductMinutes(user.id, phase2Result.processedSeconds);

                } catch (error: any) {
                    console.error(`[Background] Critical Failure for ${project.id}:`, error);
                    await db.update(projects)
                        .set({
                            status: 'failed',
                            errorMessage: error.message || 'Pipeline interruption.',
                            statusDescription: 'Failed',
                            updatedAt: new Date()
                        })
                        .where(eq(projects.id, project.id));
                }
            }, 0);

            return NextResponse.json({
                success: true,
                projectId: project.id,
                status: 'processing'
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
                    status: 'processing',
                    progress: 10,
                    statusDescription: 'Reading file...'
                })
                .returning();

            // 3. Launch processing in background
            setTimeout(async () => {
                console.log(`[Background] Starting file synthesis for project ${project.id}`);
                try {
                    const updateProgress = async (progress: number, description: string) => {
                        console.log(`[Background] Transcript project ${project.id} progress: ${progress}% - ${description}`);
                        try {
                            await db.update(projects)
                                .set({ progress, statusDescription: description, updatedAt: new Date() })
                                .where(eq(projects.id, project.id));
                        } catch (e) {
                            console.error(`[Background] File progress update error for ${project.id}:`, e);
                        }
                    };

                    await updateProgress(20, 'Analyzing structure...');
                    const segments = parseTranscriptFile(content, filename);
                    const fullTranscript = segmentsToText(segments);

                    await updateProgress(30, 'Detecting intelligence...');
                    const languageInfo = await detectLanguage(fullTranscript);

                    await updateProgress(50, 'AI Synthesis in progress...');
                    const generatedTimestamps = await generateTimestampsFromText(fullTranscript, languageInfo.language);

                    // Save timestamps
                    if (generatedTimestamps && generatedTimestamps.length > 0) {
                        const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: index,
                        }));
                        await db.insert(timestamps).values(timestampRecords);
                    }

                    // Final update
                    await db.update(projects)
                        .set({
                            status: 'completed',
                            progress: 100,
                            statusDescription: 'Completed',
                            language: languageInfo.language,
                            transcript: fullTranscript,
                            updatedAt: new Date()
                        })
                        .where(eq(projects.id, project.id));

                    // For manual transcript files, we treat it as 1 credit or minimum fee if needed.
                    // But usually these are small. Let's assume 1 minute if duration is unknown.
                    await deductMinutes(user.id, 60);
                    console.log(`[Background] File project ${project.id} completed`);

                } catch (error: any) {
                    console.error(`[Background] File synthesis failed for ${project.id}:`, error);
                    try {
                        await db.update(projects)
                            .set({
                                status: 'failed',
                                errorMessage: error.message || 'AI synthesis roadblock.',
                                statusDescription: 'Failed',
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Background] Error update failed for ${project.id}:`, e);
                    }
                }
            }, 0);

            return NextResponse.json({
                success: true,
                projectId: project.id,
                status: 'processing'
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
