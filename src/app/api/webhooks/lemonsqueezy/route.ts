import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users, subscriptions, webhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { activateSubscription, deactivateSubscription, purchaseAddon } from '@/lib/payments/subscription';

export const dynamic = 'force-dynamic';

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
        const eventId = String(data.meta?.event_id || req.headers.get('x-event-id'));
        const eventName = data.meta.event_name;
        const body = data.data;
        const customData = data.meta.custom_data || {};
        const metadata = data.meta.metadata || {};

        // 1️⃣ IDEMPOTENCY CHECK (CRITICAL)
        const existingEvent = await db.query.webhookEvents.findFirst({
            where: eq(webhookEvents.eventId, eventId),
        });

        if (existingEvent) {
            console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
            return NextResponse.json({ success: true, message: 'Duplicate event' });
        }

        // 2️⃣ STRICT USER MAPPING (BULLETPROOF)
        const providedUserId = customData.user_id || customData.userId;

        if (!providedUserId) {
            console.error('[Webhook] REJECTED: No user_id in custom_data. Metadata:', JSON.stringify(data.meta));
            return NextResponse.json({ error: 'Missing user_id mapping' }, { status: 400 });
        }

        console.log(`[Webhook] Processing ${eventName} for user ${providedUserId} (Event ID: ${eventId})`);

        // 3️⃣ DATABASE TRANSACTIONS (MULTI-USER SAFE)
        return await db.transaction(async (tx) => {
            // Find internal user (strict mapping)
            const user = await tx.query.users.findFirst({
                where: (u, { or, eq }) => or(eq(u.id, providedUserId), eq(u.clerkId, providedUserId))
            });

            if (!user) {
                console.error(`[Webhook] User ${providedUserId} not found in DB.`);
                throw new Error('User not found'); // Rollback
            }

            const userId = user.id;

            // PRE-EMPTIVELY STORE EVENT ID (Idempotency)
            await tx.insert(webhookEvents).values({
                eventId,
                eventName,
                processedAt: new Date(),
            });

            // Handle Plan Updates (Subscription Created/Updated)
            if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
                const attrs = body.attributes;
                const status = attrs.status;

                let minutesLimit = metadata.minutes_limit ? parseInt(metadata.minutes_limit) : 500;
                let planName = metadata.plan_name || (minutesLimit > 500 ? 'Pro Creator' : 'Creator');

                await activateSubscription(
                    userId,
                    String(body.id),
                    String(attrs.product_id),
                    String(attrs.variant_id),
                    new Date(attrs.renews_at || attrs.ends_at || attrs.trial_ends_at || Date.now() + 30 * 24 * 60 * 60 * 1000),
                    planName,
                    minutesLimit,
                    String(status).toLowerCase(),
                    tx
                );
            }

            // Handle Cancellation
            if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
                // Handler deactivation within transaction
                await deactivateSubscription(String(body.id), tx);
            }

            // 5️⃣ ADD-ON PURCHASE LOGIC (CONCURRENT SAFE ATOMIC INCREMENT)
            if (eventName === 'order_created') {
                const isAddon = customData.type === 'addon' || metadata.type === 'addon';
                const minutesValue = customData.minutes || metadata.minutes;

                if (isAddon && minutesValue) {
                    const minutesToAdd = parseInt(String(minutesValue));
                    await purchaseAddon(userId, minutesToAdd, tx);
                }
            }

            console.log(`[Webhook] Successfully processed ${eventName} for user ${userId}`);
            return NextResponse.json({ success: true });
        });

    } catch (error) {
        console.error('[Webhook] Transaction Failed:', error);
        // Transaction automatically rolls back on throw
        return NextResponse.json({
            error: 'Webhook processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
