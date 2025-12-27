import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

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
    // Path to the local binary we downloaded
    const YTDLP_PATH = path.join(projectRoot, 'bin', 'yt-dlp');
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
            '--no-interactive',
            '--no-cache-dir',
            '--cache-dir', '/tmp/yt-dlp-cache',
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
 * Get video duration in seconds using yt-dlp
 */
export async function getVideoDuration(videoId: string): Promise<number> {
    const projectRoot = process.cwd();
    const YTDLP_PATH = path.join(projectRoot, 'bin', 'yt-dlp');
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ytdlp.kill();
            reject(new Error('Video duration check timed out after 30 seconds'));
        }, 30000);

        const ytdlp = spawn(YTDLP_PATH, [
            '--print', 'duration',
            '--no-playlist',
            '--no-interactive',
            '--no-check-certificate',
            '--no-cache-dir',
            '--cache-dir', '/tmp/yt-dlp-cache',
            youtubeUrl
        ]);

        let output = '';
        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytdlp.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                const duration = parseInt(output.trim());
                if (!isNaN(duration)) {
                    resolve(duration);
                } else {
                    reject(new Error('Failed to parse video duration'));
                }
            } else {
                reject(new Error(`yt-dlp duration check failed with code ${code}`));
            }
        });
    });
}
