import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Sync Clerk user to database
 * Creates or updates user record based on Clerk data
 */
export async function syncUser() {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    try {
        // Check if user exists by Clerk ID first
        const existingUserByClerkId = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkUser.id),
        });

        if (existingUserByClerkId) {
            // Update existing user
            const [updatedUser] = await db
                .update(users)
                .set({
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
                    imageUrl: clerkUser.imageUrl || null,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, existingUserByClerkId.id))
                .returning();

            return updatedUser;
        }

        // Check if user exists by email (in case of re-signup)
        const email = clerkUser.emailAddresses[0]?.emailAddress || '';
        if (email) {
            const existingUserByEmail = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingUserByEmail) {
                // Update the existing user with new Clerk ID
                const [updatedUser] = await db
                    .update(users)
                    .set({
                        clerkId: clerkUser.id,
                        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
                        imageUrl: clerkUser.imageUrl || null,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, existingUserByEmail.id))
                    .returning();

                return updatedUser;
            }
        }

        // Create new user with proper date handling
        const now = new Date();
        const resetDate = new Date(now);
        resetDate.setMonth(resetDate.getMonth() + 1);

        const [newUser] = await db
            .insert(users)
            .values({
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
                imageUrl: clerkUser.imageUrl || null,
                subscriptionPlan: 'Free',
                subscriptionStatus: 'inactive',
                minutesUsed: 0,
                minutesLimit: 60,
                addonMinutes: 0,
            })
            .returning();

        return newUser;
    } catch (error) {
        console.error('Error syncing user:', error);
        // Try to find existing user as fallback
        try {
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            if (email) {
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, email),
                });
                if (existingUser) {
                    return existingUser;
                }
            }
        } catch (fallbackError) {
            console.error('Fallback user lookup failed:', fallbackError);
        }
        return null;
    }
}

export type AuthUser = typeof users.$inferSelect;
export type DatabaseError = { error: 'DATABASE_ERROR'; details: string };

/**
 * Get current user from database
 * Automatically syncs if not found but authenticated in Clerk
 */
export async function getCurrentUser(): Promise<AuthUser | DatabaseError | null> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkUser.id),
        });

        if (user) return user;

        // self-healing sync: user is in Clerk but not in DB
        console.log(`[Auth] User ${clerkUser.id} missing from DB, triggering sync...`);
        return await syncUser();
    } catch (error) {
        console.error('CRITICAL: Error getting current user from DB:', error);
        // Return a special error object to help diagnostics
        return {
            error: 'DATABASE_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
