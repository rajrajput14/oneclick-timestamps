import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const requiredVars = [
    'DATABASE_URL',
    'GEMINI_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_CLOUD_STORAGE_BUCKET',
    'LEMONSQUEEZY_API_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
];

console.log('--- Environment Variable Verification ---');
requiredVars.forEach(v => {
    console.log(`${v}: ${process.env[v] ? '✅ SET' : '❌ MISSING'}`);
});
