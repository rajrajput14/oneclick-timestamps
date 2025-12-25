import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get project by ID
 * GET /api/projects/[id]
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    console.log(`[API/Project] GET Request for ID`);
    try {
        const { id } = await context.params;
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user && 'error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Fetch project with timestamps
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, id),
                eq(projects.userId, user.id)
            ),
            with: {
                timestamps: {
                    orderBy: [timestamps.position],
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Explicitly map as some environments/configs might return the object differently
        return NextResponse.json({
            ...project,
            progress: project.progress,
            statusDescription: project.statusDescription,
            status: project.status,
            id: project.id
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        );
    }
}

/**
 * Update project timestamps
 * PATCH /api/projects/[id]
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user && 'error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Verify project ownership
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, id),
                eq(projects.userId, user.id)
            ),
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await req.json();
        const { timestamps: updatedTimestamps } = body;

        // Update timestamps
        if (updatedTimestamps && Array.isArray(updatedTimestamps)) {
            // Delete existing timestamps
            await db.delete(timestamps).where(eq(timestamps.projectId, id));

            // Insert updated timestamps
            const timestampRecords = updatedTimestamps.map((ts: any, index: number) => ({
                projectId: id,
                timeSeconds: ts.timeSeconds,
                timeFormatted: ts.timeFormatted,
                title: ts.title,
                position: index,
            }));

            await db.insert(timestamps).values(timestampRecords);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
        );
    }
}

/**
 * Delete project
 * DELETE /api/projects/[id]
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user && 'error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Verify project ownership and delete
        const result = await db
            .delete(projects)
            .where(and(
                eq(projects.id, id),
                eq(projects.userId, user.id)
            ))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json(
            { error: 'Failed to delete project' },
            { status: 500 }
        );
    }
}
