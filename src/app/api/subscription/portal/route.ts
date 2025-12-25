import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { getCustomerPortalUrl } from '@/lib/payments/subscription';

export const dynamic = 'force-dynamic';

/**
 * API route to fetch the LemonSqueezy customer portal URL for the current user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.subscriptionId) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
        }

        const portalUrl = await getCustomerPortalUrl(user.subscriptionId);

        if (!portalUrl) {
            return NextResponse.json({ error: 'Could not fetch portal URL' }, { status: 500 });
        }

        return NextResponse.json({ url: portalUrl });
    } catch (error) {
        console.error('Portal API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
