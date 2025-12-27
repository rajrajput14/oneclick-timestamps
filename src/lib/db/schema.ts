import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

// Users table (synced with Clerk)
export const users = pgTable('users', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    name: text('name'),
    imageUrl: text('image_url'),
    subscriptionPlan: text('subscription_plan').default('Free'), // 'Free', 'Creator', 'Pro Creator'
    subscriptionStatus: text('subscription_status').default('inactive'), // 'active', 'inactive', 'past_due'
    subscriptionId: text('subscription_id'),
    minutesUsed: integer('minutes_used').default(0),
    minutesLimit: integer('minutes_limit').default(60), // Free: 60, Creator: 500, Pro: 1500
    addonMinutes: integer('addon_minutes').default(0),
    billingCycleStart: timestamp('billing_cycle_start').defaultNow(),
    billingCycleEnd: timestamp('billing_cycle_end'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    clerkIdIdx: index('clerk_id_idx').on(table.clerkId),
    subscriptionPlanIdx: index('subscription_plan_idx').on(table.subscriptionPlan),
}));

export const usersRelations = relations(users, ({ many }) => ({
    projects: many(projects),
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
    progress: integer('progress').default(0), // 0 to 100
    statusDescription: text('status_description').default('Queued'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    timestamps: many(timestamps),
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

export const timestampsRelations = relations(timestamps, ({ one }) => ({
    project: one(projects, {
        fields: [timestamps.projectId],
        references: [projects.id],
    }),
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
