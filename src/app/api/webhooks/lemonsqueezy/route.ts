import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users, subscriptions, webhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { activateSubscription, deactivateSubscription, purchaseAddon } from '@/lib/payments/subscription';

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const payload = await req.text();
        const signature = req.headers.get('x-signature') || '';
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

        if (!secret) {
            console.error('❌ WEBHOOK_ERROR: LEMONSQUEEZY_WEBHOOK_SECRET is not set in environment variables.');
            return new Response('Webhook secret not configured', { status: 500 });
        }

        // Verify signature
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(payload).digest('hex');

        if (signature !== digest) {
            console.error('❌ WEBHOOK_ERROR: Invalid signature. Verify your secret matches in LemonSqueezy settings.');
            return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const eventId = String(data.meta?.event_id || req.headers.get('x-event-id'));
        const eventName = data.meta.event_name;
        const body = data.data;
        const customData = data.meta.custom_data || {};
        const metadata = data.meta.metadata || {};

        // 2️⃣ STRICT USER MAPPING (BULLETPROOF)
        const providedUserId = customData.user_id || customData.userId;

        if (!providedUserId) {
            console.error('[Webhook] REJECTED: No user_id in custom_data. Metadata:', JSON.stringify(data.meta));
            return NextResponse.json({ error: 'Missing user_id mapping' }, { status: 400 });
        }

        // 1️⃣ IDEMPOTENCY CHECK (CRITICAL) - Outside to prevent transaction poisoning
        let isDuplicate = false;
        let tableExists = true;
        try {
            const existingEvent = await db.query.webhookEvents.findFirst({
                where: eq(webhookEvents.eventId, eventId),
            });
            if (existingEvent) isDuplicate = true;
        } catch (e) {
            tableExists = false;
            console.warn('[Webhook] WARNING: Idempotency table "webhook_events" not found. Proceeding without deduplication.');
        }

        if (isDuplicate) {
            console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
            return NextResponse.json({ success: true, message: 'Duplicate event' });
        }

        console.log(`[Webhook] Starting transaction for user ${providedUserId} (Event ID: ${eventId})`);

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

            // PRE-EMPTIVELY STORE EVENT ID (Idempotency) - Only if table exists
            if (tableExists) {
                try {
                    await tx.insert(webhookEvents).values({
                        eventId,
                        eventName,
                        processedAt: new Date(),
                    });
                } catch (e) {
                    // Unique constraint violation or table issue
                    console.error('[Webhook] Failed to store event ID in transaction:', e);
                    throw e; // Rollback to be safe
                }
            }

            // Store LemonSqueezy Customer ID (Sync Point)
            if (body.attributes?.customer_id) {
                console.log(`[Webhook] UPDATING Customer ID for User: ${userId} (${body.attributes.customer_id})`);
                await tx.update(users)
                    .set({ lemonsqueezyCustomerId: String(body.attributes.customer_id) })
                    .where(eq(users.id, userId));
            }

            // Handle Plan Updates (Subscription Created/Updated)
            if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
                const attrs = body.attributes;
                const status = attrs.status;

                let minutesLimit = metadata.minutes_limit ? parseInt(metadata.minutes_limit) : 500;
                let planName = metadata.plan_name || (minutesLimit > 500 ? 'Pro Creator' : 'Creator');

                console.log(`[Webhook] CALLING activateSubscription (User: ${userId}, Plan: ${planName})`);
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
                console.log(`[Webhook] CALLING deactivateSubscription (User: ${userId})`);
                await deactivateSubscription(String(body.id), tx);
            }

            // 5️⃣ ADD-ON PURCHASE LOGIC (CONCURRENT SAFE ATOMIC INCREMENT)
            if (eventName === 'order_created') {
                const isAddon = customData.type === 'addon' || metadata.type === 'addon';
                const minutesValue = customData.minutes || metadata.minutes;

                if (isAddon && minutesValue) {
                    const minutesToAdd = parseInt(String(minutesValue));
                    console.log(`[Webhook] CALLING purchaseAddon (User: ${userId}, Minutes: ${minutesToAdd})`);
                    await purchaseAddon(userId, minutesToAdd, String(body.id), tx);
                }
            }

            console.log(`✅ [Webhook] TRANSACTION_COMMITTED for User: ${userId} (Event: ${eventId})`);
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
