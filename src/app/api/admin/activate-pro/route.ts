import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Manual subscription activation endpoint for testing
 * POST /api/admin/activate-pro
 */
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find user in database
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkUserId),
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Activate Pro subscription
        await db
            .update(users)
            .set({
                subscriptionStatus: 'active',
                usageLimit: -1,
                usageCount: 0,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        console.log('✅ Manually activated Pro for user:', user.email);

        return NextResponse.json({
            success: true,
            message: 'Pro subscription activated!',
            user: {
                email: user.email,
                subscriptionStatus: 'active',
                usageLimit: -1,
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
