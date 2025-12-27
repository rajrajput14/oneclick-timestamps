import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('Current Working Directory:', process.cwd());
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
}

import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        console.log('Testing connection...');
        const result = await db.execute(sql`SELECT 1`);
        console.log('Connection successful:', result);

        console.log('Checking users table columns...');
        const columns = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('Columns in users table:', columns);

        process.exit(0);
    } catch (err) {
        console.error('Database check failed:', err);
        process.exit(1);
    }
}

main();
