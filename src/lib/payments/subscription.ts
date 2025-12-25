import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Activate subscription (called from webhook)
 */
export async function activateSubscription(
    userId: string,
    lemonSqueezyId: string,
    productId: string,
    variantId: string,
    currentPeriodEnd: Date
): Promise<void> {
    console.log('🔄 Activating subscription for user:', userId);

    try {
        // Update user to active subscription
        await db
            .update(users)
            .set({
                subscriptionStatus: 'active',
                subscriptionId: lemonSqueezyId,
                usageLimit: -1, // Unlimited
                usageCount: 0, // Reset count
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        console.log('✅ User updated to Pro plan');

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

        // Update subscription status
        await db
            .update(subscriptions)
            .set({
                status: 'cancelled',
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        console.log('✅ Subscription record cancelled');

        // Downgrade user to free plan
        await db
            .update(users)
            .set({
                subscriptionStatus: 'free',
                subscriptionId: null,
                usageLimit: 3, // Free plan limit
                updatedAt: new Date(),
            })
            .where(eq(users.id, subscription.userId));

        console.log('✅ User downgraded to Free plan');
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
    console.log('🔄 Syncing subscription for:', email);

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
        console.error('❌ LEMONSQUEEZY_API_KEY not found');
        return false;
    }

    try {
        // Fetch subscriptions for this email from LemonSqueezy
        const response = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(email)}`,
            {
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ LemonSqueezy API error:', error);
            return false;
        }

        const data = await response.json();
        const subscriptionsList = data.data || [];

        // Look for an active or trialing subscription
        const activeSub = subscriptionsList.find((s: any) =>
            s.attributes.status === 'active' || s.attributes.status === 'on_trial'
        );

        if (activeSub) {
            console.log('✅ Found active subscription:', activeSub.id);
            const attrs = activeSub.attributes;

            await activateSubscription(
                userId,
                activeSub.id,
                String(attrs.product_id),
                String(attrs.variant_id),
                new Date(attrs.renews_at || attrs.ends_at)
            );

            return true;
        }

        console.log('ℹ️ No active subscription found for:', email);
        return false;
    } catch (error) {
        console.error('❌ Error syncing with LemonSqueezy:', error);
        return false;
    }
}

/**
 * Get the LemonSqueezy Customer Portal URL for a subscription
 */
export async function getCustomerPortalUrl(lemonSqueezyId: string): Promise<string | null> {
    console.log('🔄 Fetching portal URL for:', lemonSqueezyId);

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
        console.error('❌ LEMONSQUEEZY_API_KEY not found');
        return null;
    }

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

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ LemonSqueezy API error:', error);
            return null;
        }

        const data = await response.json();
        return data.data.attributes.urls?.customer_portal || null;
    } catch (error) {
        console.error('❌ Error fetching portal URL:', error);
        return null;
    }
}


