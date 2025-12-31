import { extractAudioSamples, getVideoDuration } from './audio-extractor';
import { transcribeBatch } from '../transcript/google-stt';
import { STT_SEGMENTATION_SYSTEM_PROMPT, STT_SEGMENTATION_USER_PROMPT } from '../ai/prompts';
import { formatTimestamp } from './transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSampleIntervals } from './sampling';

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
    let audioResults: any[] = [];
    try {
        const { descriptionPrefix = '' } = options;
        console.log(`[OptimizedPipeline] orchestrating fast path for ${videoId}`);

        // STEP 1: Audio Sampling (0–30%)
        if (onProgress) await onProgress(5, `${descriptionPrefix}Analyzing video length...`);
        const totalDuration = await getVideoDuration(videoId);

        if (onProgress) await onProgress(10, `${descriptionPrefix}Calculating optimal samples...`);
        const intervals = getSampleIntervals(totalDuration);

        if (onProgress) await onProgress(15, `${descriptionPrefix}Extracting ${intervals.length} audio samples...`);
        audioResults = await extractAudioSamples(videoId, intervals);

        // STEP 2: Speech Understanding (31–65%)
        if (onProgress) await onProgress(31, `${descriptionPrefix}Transcribing sampled audio...`);
        const batchSamples = audioResults.map((res, i) => ({
            filePath: res.filePath,
            startTime: intervals[i].start
        }));

        const { segments, language } = await transcribeBatch(batchSamples, onProgress);

        if (segments.length === 0) {
            throw new Error('No speech detected in sampled audio.');
        }

        // STEP 3: Structure-First Timestamp Generation (66–90%)
        if (onProgress) await onProgress(70, `${descriptionPrefix}Synthesizing chapters using AI...`);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1' });

        // Gemini prompt with sampled segments
        const segmentationPrompt = `${STT_SEGMENTATION_SYSTEM_PROMPT}\n\n${STT_SEGMENTATION_USER_PROMPT(segments.slice(0, 1000), language)}`;

        const result = await model.generateContent(segmentationPrompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI failed to identify chapter boundaries.');
        }

        const chapterStartPoints: Array<{ segmentIndex: number; title: string }> = JSON.parse(jsonMatch[0]);

        // STEP 4: Post-Processing & Finalizing (91–100%)
        if (onProgress) await onProgress(95, `${descriptionPrefix}Optimizing chapter flow...`);

        // Map segment indices to absolute timestamps and ensure strictly ascending + reasonable count
        const chapterResults = chapterStartPoints
            .map((chapter) => {
                const segment = segments[chapter.segmentIndex];
                if (!segment) return null;
                return {
                    time: formatTimestamp(segment.time),
                    title: chapter.title,
                    rawTime: segment.time
                };
            })
            .filter((ts): ts is { time: string; title: string; rawTime: number } => ts !== null)
            .sort((a, b) => a.rawTime - b.rawTime);

        // Deduplicate and ensure first is 0:00
        const finalChapters = [];
        const seenTitles = new Set();

        // Injected 0:00 if not present
        if (chapterResults.length > 0 && chapterResults[0].rawTime > 10) {
            finalChapters.push({ time: '00:00', title: 'Introduction' });
        }

        for (const ch of chapterResults) {
            if (!seenTitles.has(ch.title)) {
                finalChapters.push({ time: ch.time, title: ch.title });
                seenTitles.add(ch.title);
            }
        }

        // Cap to 15 chapters
        const cappedChapters = finalChapters.slice(0, 15);

        if (onProgress) await onProgress(100, `${descriptionPrefix}Completed`);

        return {
            videoId,
            timestamps: cappedChapters,
            language,
            processedSeconds: totalDuration, // Project usage is based on whole video
        };

    } catch (error: any) {
        console.error(`[OptimizedPipeline] Critical failure:`, error);
        throw error;
    } finally {
        for (const res of audioResults) {
            if (res && res.cleanup) res.cleanup();
        }
    }
}
