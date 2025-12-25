import { GoogleGenerativeAI } from '@google/generative-ai';
import { TIMESTAMP_GENERATION_SYSTEM_PROMPT, TIMESTAMP_GENERATION_USER_PROMPT } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeneratedTimestamp {
    time: string; // "00:00" or "00:00:00"
    title: string;
}

/**
 * Generate timestamps using Google Gemini
 * 
 * This is the core AI intelligence that:
 * 1. Analyzes transcript semantically
 * 2. Detects natural topic boundaries
 * 3. Enforces minimum chapter duration (60 seconds)
 * 4. Generates clear, SEO-friendly titles
 * 5. Maintains original language for titles
 */
export async function generateTimestamps(
    transcript: string,
    language: string = 'English'
): Promise<GeneratedTimestamp[]> {
    try {
        // Use gemini-1.5-flash instead of gemini-pro
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const fullPrompt = `${TIMESTAMP_GENERATION_SYSTEM_PROMPT}

${TIMESTAMP_GENERATION_USER_PROMPT(transcript, language)}`;

        console.log('Generating timestamps with Gemini...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const resultText = response.text();

        console.log('Gemini response received:', resultText.substring(0, 200));

        // Extract JSON from response (remove markdown code blocks if present)
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON array found in response:', resultText);
            throw new Error('No JSON array found in response');
        }

        const timestamps: GeneratedTimestamp[] = JSON.parse(jsonMatch[0]);

        // Validate and ensure first timestamp is 00:00
        if (timestamps.length === 0) {
            throw new Error('No timestamps generated');
        }

        if (timestamps[0].time !== '00:00' && timestamps[0].time !== '0:00') {
            timestamps[0].time = '00:00';
        }

        // Validate format
        for (const ts of timestamps) {
            if (!ts.time || !ts.title) {
                throw new Error('Invalid timestamp format');
            }
        }

        console.log(`Successfully generated ${timestamps.length} timestamps`);
        return timestamps;
    } catch (error) {
        console.error('Error generating timestamps:', error);
        if (error instanceof Error && error.message.includes('API key')) {
            throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env.local');
        }
        throw new Error('Failed to generate timestamps. Please try again.');
    }
}

/**
 * Convert timestamp string to seconds
 */
export function timestampToSeconds(timestamp: string): number {
    const parts = timestamp.split(':').map(Number);

    if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return 0;
}

/**
 * Validate minimum chapter duration
 */
export function validateChapterDurations(timestamps: GeneratedTimestamp[]): boolean {
    const MIN_DURATION = 60; // 60 seconds

    for (let i = 0; i < timestamps.length - 1; i++) {
        const currentSeconds = timestampToSeconds(timestamps[i].time);
        const nextSeconds = timestampToSeconds(timestamps[i + 1].time);
        const duration = nextSeconds - currentSeconds;

        if (duration < MIN_DURATION) {
            return false;
        }
    }

    return true;
}
