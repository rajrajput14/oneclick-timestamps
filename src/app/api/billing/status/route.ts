import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth/user';
import { getUserUsage } from '@/lib/payments/usage';

/**
 * Get current user's billing and usage status
 * Single source of truth for dashboard and billing UI
 * GET /api/billing/status
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        // Get fresh usage data from database
        const usage = await getUserUsage(user.id);

        return NextResponse.json({
            plan: usage.plan,
            status: usage.status,
            minutesLimit: usage.minutesLimit,
            minutesUsed: usage.minutesUsed,
            addonMinutes: usage.addonMinutes,
            totalAvailable: usage.totalAvailable,
            billingCycleEnd: usage.billingCycleEnd
        });
    } catch (error) {
        console.error('Billing Status API error:', error);
        return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 });
    }
}
