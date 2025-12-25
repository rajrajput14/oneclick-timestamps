import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ DATABASE_URL is missing. Database initialization may fail if accessed during build.');
}

// Using a fallback to prevent module initialization from throwing during build
const sql = neon(databaseUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder');
export const db = drizzle(sql, { schema });
