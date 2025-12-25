import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { generateTimestampsFromText } from '@/lib/ai/gemini-ai';
import { timestampToSeconds } from '@/lib/utils/timestamps';
import { eq, and } from 'drizzle-orm';

/**
 * Trigger timestamp generation for an existing project's transcript
 * POST /api/projects/[id]/generate-timestamps
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        // Check authentication
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Fetch project
        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.userId, user.id)),
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.transcript) {
            return NextResponse.json({ error: 'No transcript available for this project' }, { status: 400 });
        }

        // Update status to processing
        await db.update(projects)
            .set({ status: 'processing', errorMessage: null })
            .where(eq(projects.id, id));

        try {
            // Generate timestamps using Gemini
            const generatedTimestamps = await generateTimestampsFromText(
                project.transcript,
                project.language || 'english'
            );

            // Delete old timestamps if any
            await db.delete(timestamps).where(eq(timestamps.projectId, id));

            // Save new timestamps
            const timestampRecords = generatedTimestamps.map((ts: { time: string; title: string }, index: number) => ({
                projectId: id,
                timeSeconds: timestampToSeconds(ts.time),
                timeFormatted: ts.time,
                title: ts.title,
                position: index,
            }));

            if (timestampRecords.length > 0) {
                await db.insert(timestamps).values(timestampRecords);
            }

            // Mark as completed
            await db.update(projects)
                .set({ status: 'completed' })
                .where(eq(projects.id, id));

            return NextResponse.json({
                success: true,
                timestamps: generatedTimestamps
            });

        } catch (error: any) {
            console.error('Generation execution error:', error);
            await db.update(projects)
                .set({
                    status: 'failed',
                    errorMessage: error.message || 'AI generation failed'
                })
                .where(eq(projects.id, id));

            return NextResponse.json({
                error: 'Generation failed',
                message: error.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Timestamp generation route error:', error);
        return NextResponse.json({
            error: 'Failed to process request',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
