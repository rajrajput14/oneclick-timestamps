import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { SampleInterval } from './sampling';
import { Innertube } from 'youtubei.js';

export interface AudioExtractionResult {
    filePath: string;
    cleanup: () => void;
}

/**
 * Extract audio from a YouTube video using local yt-dlp binary (Extremely Resilient)
 * Supports optional slicing (seek and duration) for Phase 1 optimization.
 */
export async function extractAudio(
    videoId: string,
    seekSeconds?: number,
    durationSeconds?: number
): Promise<AudioExtractionResult> {
    const projectRoot = process.cwd();
    const isLinux = process.platform === 'linux';
    const binaryName = isLinux ? 'yt-dlp-linux' : 'yt-dlp';
    const YTDLP_PATH = path.join(projectRoot, 'bin', binaryName);
    const RELATIVE_FFMPEG_PATH = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg');

    let resolvedFfmpegPath = RELATIVE_FFMPEG_PATH;
    if (!fs.existsSync(resolvedFfmpegPath)) {
        resolvedFfmpegPath = ffmpegStatic || 'ffmpeg';
    }

    console.log('[AudioExtractor] Using FFmpeg at:', resolvedFfmpegPath);
    ffmpeg.setFfmpegPath(resolvedFfmpegPath);

    const tempFilePath = path.join('/tmp', `audio-${uuidv4()}.wav`);
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve, reject) => {
        console.log(`[AudioExtractor] Starting yt-dlp extraction for ${videoId}`);

        // Construct yt-dlp command to stream best audio to stdout
        // --no-playlist: ensure we only get the specific video
        // -o -: output to stdout
        const ytdlp = spawn(YTDLP_PATH, [
            '-f', 'bestaudio',
            '--no-playlist',
            '--no-warnings',
            '--no-check-certificate',
            '--ffmpeg-location', resolvedFfmpegPath,
            '--no-cache-dir',
            '--cache-dir', '/tmp/yt-dlp-cache',
            '--no-update', // Prevent hangs during self-update attempts
            '-o', '-',
            youtubeUrl
        ]);

        let ytdlpError = '';
        ytdlp.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.toLowerCase().includes('error')) {
                ytdlpError += msg;
            }
            // Log output for debugging but keep it clean
            if (msg.trim()) console.log(`[yt-dlp] ${msg.trim()}`);
        });

        const ffmpegProcess = ffmpeg(ytdlp.stdout)
            .toFormat('wav')
            .audioChannels(1)
            .audioFrequency(16000)
            .audioCodec('pcm_s16le');

        if (seekSeconds !== undefined) {
            ffmpegProcess.setStartTime(seekSeconds);
        }

        if (durationSeconds !== undefined) {
            ffmpegProcess.setDuration(durationSeconds);
        }

        ffmpegProcess
            .on('start', (cmd) => {
                console.log('[AudioExtractor] FFmpeg started processing yt-dlp stream');
                if (seekSeconds || durationSeconds) {
                    console.log(`[AudioExtractor] Slice: Start=${seekSeconds || 0}s, Duration=${durationSeconds || 'Full'}s`);
                }
            })
            .on('error', (err) => {
                console.error('[AudioExtractor] FFmpeg/yt-dlp Error:', err.message);
                if (ytdlpError) console.error('[AudioExtractor] yt-dlp stderr:', ytdlpError);
                reject(new Error(`Extraction failed: ${err.message}${ytdlpError ? ' | ' + ytdlpError : ''}`));
            })
            .on('end', () => {
                console.log('[AudioExtractor] Extraction complete:', tempFilePath);
                resolve({
                    filePath: tempFilePath,
                    cleanup: () => {
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                            console.log('[AudioExtractor] Cleaned up temp file:', tempFilePath);
                        }
                    },
                });
            });

        ffmpegProcess.save(tempFilePath);

        ytdlp.on('close', (code) => {
            if (code !== 0 && code !== null) {
                console.warn(`[AudioExtractor] yt-dlp process exited with non-zero code: ${code}`);
            }
        });
    });
}

/**
 * Extract multiple audio samples in parallel.
 * Max concurrency: 5
 */
export async function extractAudioSamples(
    videoId: string,
    intervals: SampleInterval[]
): Promise<AudioExtractionResult[]> {
    console.log(`[AudioExtractor] Extracting ${intervals.length} samples in parallel for ${videoId}`);

    const results: AudioExtractionResult[] = [];
    const concurrencyLimit = 5;

    for (let i = 0; i < intervals.length; i += concurrencyLimit) {
        const batch = intervals.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(interval => extractAudio(videoId, interval.start, interval.duration));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        console.log(`[AudioExtractor] Batch complete, total extracted: ${results.length}/${intervals.length}`);
    }

    return results;
}
/**
 * Get video duration in seconds using yt-dlp
 */
export async function getVideoDuration(videoId: string): Promise<number> {
    // Primary method: youtubei.js (much faster, no process spawn)
    try {
        console.log(`[youtubei.js] Fetching duration for ${videoId}`);
        const yt = await Innertube.create();
        const video = await yt.getInfo(videoId);
        const duration = video.basic_info.duration;
        if (duration && duration > 0) {
            console.log(`[youtubei.js] Success: ${duration}s`);
            return duration;
        }
    } catch (e) {
        console.warn(`[youtubei.js] Failed to fetch duration: ${e instanceof Error ? e.message : String(e)}. Falling back to yt-dlp.`);
    }

    // Fallback: yt-dlp
    return new Promise((resolve, reject) => {
        const projectRoot = process.cwd();
        const isLinux = process.platform === 'linux';
        const binaryName = isLinux ? 'yt-dlp-linux' : 'yt-dlp';
        const YTDLP_PATH = path.join(projectRoot, 'bin', binaryName);
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Find ffmpeg path for yt-dlp
        const RELATIVE_FFMPEG_PATH = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg');
        let resolvedPath = RELATIVE_FFMPEG_PATH;
        if (!fs.existsSync(resolvedPath)) {
            resolvedPath = ffmpegStatic || 'ffmpeg';
        }

        const isVercel = process.env.VERCEL === '1';

        console.log(`[yt-dlp-duration] Platform: ${process.platform}, Vercel: ${isVercel}, Binary: ${binaryName}`);

        const timeout = setTimeout(() => {
            ytdlp.kill();
            reject(new Error(`Video duration check timed out after 120 seconds. Platform: ${process.platform}`));
        }, 120000);

        const ytdlp = spawn(YTDLP_PATH, [
            '--print', 'duration',
            '--no-playlist',
            '--no-check-certificate',
            '--no-warnings',
            '--ignore-config',
            '--ffmpeg-location', resolvedPath,
            '--no-cache-dir',
            '--cache-dir', '/tmp/yt-dlp-cache',
            '--no-update', // Prevent hangs during self-update attempts
            youtubeUrl
        ]);

        let output = '';
        let errorOutput = '';

        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
            // Log for visibility
            const msg = data.toString().trim();
            if (msg) console.log(`[yt-dlp-duration] ${msg}`);
        });

        ytdlp.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                const duration = parseInt(output.trim());
                if (!isNaN(duration)) {
                    resolve(duration);
                } else {
                    reject(new Error(`Failed to parse video duration. Output: ${output.trim()} | Stderr: ${errorOutput.trim()}`));
                }
            } else {
                reject(new Error(`yt-dlp duration check failed with code ${code}. Stderr: ${errorOutput.trim()}`));
            }
        });
    });
}
