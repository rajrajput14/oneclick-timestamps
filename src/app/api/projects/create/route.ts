import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { getUserUsage, canProcessVideo, deductMinutes } from '@/lib/payments/usage';
import { getYouTubeVideoId } from '@/lib/youtube/utils';
import { runSTTPipeline } from '@/lib/youtube/stt-pipeline';
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

            // 1. Get Video Duration first for usage check
            try {
                const { getVideoDuration } = await import('@/lib/youtube/audio-extractor');
                durationSeconds = await getVideoDuration(videoId);
            } catch (err) {
                return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 400 });
            }

            // 2. Check usage limit based on minutes
            const usageCheck = await canProcessVideo(user.id, durationSeconds);
            if (!usageCheck.allowed) {
                return NextResponse.json(
                    {
                        error: 'INSUFFICIENT_MINUTES',
                        message: `You've used all your minutes. Buy more minutes to continue.`,
                        required: usageCheck.requiredMinutes,
                        remaining: usageCheck.remainingMinutes,
                    },
                    { status: 429 }
                );
            }

            // 3. Create project record immediately with 'processing' status
            const [project] = await db
                .insert(projects)
                .values({
                    userId: user.id,
                    title: `YouTube Video ${videoId}`,
                    youtubeUrl,
                    youtubeVideoId: videoId,
                    transcript: 'Processing...',
                    language: 'Detecting...',
                    status: 'processing',
                    progress: 0,
                    statusDescription: 'Queued'
                })
                .returning();

            // 3. Launch processing in background safely
            setTimeout(async () => {
                console.log(`[Background] Starting pipeline for project ${project.id}`);
                try {
                    const updateProgress = async (progress: number, description: string) => {
                        console.log(`[Background] Project ${project.id} progress: ${progress}% - ${description}`);
                        try {
                            await db.update(projects)
                                .set({ progress, statusDescription: description, updatedAt: new Date() })
                                .where(eq(projects.id, project.id));
                        } catch (e) {
                            console.error(`[Background] Progress update error for ${project.id}:`, e);
                        }
                    };

                    const PHASE1_DURATION = 1200; // 20 minutes
                    const isLongVideo = durationSeconds > PHASE1_DURATION;

                    // PHASE 1: Fast Results
                    const phase1Result = await runSTTPipeline(videoId!, updateProgress, {
                        durationSeconds: isLongVideo ? PHASE1_DURATION : undefined,
                        descriptionPrefix: isLongVideo ? '[Phase 1] ' : ''
                    });

                    // Save Phase 1 timestamps
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

                    // If short video, we are done
                    if (!isLongVideo) {
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
                        return;
                    }

                    // PHASE 2: Background Refinement
                    // Intermediate update to show Phase 1 is ready
                    await db.update(projects)
                        .set({
                            status: 'completed', // "Completed" so user can see and copy results
                            progress: 50,
                            statusDescription: 'Initial results ready. Refining in background...',
                            language: phase1Result.language,
                            transcript: 'Phase 1 transcript generated.',
                            updatedAt: new Date()
                        })
                        .where(eq(projects.id, project.id));

                    console.log(`[Background] Phase 1 for ${project.id} complete. Starting Phase 2.`);

                    const phase2Result = await runSTTPipeline(videoId!, updateProgress, {
                        seekSeconds: PHASE1_DURATION,
                        descriptionPrefix: '[Phase 2] '
                    });

                    // Save Phase 2 timestamps
                    if (phase2Result.timestamps && phase2Result.timestamps.length > 0) {
                        // Get current max position to append correctly
                        const timestampRecords = phase2Result.timestamps.map((ts: { time: string; title: string }, index: number) => ({
                            projectId: project.id,
                            timeSeconds: timestampToSeconds(ts.time),
                            timeFormatted: ts.time,
                            title: ts.title,
                            position: phase1Result.timestamps.length + index,
                        }));
                        await db.insert(timestamps).values(timestampRecords);
                    }

                    // Final completion update
                    await db.update(projects)
                        .set({
                            progress: 100,
                            statusDescription: 'Refinement complete.',
                            updatedAt: new Date()
                        })
                        .where(eq(projects.id, project.id));

                    await deductMinutes(user.id, phase2Result.processedSeconds);
                    console.log(`[Background] Project ${project.id} refinement completed successfully`);

                } catch (error: any) {
                    console.error(`[Background] Pipeline failed for ${project.id}:`, error);
                    try {
                        await db.update(projects)
                            .set({
                                status: 'failed',
                                errorMessage: error.message || 'The STT pipeline encountered an error.',
                                statusDescription: 'Failed',
                                updatedAt: new Date()
                            })
                            .where(eq(projects.id, project.id));
                    } catch (e) {
                        console.error(`[Background] Error-status update failed for ${project.id}:`, e);
                    }
                }
            }, 0);

            console.log(`[API/Create] Returning success: ${project.id}`);
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
