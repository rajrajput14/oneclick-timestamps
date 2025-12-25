import { GoogleGenerativeAI } from '@google/generative-ai';
import { TIMESTAMP_GENERATION_SYSTEM_PROMPT, TIMESTAMP_GENERATION_USER_PROMPT } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// Note: Some regions/keys might require v1 specifically for Flash models
const modelConfig = { model: 'gemini-1.5-flash' };

export interface GeneratedTimestamp {
    time: string; // "00:00" or "00:00:00"
    title: string;
}

/**
 * Generate timestamps using Google Gemini from a raw transcript string.
 */
export async function generateTimestampsFromText(
    transcript: string,
    language: string = 'English'
): Promise<GeneratedTimestamp[]> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1' });

        const fullPrompt = `${TIMESTAMP_GENERATION_SYSTEM_PROMPT}\n\n${TIMESTAMP_GENERATION_USER_PROMPT(transcript, language)}`;

        console.log('[GeminiAI] Generating timestamps from text...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const resultText = response.text();

        console.log('[GeminiAI] Raw AI Response Length:', resultText.length);

        // More robust JSON extraction
        // 1. Try to find content between first [ and last ]
        let jsonStr = '';
        const startIdx = resultText.indexOf('[');
        const endIdx = resultText.lastIndexOf(']');

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonStr = resultText.substring(startIdx, endIdx + 1);
        } else {
            console.error('[GeminiAI] Failed to locate JSON array in response:', resultText);
            throw new Error('Incomplete response from AI engine.');
        }

        try {
            const timestamps: GeneratedTimestamp[] = JSON.parse(jsonStr);

            if (timestamps.length === 0) {
                throw new Error('No timestamps were produced by the AI.');
            }

            // Ensure first timestamp is 00:00
            if (timestamps[0]?.time && timestamps[0].time !== '00:00' && timestamps[0].time !== '0:00') {
                timestamps[0].time = '00:00';
            }

            return timestamps;
        } catch (parseError: any) {
            console.error('[GeminiAI] JSON Parse Error:', parseError.message);
            console.error('[GeminiAI] Faulty JSON snippet:', jsonStr.substring(0, 200) + '...');
            throw new Error(`AI data structure mismatch: ${parseError.message}`);
        }
    } catch (error: any) {
        console.error('[GeminiAI] Fatal Error:', error);
        throw new Error(`Timestamp generation failed: ${error.message}`);
    }
}
