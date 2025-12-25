import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { activateSubscription, deactivateSubscription } from '@/lib/payments/subscription';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Verify LemonSqueezy webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(payload).digest('hex');

        const signatureBuffer = Buffer.from(signature, 'utf8');
        const digestBuffer = Buffer.from(digest, 'utf8');

        if (signatureBuffer.length !== digestBuffer.length) {
            console.error('❌ Signature length mismatch:', {
                received: signatureBuffer.length,
                expected: digestBuffer.length
            });
            return false;
        }

        return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    } catch (error) {
        console.error('❌ Signature verification error:', error);
        return false;
    }
}

/**
 * Find user by ID or email
 */
async function findUser(userId?: string, email?: string) {
    if (userId) {
        // Try database ID first (passed from pricing page)
        const userById = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });
        if (userById) return userById;

        // Fallback to Clerk ID
        const userByClerkId = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (userByClerkId) return userByClerkId;
    }

    if (email) {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });
        if (user) return user;
    }

    return null;
}

/**
 * LemonSqueezy webhook handler
 * Handles subscription events: created, updated, cancelled, expired
 */
export async function POST(req: NextRequest) {
    console.log('🚀 WEBHOOK ENDPOINT TRIGGERED');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    try {
        const payload = await req.text();
        const signature = req.headers.get('x-signature');

        console.log('📥 LemonSqueezy webhook received');
        console.log('Signature:', signature);

        if (!signature) {
            console.error('❌ No signature provided');
            return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
        }

        // Verify webhook signature
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
        if (!secret) {
            console.error('❌ LEMONSQUEEZY_WEBHOOK_SECRET not configured');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        if (!verifySignature(payload, signature, secret)) {
            console.error('❌ Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event = JSON.parse(payload);
        const eventName = event.meta?.event_name;

        console.log('✅ Webhook verified:', eventName);
        console.log('📦 Event data:', JSON.stringify(event, null, 2));

        // Extract user identification
        const customUserId = event.meta?.custom_data?.user_id;
        const customerEmail = event.data?.attributes?.user_email;

        console.log('🔍 Looking for user:', { customUserId, customerEmail });

        // Find user by ID or email
        const user = await findUser(customUserId, customerEmail);

        if (!user) {
            console.error('❌ User not found:', { customUserId, customerEmail });
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('✅ User found:', user.id, user.email);

        const subscriptionId = event.data?.id;
        const attributes = event.data?.attributes;

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated':
                console.log('📝 Processing subscription:', attributes?.status);

                // Activate subscription if status is active or on_trial
                if (attributes?.status === 'active' || attributes?.status === 'on_trial') {
                    await activateSubscription(
                        user.id,
                        subscriptionId,
                        String(attributes.product_id),
                        String(attributes.variant_id),
                        new Date(attributes.renews_at || attributes.ends_at)
                    );
                    console.log('✅ Subscription activated for user:', user.email);
                }
                break;

            case 'subscription_cancelled':
            case 'subscription_expired':
            case 'subscription_paused':
                console.log('📝 Deactivating subscription');
                await deactivateSubscription(subscriptionId);
                console.log('✅ Subscription deactivated:', subscriptionId);
                break;

            default:
                console.log('ℹ️ Unhandled event:', eventName);
        }

        return NextResponse.json({ received: true, user: user.email });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
