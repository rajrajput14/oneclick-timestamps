const { pgTable, text, integer, timestamp, index } = require('drizzle-orm/pg-core');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Client } = require('pg');
const { relations } = require('drizzle-orm');

// Re-define schema for the script to match
const projects = pgTable('projects', {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    progress: integer('progress'),
    statusDescription: text('status_description'),
    status: text('status'),
});

const projectsRelations = relations(projects, ({ many }) => ({
    timestamps: many(timestamps),
}));

const timestamps = pgTable('timestamps', {
    id: text('id').primaryKey(),
    projectId: text('project_id'),
    position: integer('position'),
});

const timestampsRelations = relations(timestamps, ({ one }) => ({
    project: one(projects, { fields: [timestamps.projectId], references: [projects.id] }),
}));

async function test() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_gL5NzeVfuP7R@ep-delicate-cherry-a49ikoh5-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });
    await client.connect();

    // We can't easily use the full Drizzle Relational API in a standalone script without the full setup
    // but we can check if a simple query returns the right keys.
    const res = await client.query('SELECT progress, status_description FROM projects ORDER BY created_at DESC LIMIT 1');
    console.log("Direct SQL Result:", res.rows[0]);

    await client.end();
}

test();
