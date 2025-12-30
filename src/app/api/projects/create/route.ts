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
                    progress: 0,
                    statusDescription: 'Request Pending'
                })
                .returning();

            // [BACKGROUND PROCESS] Defer heavy lifting to avoid Vercel timeouts
            setTimeout(async () => {
                console.log(`[Background] STARTING sequence for project ${project.id} (Video: ${videoId})`);
                const updateProgress = async (step: number, percent: number, message: string, status: string = 'processing') => {
                    console.log(`[Background] [Project ${project.id}] Step ${step} (${percent}%): ${message} (Status: ${status})`);
                    try {
                        await db.update(projects)
                            .set({
                                progressStep: step,
                                progress: percent,
                                statusDescription: message,
                                status,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Background] [Project ${project.id}] Progress update error:`, e);
                    }
                };

                try {
                    await updateProgress(1, 5, 'Job Accepted', 'processing');
                    // 1. Fetch Metadata (Slow)
                    let durationSeconds = 0;
                    try {
                        console.log("🟢 STEP 2.1: Video metadata fetch starting");
                        console.log(`[Background] [Project ${project.id}] Fetching video duration...`);
                        const { getVideoDuration } = await import('@/lib/youtube/audio-extractor');
                        console.log("🟢 STEP 2.2: getVideoDuration function imported");
                        durationSeconds = await getVideoDuration(videoId!);
                        console.log("🟢 STEP 2.3: Video duration retrieved:", durationSeconds);
                        console.log(`[Background] [Project ${project.id}] Video duration: ${durationSeconds}s`);
                    } catch (err) {
                        console.error(`[Background] [Project ${project.id}] Duration fetch failed:`, err);
                        console.log("🟢 FAILURE BUCKET 1.1: Metadata fetch error");
                        await updateProgress(1, 0, 'Failed to retrieve video metadata. Double check the URL.', 'failed');
                        return;
                    }

                    // 2. Validate Usage (Slow)
                    console.log("🟢 STEP 2.4: Usage check starting");
                    const usageCheck = await canProcessVideo(user.id, durationSeconds);
                    console.log("🟢 STEP 2.5: Usage check completed. Allowed:", usageCheck.allowed);
                    if (!usageCheck.allowed) {
                        console.warn(`[Background] Insufficient minutes for user ${user.id} (Project: ${project.id})`);
                        await db.update(projects)
                            .set({
                                status: 'failed',
                                statusDescription: 'Insufficient credits.',
                                progressStep: 1,
                                progress: 0,
                                errorMessage: `This video requires ${Math.round(durationSeconds / 60)} minutes. You have ${usageCheck.remainingMinutes} minutes left.`,
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                        return;
                    }

                    const PHASE1_DURATION = 1200; // 20 minutes
                    const isLongVideo = durationSeconds > PHASE1_DURATION;

                    // --- TRY YOUTUBE TRANSCRIPT FIRST (FAST FALLBACK) ---
                    await updateProgress(1, 15, 'Checking for available captions...');
                    const ytTranscriptData = await fetchYouTubeTranscript(videoId!);

                    if (ytTranscriptData) {
                        console.log(`[Background] [Project ${project.id}] Found YouTube captions. Using fast path.`);
                        await updateProgress(2, 50, 'Captions found. Analyzing content...');

                        const generatedTimestamps = await generateTimestampsFromText(
                            ytTranscriptData.transcript,
                            'english'
                        );

                        if (generatedTimestamps && generatedTimestamps.length > 0) {
                            await updateProgress(3, 90, 'Finalizing chapters...');

                            const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                                projectId: project.id,
                                timeSeconds: timestampToSeconds(ts.time),
                                timeFormatted: ts.time,
                                title: ts.title,
                                position: index,
                            }));

                            // Final Atomic Transaction
                            const processedMinutes = Math.ceil(durationSeconds / 60);
                            console.log("DB write starting");
                            await db.transaction(async (tx) => {
                                await tx.insert(timestamps).values(timestampRecords);

                                await tx.update(projects)
                                    .set({
                                        status: 'completed',
                                        progress: 100,
                                        progressStep: 3,
                                        statusDescription: 'Completed',
                                        language: 'English',
                                        transcript: ytTranscriptData.transcript,
                                        processedMinutes,
                                        updatedAt: new Date()
                                    })
                                    .where(eq(projects.id, project.id));

                                await deductMinutes(user.id, durationSeconds || 60, tx);
                            });
                            console.log("DB write successful");
                            console.log("🟢 STEP 10: Project marked completed");

                            console.log(`[Background] [Project ${project.id}] Fast path successful`);
                            return;
                        }
                    }

                    // --- FALLBACK TO STT PIPELINE (SLOW PATH) ---
                    console.log(`[Background] [Project ${project.id}] No YouTube captions found or AI failed. Rolling out STT Pipeline...`);
                    await updateProgress(1, 20, 'Starting deep audio analysis...');
                    await updateProgress(1, 33, 'Extracting audio layers...');

                    console.log(`[Background] [Project ${project.id}] Running STT Pipeline (Phase 1)...`);
                    const phase1Result = await runSTTPipeline(videoId!, async (p, d) => {
                        // Map internal STT progress to Step 2 (34-66%)
                        const mappedPercent = Math.floor(34 + (p * 0.32));
                        await updateProgress(2, mappedPercent, d, 'processing');
                    }, {
                        durationSeconds: isLongVideo ? PHASE1_DURATION : undefined,
                        descriptionPrefix: isLongVideo ? '[Phase 1] ' : ''
                    });
                    console.log(`[Background] [Project ${project.id}] Phase 1 complete. Found ${phase1Result.timestamps.length} timestamps.`);

                    await updateProgress(2, 66, 'Speech processing segment 1 complete...');
                    await updateProgress(3, 85, 'Structuring topics with AI...');

                    let timestampRecords: any[] = [];
                    if (phase1Result.timestamps && phase1Result.timestamps.length > 0) {
                        timestampRecords = phase1Result.timestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: index,
                        }));
                        await db.insert(timestamps).values(timestampRecords);
                    }

                    if (!isLongVideo) {
                        await updateProgress(3, 95, 'Finalizing project...');

                        const processedMinutes = Math.ceil(phase1Result.processedSeconds / 60);

                        console.log("DB write starting");
                        await db.transaction(async (tx) => {
                            if (timestampRecords.length > 0) {
                                await tx.insert(timestamps).values(timestampRecords);
                            }

                            await tx.update(projects)
                                .set({
                                    status: 'completed',
                                    progress: 100,
                                    progressStep: 3,
                                    statusDescription: 'Completed',
                                    language: phase1Result.language,
                                    transcript: 'Transcript generated via STT.',
                                    processedMinutes,
                                    updatedAt: new Date()
                                })
                                .where(eq(projects.id, project.id));

                            await deductMinutes(user.id, phase1Result.processedSeconds, tx);
                        });
                        console.log("DB write successful");
                        console.log("🟢 STEP 10: Project marked completed");

                        console.log(`[Background] Project ${project.id} successful`);
                        return;
                    }

                    // Phase 2 logic (Long Videos)
                    await updateProgress(3, 85, 'Initial timestamps ready. Refining full video...');
                    const phase2Result = await runSTTPipeline(videoId!, async (p, d) => {
                        // For long videos, we stay in Step 3 for refinement
                        const mappedPercent = Math.floor(86 + (p * 0.13));
                        await updateProgress(3, mappedPercent, d, 'processing');
                    }, {
                        seekSeconds: PHASE1_DURATION,
                        descriptionPrefix: '[Phase 2] '
                    });

                    if (phase2Result.timestamps && phase2Result.timestamps.length > 0) {
                        const phase2Records = phase2Result.timestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: timestampRecords.length + index,
                        }));

                        const totalProcessedSeconds = phase1Result.processedSeconds + phase2Result.processedSeconds;
                        const processedMinutes = Math.ceil(totalProcessedSeconds / 60);

                        console.log("DB write starting");
                        await db.transaction(async (tx) => {
                            // Phase 1 timestamps already inserted? No, we didn't insert them yet in the slow path logic above.
                            // Wait, looking at the code above:
                            // if (phase1Result.timestamps && phase1Result.timestamps.length > 0) { ... timestampRecords = ... }
                            // If isLongVideo, we SKIP the "if (!isLongVideo)" block and come here.

                            if (timestampRecords.length > 0) {
                                await tx.insert(timestamps).values(timestampRecords);
                            }
                            if (phase2Records.length > 0) {
                                await tx.insert(timestamps).values(phase2Records);
                            }

                            await tx.update(projects)
                                .set({
                                    status: 'completed',
                                    progress: 100,
                                    progressStep: 3,
                                    statusDescription: 'Refinement complete.',
                                    processedMinutes,
                                    updatedAt: new Date()
                                })
                                .where(eq(projects.id, project.id));

                            await deductMinutes(user.id, totalProcessedSeconds, tx);
                        });
                        console.log("DB write successful");
                        console.log("🟢 STEP 10: Project marked completed");
                    }

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
                    progress: 0,
                    progressStep: 1,
                    statusDescription: 'Request Pending'
                })
                .returning();

            // 3. Launch processing in background
            setTimeout(async () => {
                console.log(`[Background] Starting file synthesis for project ${project.id}`);
                try {
                    const updateProgress = async (step: number, percent: number, message: string, status: string = 'processing') => {
                        console.log(`[Background] Transcript project ${project.id} Step ${step} (${percent}%): ${message}`);
                        try {
                            await db.update(projects)
                                .set({
                                    progressStep: step,
                                    progress: percent,
                                    statusDescription: message,
                                    status,
                                    updatedAt: new Date()
                                })
                                .where(eq(projects.id, project.id));
                        } catch (e) {
                            console.error(`[Background] File progress update error for ${project.id}:`, e);
                        }
                    };

                    await updateProgress(1, 5, 'Job Accepted', 'processing');

                    await updateProgress(1, 15, 'Analyzing structure...');
                    const segments = parseTranscriptFile(content, filename);
                    const fullTranscript = segmentsToText(segments);

                    await updateProgress(2, 40, 'Detecting intelligence...');
                    const languageInfo = await detectLanguage(fullTranscript);

                    await updateProgress(3, 70, 'AI Synthesis in progress...');
                    const generatedTimestamps = await generateTimestampsFromText(fullTranscript, languageInfo.language);

                    // Save timestamps
                    if (generatedTimestamps && generatedTimestamps.length > 0) {
                        await updateProgress(3, 90, 'Finalizing project...');

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
                                    progress: 100,
                                    progressStep: 3,
                                    statusDescription: 'Completed',
                                    language: languageInfo.language,
                                    transcript: fullTranscript,
                                    processedMinutes: 1, // Files are treated as 1 minute
                                    updatedAt: new Date()
                                })
                                .where(eq(projects.id, project.id));

                            await deductMinutes(user.id, 60, tx);
                        });
                    }

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
