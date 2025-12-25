import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth/user';
import { syncSubscriptionWithLemonSqueezy } from '@/lib/payments/subscription';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if ('error' in user) {
            return NextResponse.json({ error: 'Database error', details: user.details }, { status: 500 });
        }

        console.log('🚀 Manual sync requested for user:', user.email);

        const success = await syncSubscriptionWithLemonSqueezy(user.id, user.email);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Subscription synced successfully! Your Pro features are now active.'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'No active subscription found. If you just paid, please wait a minute and try again.'
            });
        }
    } catch (error) {
        console.error('Sync API error:', error);
        return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 });
    }
}
