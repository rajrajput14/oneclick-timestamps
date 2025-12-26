
import { db } from './src/lib/db';
import { projects } from './src/lib/db/schema';
import { desc } from 'drizzle-orm';

async function diagnose() {
    console.log('--- Project Diagnostics ---');
    const recentProjects = await db.query.projects.findMany({
        orderBy: [desc(projects.createdAt)],
        limit: 5
    });

    recentProjects.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`Title: ${p.title}`);
        console.log(`Status: ${p.status}`);
        console.log(`Progress: ${p.progress}%`);
        console.log(`Status Description: ${p.statusDescription}`);
        console.log(`Error: ${p.errorMessage || 'None'}`);
        console.log(`Created: ${p.createdAt}`);
        console.log('---------------------------');
    });
}

diagnose().catch(console.error);
