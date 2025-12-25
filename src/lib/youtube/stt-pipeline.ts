import { extractAudio } from './audio-extractor';
import { transcribeAudioWithGoogle } from '../transcript/google-stt';
import { STT_SEGMENTATION_SYSTEM_PROMPT, STT_SEGMENTATION_USER_PROMPT } from '../ai/prompts';
import { formatTimestamp } from './transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface PipelineResult {
    videoId: string;
    timestamps: Array<{ time: string; title: string }>; // MM:SS Title format for storage
    language: string;
    processedSeconds: number;
}

export interface PipelineOptions {
    seekSeconds?: number;
    durationSeconds?: number;
    descriptionPrefix?: string;
}

/**
 * End-to-end Gemini-based STT and Chaptering pipeline.
 * Supports partial processing for Phase 1 and Phase 2.
 */
export async function runSTTPipeline(
    videoId: string,
    onProgress?: (progress: number, description: string) => Promise<void>,
    options: PipelineOptions = {}
): Promise<PipelineResult> {
    let audioResult;
    try {
        const { seekSeconds = 0, durationSeconds, descriptionPrefix = '' } = options;
        console.log(`[GeminiPipeline] Orchestrating pipeline for video: ${videoId} (Phase: ${descriptionPrefix || 'Full'})`);

        // 1. Audio Extraction (Temporary WAV)
        if (onProgress) await onProgress(10, `${descriptionPrefix}Extracting audio...`);
        audioResult = await extractAudio(videoId, seekSeconds, durationSeconds);

        // 2. Speech-to-Text (The Source of Truth) - Using Google Cloud STT
        if (onProgress) await onProgress(30, `${descriptionPrefix}Transcribing audio...`);
        const { segments, language, processedSeconds } = await transcribeAudioWithGoogle(audioResult.filePath, onProgress);

        if (segments.length === 0) {
            // For background refinement, it's possible some parts are silent
            if (descriptionPrefix.includes('Refinement')) {
                return { videoId, timestamps: [], language: 'en-US', processedSeconds: 0 };
            }
            throw new Error('No speech detected in this portion of the video.');
        }

        // 3. AI Topic Segmentation - Using Gemini 2.0 Flash
        if (onProgress) await onProgress(85, `${descriptionPrefix}Analyzing topics...`);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1' });

        // Re-align segments for Gemini (Gemini needs relative indices, but we'll provide global context if needed)
        // For partial segments, we still use indices [0...N]
        const segmentationPrompt = `${STT_SEGMENTATION_SYSTEM_PROMPT}\n\n${STT_SEGMENTATION_USER_PROMPT(segments.slice(0, 500), language)}`;

        const result = await model.generateContent(segmentationPrompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI failed to segment the transcript.');
        }

        const chapterStartPoints: Array<{ segmentIndex: number; title: string }> = JSON.parse(jsonMatch[0]);

        // 4. Timestamp Assignment & Formatting
        if (onProgress) await onProgress(95, `${descriptionPrefix}Finalizing chapters...`);
        const chapterResults = chapterStartPoints
            .map((chapter) => {
                const segment = segments[chapter.segmentIndex];
                if (!segment) return null;
                return {
                    time: formatTimestamp(segment.time), // formatTimestamp handles absolute time
                    title: chapter.title
                };
            })
            .filter((ts): ts is { time: string; title: string } => ts !== null);

        if (onProgress) await onProgress(100, `${descriptionPrefix}Completed`);

        return {
            videoId,
            timestamps: chapterResults,
            language,
            processedSeconds,
        };

    } catch (error: any) {
        const { descriptionPrefix = '' } = options;
        console.error(`[GeminiPipeline] Pipeline failure (${descriptionPrefix}):`, error);
        throw error;
    } finally {
        if (audioResult) {
            audioResult.cleanup();
        }
    }
}
