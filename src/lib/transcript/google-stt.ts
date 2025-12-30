import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const client = new SpeechClient();
const storage = new Storage();

// Configure fluent-ffmpeg to use static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface STTSegment {
    time: number;
    text: string;
}

export interface STTResult {
    segments: STTSegment[];
    language: string;
    processedSeconds: number;
}

const CHUNK_DURATION = 300; // 5 minutes in seconds

/**
 * Detect silence using FFmpeg and return non-silent intervals
 */
async function getNonSilentIntervals(filePath: string): Promise<{ start: number, end: number }[]> {
    return new Promise((resolve, reject) => {
        let stderr = '';
        const ffmpegBinary = ffmpegStatic || 'ffmpeg';
        const ffmpegProcess = spawn(ffmpegBinary, [
            '-i', filePath,
            '-af', 'silencedetect=noise=-30dB:d=0.5',
            '-f', 'null', '-'
        ]);

        ffmpegProcess.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        ffmpegProcess.on('close', (code: number) => {
            const intervals: { start: number, end: number }[] = [];
            let lastSilenceEnd = 0;

            // Simple parser for silencedetect output
            const silenceEnds = stderr.match(/silence_end: ([\d.]+)/g);
            const silenceStarts = stderr.match(/silence_start: ([\d.]+)/g);

            if (!silenceStarts || silenceStarts.length === 0) {
                // No silence detected, return full range (conservative)
                return resolve([{ start: 0, end: 999999 }]);
            }

            silenceStarts.forEach((startMsg, i) => {
                const startTime = parseFloat(startMsg.split(': ')[1]);
                if (startTime > lastSilenceEnd) {
                    intervals.push({ start: lastSilenceEnd, end: startTime });
                }

                if (silenceEnds && silenceEnds[i]) {
                    lastSilenceEnd = parseFloat(silenceEnds[i].split(': ')[1]);
                }
            });

            // Add the last interval
            intervals.push({ start: lastSilenceEnd, end: 999999 });

            resolve(intervals);
        });
    });
}

/**
 * Split audio into chunks of fixed duration
 */
async function splitAudio(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const chunks: string[] = [];
        const outputPattern = path.join('/tmp', `chunk-${uuidv4()}-%03d.wav`);

        ffmpeg(filePath)
            .outputOptions([
                `-f segment`,
                `-segment_time ${CHUNK_DURATION}`,
                `-c copy`
            ])
            .on('start', (cmd) => console.log('[GoogleSTT] Chunking audio:', cmd))
            .on('error', (err) => reject(err))
            .on('end', () => {
                // Find all generated files
                const dir = '/tmp';
                const files = fs.readdirSync(dir)
                    .filter(f => f.startsWith(path.basename(outputPattern).split('%')[0]) && f.endsWith('.wav'))
                    .map(f => path.join(dir, f))
                    .sort();
                resolve(files);
            })
            .save(outputPattern);
    });
}

/**
 * Transcribe a single chunk
 */
async function transcribeChunk(
    filePath: string,
    bucketName: string,
    startTimeOffset: number
): Promise<STTSegment[]> {
    const fileName = path.basename(filePath);
    const gcsUri = `gs://${bucketName}/${fileName}`;

    try {
        await storage.bucket(bucketName).upload(filePath, { destination: fileName });

        const request = {
            audio: { uri: gcsUri },
            config: {
                encoding: 'LINEAR16' as const,
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true,
                alternativeLanguageCodes: ['es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'zh-CN', 'ja-JP', 'pt-BR', 'ru-RU', 'it-IT'],
            },
        };

        const [operation] = await client.longRunningRecognize(request);
        console.log("🟢 STEP 5: Speech-to-text started");
        const [response] = await operation.promise();
        console.log("🟢 STEP 6: Speech-to-text completed");

        const segments: STTSegment[] = [];
        if (response.results) {
            response.results.forEach((result) => {
                const alternative = result.alternatives?.[0];
                if (!alternative) return;

                const startTime = alternative.words?.[0]?.startTime;
                const seconds = startTime ? parseInt(startTime.seconds?.toString() || '0') : 0;

                segments.push({
                    time: seconds + startTimeOffset,
                    text: alternative.transcript || '',
                });
            });
        }

        // Cleanup chunk in GCS
        await storage.bucket(bucketName).file(fileName).delete().catch(() => { });
        return segments;
    } finally {
        // Cleanup local chunk file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text (V1) with Parallel Chunking
 */
export async function transcribeAudioWithGoogle(
    filePath: string,
    onProgress?: (progress: number, description: string) => Promise<void>
): Promise<STTResult> {
    let bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET environment variable is not set.');
    }
    bucketName = bucketName.replace(/^gs:\/\//, '').replace(/\/$/, '');

    try {
        if (onProgress) await onProgress(45, 'Optimizing audio for parallel processing...');

        // Detect non-silent intervals
        const nonSilentIntervals = await getNonSilentIntervals(filePath);
        console.log(`[GoogleSTT] Detected ${nonSilentIntervals.length} non-silent intervals.`);

        // 1. Split into chunks
        const chunks = await splitAudio(filePath);
        console.log(`[GoogleSTT] Audio split into ${chunks.length} chunks`);

        if (onProgress) await onProgress(50, `Transcribing ${chunks.length} chunks in parallel...`);

        // 2. Transcribe chunks in parallel (only those with speech)
        const transcriptionPromises = chunks.map(async (chunkPath, index) => {
            const startTime = index * CHUNK_DURATION;
            const endTime = startTime + CHUNK_DURATION;

            // Check if this chunk overlaps with any non-silent intervals
            const hasSpeech = nonSilentIntervals.some(interval =>
                (interval.start < endTime && interval.end > startTime)
            );

            if (!hasSpeech) {
                console.log(`[GoogleSTT] Skipping silent chunk ${index}`);
                if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
                return [];
            }

            return transcribeChunk(chunkPath, bucketName!, startTime);
        });

        const chunkResults = await Promise.all(transcriptionPromises);

        // 3. Merge results
        const allSegments = chunkResults.flat().sort((a, b) => a.time - b.time);

        // Calculate total processed seconds (sum of durations of non-skipped chunks)
        const processedSeconds = chunks.reduce((acc, _, index) => {
            const startTime = index * CHUNK_DURATION;
            const endTime = startTime + CHUNK_DURATION;
            const hasSpeech = nonSilentIntervals.some(interval =>
                (interval.start < endTime && interval.end > startTime)
            );

            if (hasSpeech) {
                // To be conservative and fair, we count the full chunk duration
                // unless it's the last chunk (but we don't have duration here easily)
                // For now, this is a much better approximation than the full video length.
                return acc + CHUNK_DURATION;
            }
            return acc;
        }, 0);

        if (onProgress) await onProgress(80, 'Aggregating transcription results...');

        return {
            segments: allSegments,
            language: 'en-US',
            processedSeconds: Math.floor(processedSeconds)
        };

    } catch (error: any) {
        console.error('[GoogleSTT] Error:', error);
        throw new Error(`Google Speech-to-Text failed: ${error.message}`);
    }
}

/**
 * Transcribe multiple specific samples in parallel.
 * This is the core of the new FAST pipeline.
 */
export async function transcribeBatch(
    samples: { filePath: string, startTime: number }[],
    onProgress?: (progress: number, description: string) => Promise<void>
): Promise<STTResult> {
    let bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET environment variable is not set.');
    }
    bucketName = bucketName.replace(/^gs:\/\//, '').replace(/\/$/, '');

    console.log(`[GoogleSTT] Transcribing batch of ${samples.length} samples.`);
    if (onProgress) await onProgress(40, `Transcribing ${samples.length} samples in parallel...`);

    const transcriptionPromises = samples.map(sample =>
        transcribeChunk(sample.filePath, bucketName!, sample.startTime)
    );

    const chunkResults = await Promise.all(transcriptionPromises);
    const allSegments = chunkResults.flat().sort((a, b) => a.time - b.time);

    // Filter out potential duplicates or very close segments if they exist (rare in sampling)
    const uniqueSegments = allSegments.filter((seg, index, self) =>
        index === 0 || seg.time !== self[index - 1].time
    );

    return {
        segments: uniqueSegments,
        language: 'en-US', // Auto-detection result is per-chunk in transcribeChunk, but we return a single lang for simplicity
        processedSeconds: samples.length * 40 // Approximation for billing/usage
    };
}
