import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth/user';

/**
 * Manual subscription activation endpoint for testing
 * POST /api/admin/activate-pro
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Find user in database using the authenticated user's ID
        const dbUser = await db.query.users.findFirst({
            where: eq(users.clerkId, user.clerkId),
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        // Activate Pro subscription
        await db
            .update(users)
            .set({
                subscriptionPlan: 'Pro Creator',
                subscriptionStatus: 'active',
                minutesLimit: 1500,
                minutesUsed: 0,
                updatedAt: new Date(),
            })
            .where(eq(users.id, dbUser.id));

        console.log('✅ Manually activated Pro for user:', dbUser.email);

        return NextResponse.json({
            success: true,
            message: 'Pro subscription activated!',
            user: {
                email: user.email,
                subscriptionStatus: 'active',
                minutesLimit: 1500,
            },
        });
    } catch (error) {
        console.error('Error activating Pro:', error);
        return NextResponse.json(
            { error: 'Failed to activate Pro subscription' },
            { status: 500 }
        );
    }
}
