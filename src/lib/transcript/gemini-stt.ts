import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
export interface STTSegment {
    time: number;
    text: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export interface GeminiSTTResult {
    segments: STTSegment[];
    language: string;
}

/**
 * Transcribe audio using Gemini 1.5 Flash (Multimodal Audio).
 * 1. Upload file -> 2. Wait for processing -> 3. Transcribe
 */
export async function transcribeAudioWithGemini(filePath: string): Promise<GeminiSTTResult> {
    console.log('[GeminiSTT] Uploading audio file:', filePath);

    try {
        // 1. Upload to Gemini File Manager
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType: 'audio/wav',
            displayName: 'YouTube Video Audio',
        });

        // 2. Poll for file readiness
        let file = await fileManager.getFile(uploadResponse.file.name);
        while (file.state === FileState.PROCESSING) {
            console.log('[GeminiSTT] Processing file...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResponse.file.name);
        }

        if (file.state === FileState.FAILED) {
            throw new Error('Audio file processing failed on Gemini servers.');
        }

        console.log('[GeminiSTT] File ready. Generating transcription...');

        // 3. Transcribe using 2.0 Flash
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1' });

        const prompt = `Return a high-accuracy transcription of this audio. 
        Format your response as a JSON object with a "segments" array.
        Each segment must have:
        - "time": start time in seconds (as an integer)
        - "text": the spoken text
        Also include a "language" field with the detected language.
        
        Ensure timestamps are precise and strictly reflect the audio content.`;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri,
                },
            },
            { text: prompt },
        ]);

        const responseText = result.response.text();

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Gemini failed to return structured transcription data.');
        }

        const data = JSON.parse(jsonMatch[0]);

        // Cleanup: Delete the file from Gemini storage
        await fileManager.deleteFile(file.name);
        console.log('[GeminiSTT] Transcription complete and cleanup successful.');

        return {
            segments: data.segments || [],
            language: data.language || 'english',
        };

    } catch (error: any) {
        console.error('[GeminiSTT] Error:', error);
        throw new Error(`STT failed via Gemini: ${error.message}`);
    }
}
