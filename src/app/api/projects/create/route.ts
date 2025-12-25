import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { checkUsageLimit, incrementUsage } from '@/lib/payments/usage';
import { extractVideoId } from '@/lib/youtube/utils';
import { fetchYouTubeTranscript } from '@/lib/youtube/transcript';
import { parseTranscriptFile, segmentsToText } from '@/lib/transcript/parser';
import { detectLanguage } from '@/lib/transcript/language';
import { generateTimestamps, timestampToSeconds } from '@/lib/ai/timestamp';
import { eq } from 'drizzle-orm';

/**
 * Create new project and process timestamp generation
 * POST /api/projects/create
 */
export async function POST(req: NextRequest) {
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

        // Check usage limit
        const usageCheck = await checkUsageLimit(user.id);
        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Usage limit reached',
                    message: `You've reached your monthly limit of ${usageCheck.limit} generations. Upgrade to Pro for unlimited access.`,
                    limit: usageCheck.limit,
                    remaining: usageCheck.remaining,
                },
                { status: 429 }
            );
        }

        const formData = await req.formData();
        const youtubeUrl = formData.get('youtubeUrl') as string | null;
        const transcriptFile = formData.get('transcriptFile') as File | null;

        let transcript = '';
        let videoId: string | null = null;
        let title = 'Untitled Project';

        // Process YouTube URL
        if (youtubeUrl) {
            videoId = extractVideoId(youtubeUrl);
            if (!videoId) {
                return NextResponse.json(
                    { error: 'Invalid YouTube URL' },
                    { status: 400 }
                );
            }

            // Fetch transcript
            const result = await fetchYouTubeTranscript(videoId);
            if (!result) {
                return NextResponse.json(
                    {
                        error: 'No captions available',
                        message: 'This video does not have captions. Please upload a transcript manually.',
                    },
                    { status: 400 }
                );
            }

            transcript = result.transcript;
            title = `YouTube Video ${videoId}`;
        }
        // Process uploaded transcript
        else if (transcriptFile) {
            const content = await transcriptFile.text();
            const segments = parseTranscriptFile(content, transcriptFile.name);
            transcript = segmentsToText(segments);
            title = transcriptFile.name.replace(/\.(txt|srt|vtt)$/i, '');
        } else {
            return NextResponse.json(
                { error: 'Please provide a YouTube URL or upload a transcript' },
                { status: 400 }
            );
        }

        // Validate transcript
        if (!transcript || transcript.length < 100) {
            return NextResponse.json(
                { error: 'Transcript is too short. Minimum 100 characters required.' },
                { status: 400 }
            );
        }

        // Detect language
        const languageInfo = await detectLanguage(transcript);

        // Create project record
        const [project] = await db
            .insert(projects)
            .values({
                userId: user.id,
                title,
                youtubeUrl: youtubeUrl || null,
                youtubeVideoId: videoId,
                transcript,
                language: languageInfo.language,
                status: 'processing',
            })
            .returning();

        // Generate timestamps using AI
        try {
            const generatedTimestamps = await generateTimestamps(
                transcript,
                languageInfo.language
            );

            // Save timestamps to database
            const timestampRecords = generatedTimestamps.map((ts, index) => ({
                projectId: project.id,
                timeSeconds: timestampToSeconds(ts.time),
                timeFormatted: ts.time,
                title: ts.title,
                position: index,
            }));

            await db.insert(timestamps).values(timestampRecords);

            // Update project status
            await db
                .update(projects)
                .set({ status: 'completed' })
                .where(eq(projects.id, project.id));

            // Increment usage count
            await incrementUsage(user.id);

            return NextResponse.json({
                success: true,
                projectId: project.id,
                timestamps: generatedTimestamps,
                language: languageInfo.language,
            });
        } catch (error) {
            // Update project with error
            await db
                .update(projects)
                .set({
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                })
                .where(eq(projects.id, project.id));

            throw error;
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
