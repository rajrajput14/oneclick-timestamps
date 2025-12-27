import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';

// Required for Node.js environments when using neon-serverless Pool
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const databaseUrl = process.env.DATABASE_URL;

// Function to clean database URL (strips 'psql' command and quotes if user copy-pasted wrong)
function sanitizeDatabaseUrl(url: string | undefined): string {
    if (!url) return 'postgresql://neondb_owner:npg_gL5NzeVfuP7R@ep-delicate-cherry-a49ikoh5-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

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

// Using Pool with neon-serverless for WebSocket support (required for transactions)
const pool = new Pool({ connectionString: sanitizedUrl });
export const db = drizzle(pool, { schema });
