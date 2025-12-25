import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    try {
        const payload = await req.text();
        const signature = req.headers.get('x-signature') || '';
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

        // Verify signature
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(payload).digest('hex');

        if (signature !== digest) {
            return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const eventName = data.meta.event_name;
        const body = data.data;

        // Robust userId detection across custom_data and metadata
        const customData = data.meta.custom_data;
        const metadata = data.meta.metadata;
        const providedUserId = customData?.user_id || customData?.userId || metadata?.user_id || metadata?.userId || body.attributes?.custom_data?.user_id;
        const customerEmail = body.attributes?.user_email || body.attributes?.customer_email || body.attributes?.email;

        console.log(`[Webhook] Event: ${eventName}, Provided ID: ${providedUserId}, Email: ${customerEmail}`);

        // Resolve internal user from any available ID or email
        let internalUser = null;
        if (providedUserId) {
            internalUser = await db.query.users.findFirst({
                where: (u, { or, eq }) => or(eq(u.id, providedUserId), eq(u.clerkId, providedUserId))
            });
        }

        if (!internalUser && customerEmail) {
            internalUser = await db.query.users.findFirst({
                where: eq(users.email, customerEmail)
            });
        }

        if (!internalUser) {
            console.error('[Webhook] Failed to identify user in database.');
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const userId = internalUser.id;
        console.log(`[Webhook] Successfully resolved to internal user: ${userId}`);

        if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            const attributes = body.attributes;
            const status = attributes.status;

            // Read minutes_limit from product metadata as requested
            const minutesLimit = metadata?.minutes_limit ? parseInt(metadata.minutes_limit) : 60;
            const planName = metadata?.plan_name || (minutesLimit > 500 ? 'Pro Creator' : 'Creator');
            const billingCycleEnd = attributes.renews_at ? new Date(attributes.renews_at) : null;

            await db.update(users)
                .set({
                    subscriptionPlan: planName,
                    subscriptionStatus: (status === 'active' || status === 'on_trial' || status === 'trialing') ? 'active' : 'inactive',
                    subscriptionId: String(body.id),
                    minutesLimit: minutesLimit,
                    minutesUsed: 0,
                    billingCycleEnd: billingCycleEnd,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));

            console.log(`[Webhook] Success: User ${userId} updated to plan ${planName}`);
        }

        if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
            await db.update(users)
                .set({
                    subscriptionStatus: 'inactive',
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));
        }

        if (eventName === 'order_created') {
            // Robust metadata detection for add-ons
            const typeValue = customData?.type || metadata?.type;
            const minutesValue = customData?.minutes || metadata?.minutes;

            if (typeValue === 'addon' && minutesValue) {
                const addMinutes = parseInt(String(minutesValue));
                await db.update(users)
                    .set({
                        addonMinutes: sql`${users.addonMinutes} + ${addMinutes}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, userId));
                console.log(`[Webhook] Added ${addMinutes} add-on minutes to user ${userId}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
