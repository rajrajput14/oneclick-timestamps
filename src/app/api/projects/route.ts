import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/user';
import { eq, desc } from 'drizzle-orm';

/**
 * Get all projects for current user
 * GET /api/projects
 */
export async function GET(req: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Fetch all projects for user
        const userProjects = await db.query.projects.findMany({
            where: eq(projects.userId, user.id),
            orderBy: [desc(projects.createdAt)],
            limit: 50,
        });

        return NextResponse.json(userProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}
