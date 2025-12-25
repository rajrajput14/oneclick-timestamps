import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Check if user has reached usage limit
 */
export async function checkUsageLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    resetDate: Date | null;
}> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Default values if null
    const usageLimit = user.usageLimit ?? 3;
    const usageCount = user.usageCount ?? 0;
    const usageResetDate = user.usageResetDate;

    // Check if usage should be reset (monthly)
    const now = new Date();
    if (usageResetDate && now >= usageResetDate) {
        // Calculate new reset date (1 month from today)
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);

        // Reset usage count
        await db
            .update(users)
            .set({
                usageCount: 0,
                usageResetDate: nextResetDate,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return {
            allowed: true,
            remaining: usageLimit === -1 ? -1 : usageLimit,
            limit: usageLimit,
            resetDate: nextResetDate,
        };
    }

    // Unlimited for paid users
    if (usageLimit === -1) {
        return {
            allowed: true,
            remaining: -1,
            limit: -1,
            resetDate: usageResetDate,
        };
    }

    // Check if under limit
    const allowed = usageCount < usageLimit;
    const remaining = Math.max(0, usageLimit - usageCount);

    return {
        allowed,
        remaining,
        limit: usageLimit,
        resetDate: usageResetDate,
    };
}

/**
 * Increment usage count
 */
export async function incrementUsage(userId: string): Promise<void> {
    await db
        .update(users)
        .set({
            usageCount: sql`${users.usageCount} + 1`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Reset usage count (called monthly or on subscription change)
 */
export async function resetUsageCount(userId: string): Promise<void> {
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    await db
        .update(users)
        .set({
            usageCount: 0,
            usageResetDate: nextResetDate,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}
