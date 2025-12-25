import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Detect language of transcript using Google Gemini
 */
export async function detectLanguage(text: string): Promise<{
    language: string;
    languageCode: string;
    confidence: number;
    isMixed: boolean;
}> {
    try {
        const sample = text.substring(0, 1000); // Use first 1000 chars for detection

        // Use gemini-1.5-flash instead of gemini-pro
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a language detection expert. Analyze the text and determine:
1. Primary language name (e.g., "English", "Spanish", "Hindi")
2. ISO 639-1 language code (e.g., "en", "es", "hi")
3. Confidence level (0-100)
4. Whether the text contains mixed languages (true/false)

Respond ONLY with valid JSON in this exact format:
{"language": "English", "languageCode": "en", "confidence": 95, "isMixed": false}

Text to analyze:
${sample}`;

        console.log('Detecting language with Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const resultText = response.text();

        console.log('Language detection response:', resultText);

        // Extract JSON from response (remove markdown code blocks if present)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            language: parsed.language || 'Unknown',
            languageCode: parsed.languageCode || 'unknown',
            confidence: parsed.confidence || 0,
            isMixed: parsed.isMixed || false,
        };
    } catch (error) {
        console.error('Error detecting language:', error);
        if (error instanceof Error && error.message.includes('API key')) {
            console.error('Invalid Gemini API key');
        }
        // Fallback to English
        return {
            language: 'English',
            languageCode: 'en',
            confidence: 50,
            isMixed: false,
        };
    }
}
