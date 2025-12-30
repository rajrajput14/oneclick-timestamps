import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function checkProjects() {
    console.log('--- Database Project Status Check ---');
    const sql = neon(process.env.DATABASE_URL!);

    try {
        const rows = await sql`
            SELECT id, title, status, progress, status_description, error_message, updated_at
            FROM projects
            ORDER BY updated_at DESC
            LIMIT 5
        `;

        console.log('Recent Projects:');
        console.table(rows);

        const counts = await sql`
            SELECT status, count(*) 
            FROM projects 
            GROUP BY status
        `;
        console.log('\nStatus counts:');
        console.table(counts);

    } catch (err) {
        console.error('Error checking projects:', err);
    }
}

checkProjects();
