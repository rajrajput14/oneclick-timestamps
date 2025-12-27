import { db } from '@/lib/db';
import { users, subscriptions, orders } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { type PgTransaction } from 'drizzle-orm/pg-core';

// We define a type that can be either the DB or a transaction to allow injection
type DBOrTransaction = {
    update: typeof db.update;
    insert: typeof db.insert;
    query: typeof db.query;
};

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
    minutesLimit?: number,
    status: string = 'active',
    tx: DBOrTransaction = db
): Promise<void> {
    console.log('🔄 Activating subscription for user:', userId, 'Plan:', planName);

    try {
        // Update user to active subscription (uses tx for transactional mapping)
        const user = await tx.query.users.findFirst({
            where: eq(users.id, userId),
        });

        const updateData: any = {
            subscriptionStatus: status,
            subscriptionId: lemonSqueezyId,
            updatedAt: new Date(),
        };

        // Check if this is a brand new subscription record for our DB
        const existing = await tx.query.subscriptions.findFirst({
            where: eq(subscriptions.lemonSqueezyId, lemonSqueezyId),
        });

        // 🚀 SMART ADDITIVE LOGIC (Summing up plan minutes)
        if (planName) updateData.subscriptionPlan = planName;

        if (minutesLimit !== undefined) {
            const isVariantChange = existing && String(existing.variantId) !== String(variantId);

            if (!existing || isVariantChange) {
                // Only ADD if it's a new item or an upgrade. 
                // This prevents double-counting on repeat syncs of the same state.
                console.log(`🔋 [DB] Adding ${minutesLimit} plan minutes to user ${userId} (New/Upgrade)`);
                updateData.minutesLimit = sql`COALESCE(${users.minutesLimit}, 0) + ${minutesLimit}`;
            }
            // NOTE: If variant matches, we DON'T update minutesLimit at all, 
            // keeping the user's current (potentially aggregated) balance.
        }

        const isPreviouslyActive = user?.subscriptionStatus === 'active';
        if (!isPreviouslyActive) {
            updateData.minutesUsed = 0;
            // Defaulting if nothing exists
            if (updateData.minutesLimit === undefined && (!user?.minutesLimit || user.minutesLimit < 500)) {
                updateData.minutesLimit = 500;
            }
        }

        console.log(`[DB] Syncing User ${userId} (Existing: ${!!existing})`);

        await tx.update(users).set(updateData).where(eq(users.id, userId));

        console.log(`✅ [DB] Plan Activation complete for ${userId}. (Total Aggregated Plan: ${planName})`);

        if (existing) {
            await tx
                .update(subscriptions)
                .set({
                    status: 'active',
                    productId,
                    variantId,
                    currentPeriodEnd,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existing.id));
            console.log(`✅ Subscription record updated (Variant: ${variantId})`);
        } else {
            await tx.insert(subscriptions).values({
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
export async function deactivateSubscription(
    lemonSqueezyId: string,
    tx: DBOrTransaction = db
): Promise<void> {
    console.log('🔄 Deactivating subscription:', lemonSqueezyId);

    try {
        const subscription = await tx.query.subscriptions.findFirst({
            where: eq(subscriptions.lemonSqueezyId, lemonSqueezyId),
        });

        if (!subscription) {
            console.log('⚠️ Subscription not found');
            return;
        }

        // Update subscription status in history
        await tx
            .update(subscriptions)
            .set({
                status: 'cancelled',
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        // Downgrade user to free plan
        await tx
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
 * Handle Add-on purchase with atomic increments (Concurrency Safe & Idempotent)
 */
export async function purchaseAddon(
    userId: string,
    minutesToAdd: number,
    lsOrderId: string,
    tx: DBOrTransaction = db
): Promise<void> {
    console.log(`🔋 Processing add-on: Adding ${minutesToAdd} minutes to user ${userId} (Order: ${lsOrderId})`);

    try {
        // Check for idempotency using the orders table
        const existingOrder = await tx.query.orders.findFirst({
            where: eq(orders.lemonSqueezyId, lsOrderId),
        });

        if (existingOrder) {
            console.log(`⚠️ Order ${lsOrderId} already processed. Skipping minute addition.`);
            return;
        }

        // Atomic SQL increment to prevent race conditions
        await tx
            .update(users)
            .set({
                addonMinutes: sql`COALESCE(${users.addonMinutes}, 0) + ${minutesToAdd}`,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        // Record the order to prevent double-counting
        await tx.insert(orders).values({
            userId,
            lemonSqueezyId: lsOrderId,
            status: 'paid',
            minutes: minutesToAdd,
        });

        console.log(`✅ Atomic increment successful for user ${userId}. Order ${lsOrderId} recorded.`);
    } catch (error) {
        console.error('❌ Error processing add-on purchase:', error);
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

    const activeStatuses = ['active', 'trialing', 'past_due'];
    if (!user || !activeStatuses.includes(user.subscriptionStatus || '')) {
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
    console.log(`🔄 [Sync] Starting manual recovery for: ${email} (User ID: ${userId})`);

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
        console.error('❌ [Sync] FAILED: LEMONSQUEEZY_API_KEY missing');
        return false;
    }

    try {
        let itemsSynced = 0;

        // --- 1. GET USER CURRENT ID ---
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        // --- 2. TRY SYNC BY DIRECT ID (MOST RELIABLE) ---
        if (user?.subscriptionId) {
            console.log(`🔍 [Sync] Attempting direct sync by ID: ${user.subscriptionId}`);
            const directUrl = `https://api.lemonsqueezy.com/v1/subscriptions/${user.subscriptionId}`;
            const directRes = await fetch(directUrl, {
                headers: { 'Accept': 'application/vnd.api+json', 'Authorization': `Bearer ${apiKey}` }
            });

            if (directRes.ok) {
                const subData = await directRes.json();
                const sub = subData.data;
                const attrs = sub.attributes;

                // If ID exists and is active, sync it!
                if (['active', 'on_trial', 'trialing', 'past_due'].includes(String(attrs.status).toLowerCase())) {
                    const metadata = sub.meta?.custom_data || attrs.custom_data || {};
                    let minutesLimit = metadata.minutes_limit ? parseInt(metadata.minutes_limit) : 500;
                    let planName = metadata.plan_name || (minutesLimit > 500 ? 'Pro Creator' : 'Creator');

                    await activateSubscription(
                        userId, String(sub.id), String(attrs.product_id), String(attrs.variant_id),
                        new Date(attrs.renews_at || attrs.ends_at || Date.now() + 30 * 24 * 60 * 60 * 1000),
                        planName, minutesLimit, String(attrs.status).toLowerCase()
                    );
                    console.log(`✅ [Sync] Direct ID sync successful: ${sub.id}`);
                    itemsSynced++;
                }
            }
        }

        // --- 3. SYNC ALL ACTIVE SUBSCRIPTIONS BY EMAIL (AGGREGATION) ---
        // Changed to ascending sort (created_at) so that the NEWEST plan name is the final one in the DB
        const subUrl = `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(email)}&sort=created_at`;
        console.log(`🔍 [Sync] Checking ALL subscriptions: ${subUrl}`);
        const subRes = await fetch(subUrl, {
            headers: { 'Accept': 'application/vnd.api+json', 'Authorization': `Bearer ${apiKey}` }
        });

        if (subRes.ok) {
            const data = await subRes.json();
            const subs = data.data || [];
            console.log(`🔍 [Sync] Found ${subs.length} candidates in LS Subscriptions API.`);

            const validStatuses = ['active', 'on_trial', 'trialing', 'past_due'];
            for (const sub of subs) {
                const attrs = sub.attributes;
                if (validStatuses.includes(String(attrs.status).toLowerCase())) {
                    // Only sync if it's NOT the one we just synced by direct ID
                    if (sub.id !== user?.subscriptionId) {
                        const metadata = sub.meta?.custom_data || attrs.custom_data || {};
                        let minutesLimit = metadata.minutes_limit ? parseInt(metadata.minutes_limit) : 500;
                        let planName = metadata.plan_name || (minutesLimit > 500 ? 'Pro Creator' : 'Creator');

                        console.log(`🔋 [Sync] Aggregating Plan: ${planName} (ID: ${sub.id})`);
                        await activateSubscription(
                            userId, String(sub.id), String(attrs.product_id), String(attrs.variant_id),
                            new Date(attrs.renews_at || attrs.ends_at || Date.now() + 30 * 24 * 60 * 60 * 1000),
                            planName, minutesLimit, String(attrs.status).toLowerCase()
                        );
                        itemsSynced++;
                    }
                }
            }
        }

        // --- 4. SYNC ALL PAID ORDERS (For Add-ons) ---
        // Sorting ascending to process them in order
        const orderUrl = `https://api.lemonsqueezy.com/v1/orders?filter[email]=${encodeURIComponent(email)}&sort=created_at`;
        console.log(`🔍 [Sync] Checking ALL orders: ${orderUrl}`);
        const orderRes = await fetch(orderUrl, {
            headers: { 'Accept': 'application/vnd.api+json', 'Authorization': `Bearer ${apiKey}` }
        });

        if (orderRes.ok) {
            const data = await orderRes.json();
            const orders = data.data || [];
            console.log(`🔍 [Sync] Found ${orders.length} orders in LS Orders API.`);

            for (const order of orders) {
                const attrs = order.attributes;
                if (attrs.status === 'paid') {
                    const customData = order.meta?.custom_data || attrs.custom_data || {};
                    if (customData.type === 'addon' && customData.minutes) {
                        const minutesToAdd = parseInt(String(customData.minutes));
                        console.log(`🔋 [Sync] Aggregating Add-on Order: ${order.id} (+${minutesToAdd} mins)`);
                        const orderIdString = String(order.id);
                        await purchaseAddon(userId, minutesToAdd, orderIdString);
                        itemsSynced++;
                    }
                }
            }
        }

        console.log(`ℹ️ [Sync] Finished: Processed ${itemsSynced} actionable items.`);
        return itemsSynced > 0;
    } catch (error) {
        console.error('❌ [Sync] Critical Error during recovery:', error);
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
