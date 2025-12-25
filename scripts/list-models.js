
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function listModels() {
    try {
        // Manually parse .env.local
        const envPath = path.join(process.cwd(), '.env.local');
        let apiKey = process.env.GEMINI_API_KEY;

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.startsWith('GEMINI_API_KEY=')) {
                    apiKey = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
                    break;
                }
            }
        }

        if (!apiKey) {
            console.error('GEMINI_API_KEY not found in environment or .env.local');
            process.exit(1);
        }

        console.log('Fetching models via raw REST API for total visibility...');

        // Check both v1 and v1beta
        const versions = ['v1', 'v1beta'];

        for (const v of versions) {
            console.log(`\n--- CHECKING API VERSION: ${v} ---`);
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.error(`API ${v} Error:`, JSON.stringify(data.error, null, 2));
                } else {
                    data.models?.forEach(m => {
                        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
                    });
                    if (!data.models || data.models.length === 0) {
                        console.log('No models returned for this version.');
                    }
                }
            } catch (e) {
                console.error(`Fetch error for ${v}:`, e.message);
            }
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

listModels();
