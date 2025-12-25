import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { inArray, and, eq } from 'drizzle-orm';

/**
 * Bulk delete projects
 * POST /api/projects/bulk-delete
 * Body: { projectIds: string[] }
 */
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { projectIds } = await req.json();

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'No project IDs provided' }, { status: 400 });
        }

        console.log(`[BulkDelete] User ${user.id} requesting deletion of ${projectIds.length} projects`);

        // 1. Delete associated timestamps first (FK constraint)
        await db.delete(timestamps)
            .where(inArray(timestamps.projectId, projectIds));

        // 2. Delete the projects, ensuring they belong to the user
        const result = await db.delete(projects)
            .where(
                and(
                    eq(projects.userId, user.id),
                    inArray(projects.id, projectIds)
                )
            );

        return NextResponse.json({
            success: true,
            deletedCount: projectIds.length
        });

    } catch (error: any) {
        console.error('[BulkDelete] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete projects', message: error.message },
            { status: 500 }
        );
    }
}
