import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/lib/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gL5NzeVfuP7R@ep-delicate-cherry-a49ikoh5-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    },
});
