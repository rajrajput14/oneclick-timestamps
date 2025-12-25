import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

// Function to clean database URL (strips 'psql' command and quotes if user copy-pasted wrong)
function sanitizeDatabaseUrl(url: string | undefined): string {
    if (!url) return 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

    let cleanUrl = url.trim();
    // Strip 'psql' if present
    if (cleanUrl.startsWith('psql ')) {
        cleanUrl = cleanUrl.replace(/^psql\s+/, '').trim();
    }
    // Strip single or double quotes
    cleanUrl = cleanUrl.replace(/^['"]|['"]$/g, '');

    return cleanUrl;
}

if (!databaseUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ DATABASE_URL is missing. Database initialization may fail if accessed during build.');
}

const sanitizedUrl = sanitizeDatabaseUrl(databaseUrl);
const sql = neon(sanitizedUrl);
export const db = drizzle(sql, { schema });
