import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Get user usage data
 */
export async function getUserUsage(userId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    return {
        plan: user.subscriptionPlan || 'Free',
        status: user.subscriptionStatus || 'active',
        minutesUsed: user.minutesUsed || 0,
        minutesLimit: user.minutesLimit || 60,
        addonMinutes: user.addonMinutes || 0,
        billingCycleEnd: user.billingCycleEnd,
        totalAvailable: (user.minutesLimit || 0) + (user.addonMinutes || 0) - (user.minutesUsed || 0)
    };
}

/**
 * Check if user has enough minutes for a video duration (in seconds)
 */
export async function canProcessVideo(userId: string, durationInSeconds: number): Promise<{
    allowed: boolean;
    requiredMinutes: number;
    remainingMinutes: number;
}> {
    const usage = await getUserUsage(userId);
    const requiredMinutes = Math.ceil(durationInSeconds / 60);
    const remainingMinutes = usage.totalAvailable;

    return {
        allowed: remainingMinutes >= requiredMinutes,
        requiredMinutes,
        remainingMinutes
    };
}

/**
 * Deduct minutes from user balance
 * Logic: Use subscription minutes (minutesUsed) first, then addonMinutes.
 */
export async function deductMinutes(userId: string, durationInSeconds: number): Promise<void> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) throw new Error('User not found');

    const minutesToDeduct = Math.ceil(durationInSeconds / 60);
    const subLimit = user.minutesLimit || 0;
    const subUsed = user.minutesUsed || 0;
    const subRemaining = Math.max(0, subLimit - subUsed);

    let fromSub = Math.min(minutesToDeduct, subRemaining);
    let fromAddon = minutesToDeduct - fromSub;

    await db
        .update(users)
        .set({
            minutesUsed: sql`${users.minutesUsed} + ${fromSub}`,
            addonMinutes: sql`${users.addonMinutes} - ${fromAddon}`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Reset minutes_used on billing cycle renewal
 */
export async function resetUsageOnRenewal(userId: string): Promise<void> {
    await db
        .update(users)
        .set({
            minutesUsed: 0,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}
