import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Users table (synced with Clerk)
export const users = pgTable('users', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    name: text('name'),
    imageUrl: text('image_url'),
    subscriptionStatus: text('subscription_status').default('free'), // 'free', 'active', 'cancelled'
    subscriptionId: text('subscription_id'),
    usageCount: integer('usage_count').default(0),
    usageLimit: integer('usage_limit').default(3), // Free: 3, Paid: -1 (unlimited)
    usageResetDate: timestamp('usage_reset_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    clerkIdIdx: index('clerk_id_idx').on(table.clerkId),
}));

// Projects table
export const projects = pgTable('projects', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    youtubeUrl: text('youtube_url'),
    youtubeVideoId: text('youtube_video_id'),
    transcript: text('transcript'),
    language: text('language'),
    status: text('status').default('processing'), // 'processing', 'completed', 'failed'
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
}));

// Timestamps table
export const timestamps = pgTable('timestamps', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    timeSeconds: integer('time_seconds').notNull(),
    timeFormatted: text('time_formatted').notNull(),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    projectIdIdx: index('project_id_idx').on(table.projectId),
}));

// Subscriptions table (LemonSqueezy webhook data)
export const subscriptions = pgTable('subscriptions', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lemonSqueezyId: text('lemon_squeezy_id').notNull(),
    status: text('status').notNull(), // 'active', 'cancelled', 'expired'
    productId: text('product_id').notNull(),
    variantId: text('variant_id').notNull(),
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('subscription_user_id_idx').on(table.userId),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Timestamp = typeof timestamps.$inferSelect;
export type InsertTimestamp = typeof timestamps.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
