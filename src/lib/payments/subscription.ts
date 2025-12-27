import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Activate subscription (called from webhook or manual sync)
 */
export async function activateSubscription(
    userId: string,
    lemonSqueezyId: string,
    productId: string,
    variantId: string,
    currentPeriodEnd: Date,
    planName?: string,
    minutesLimit?: number
): Promise<void> {
    console.log('🔄 Activating subscription for user:', userId, 'Plan:', planName);

    try {
        // Update user to active subscription
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        const updateData: any = {
            subscriptionStatus: 'active',
            subscriptionId: lemonSqueezyId,
            updatedAt: new Date(),
        };

        // If plan details provided, use them
        if (planName) updateData.subscriptionPlan = planName;
        if (minutesLimit !== undefined) updateData.minutesLimit = minutesLimit;

        // Reset minutes if they were previously inactive or on Free tier
        const isPreviouslyActive = user?.subscriptionStatus === 'active';
        if (!isPreviouslyActive) {
            updateData.minutesUsed = 0;
            // Default to 500 if NO limit provided and NO previous limit
            if (updateData.minutesLimit === undefined) {
                updateData.minutesLimit = 500;
            }
        }

        await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId));

        console.log(`✅ User ${userId} updated to active subscription ${lemonSqueezyId}`);

        // Create or update subscription record
        const existing = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.lemonSqueezyId, lemonSqueezyId),
        });

        if (existing) {
            await db
                .update(subscriptions)
                .set({
                    status: 'active',
                    currentPeriodEnd,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existing.id));
            console.log('✅ Subscription record updated');
        } else {
            await db.insert(subscriptions).values({
                userId,
                lemonSqueezyId,
                status: 'active',
                productId,
                variantId,
                currentPeriodEnd,
            });
            console.log('✅ Subscription record created');
        }
    } catch (error) {
        console.error('❌ Error activating subscription:', error);
        throw error;
    }
}

/**
 * Deactivate subscription (called from webhook on cancellation)
 */
export async function deactivateSubscription(lemonSqueezyId: string): Promise<void> {
    console.log('🔄 Deactivating subscription:', lemonSqueezyId);

    try {
        const subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.lemonSqueezyId, lemonSqueezyId),
        });

        if (!subscription) {
            console.log('⚠️ Subscription not found');
            return;
        }

        // Update subscription status in history
        await db
            .update(subscriptions)
            .set({
                status: 'cancelled',
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        // Downgrade user to free plan
        await db
            .update(users)
            .set({
                subscriptionPlan: 'Free',
                subscriptionStatus: 'inactive',
                subscriptionId: null,
                minutesLimit: 60,
                updatedAt: new Date(),
            })
            .where(eq(users.id, subscription.userId));

        console.log(`✅ User ${subscription.userId} downgraded to Free plan`);
    } catch (error) {
        console.error('❌ Error deactivating subscription:', error);
        throw error;
    }
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<{
    isActive: boolean;
    subscription: any | null;
}> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user || user.subscriptionStatus !== 'active') {
        return { isActive: false, subscription: null };
    }

    const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
    });

    return {
        isActive: true,
        subscription,
    };
}

/**
 * Sync user subscription status directly with LemonSqueezy API
 * Used as a fallback for when webhooks are unreliable
 */
export async function syncSubscriptionWithLemonSqueezy(userId: string, email: string): Promise<boolean> {
    console.log('🔄 Manual Sync Start for:', email);

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
        console.error('❌ SYNC_ERROR: LEMONSQUEEZY_API_KEY missing');
        return false;
    }

    try {
        // Fetch subscriptions for this email from LemonSqueezy
        const url = `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(email)}`;
        console.log(`[Sync] Calling LS API: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Sync] API Error response:', errorText);
            return false;
        }

        const data = await response.json();
        const subscriptionsList = data.data || [];
        console.log(`[Sync] Found ${subscriptionsList.length} total subscriptions for user.`);

        // Look for any active, trialing, on_trial, or even past_due (to be safe)
        const validStatuses = ['active', 'on_trial', 'trialing', 'past_due'];
        const activeSub = subscriptionsList.find((s: any) =>
            validStatuses.includes(String(s.attributes.status).toLowerCase())
        );

        if (activeSub) {
            console.log('✅ Found valid subscription:', activeSub.id, 'Status:', activeSub.attributes.status);
            const attrs = activeSub.attributes;

            // Extract plan details from metadata if available (LS returns this in meta)
            // or we can infer it from the variant_id
            const metadata = activeSub.meta?.custom_data || activeSub.meta?.metadata || attrs.metadata || {};

            let minutesLimit = metadata.minutes_limit ? parseInt(metadata.minutes_limit) : 500;
            let planName = metadata.plan_name || 'Creator';

            // Fallback: Infer from variant_id if we have known IDs or use price as proxy
            // In a real app, you'd map these to your specific variant IDs
            const variantId = String(attrs.variant_id);
            console.log(`[Sync] Variant ID: ${variantId}, Meta Plan: ${planName}, Meta Limit: ${minutesLimit}`);

            // Pro Creator usually has higher limits
            if (!metadata.plan_name && (variantId === '56789' || minutesLimit > 500)) {
                planName = 'Pro Creator';
                if (!metadata.minutes_limit) minutesLimit = 1000;
            }

            await activateSubscription(
                userId,
                activeSub.id,
                String(attrs.product_id),
                variantId,
                new Date(attrs.renews_at || attrs.ends_at || Date.now() + 30 * 24 * 60 * 60 * 1000),
                planName,
                minutesLimit
            );

            return true;
        }

        console.log('ℹ️ Sync completed: No active subscriptions found in LS API data.');
        return false;
    } catch (error) {
        console.error('❌ Sync Critical Error:', error);
        return false;
    }
}

/**
 * Get the LemonSqueezy Customer Portal URL for a subscription
 */
export async function getCustomerPortalUrl(lemonSqueezyId: string): Promise<string | null> {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions/${lemonSqueezyId}`,
            {
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.data.attributes.urls?.customer_portal || null;
    } catch (error) {
        console.error('❌ Error fetching portal URL:', error);
        return null;
    }
}
