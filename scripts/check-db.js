const { Client } = require('pg');

async function checkProjects() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_gL5NzeVfuP7R@ep-delicate-cherry-a49ikoh5-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, title, status, progress, status_description, error_message, created_at FROM projects ORDER BY created_at DESC LIMIT 5');
        console.table(res.rows);
    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        await client.end();
    }
}

checkProjects();
