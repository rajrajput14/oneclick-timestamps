/**
 * Validates if a string is a valid YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
    if (!url) return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
    return youtubeRegex.test(url);
}

/**
 * Extracts the video ID from a YouTube URL.
 */
export function getYouTubeVideoId(url: string): string | null {
    const match = url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/);
    return match ? match[5] : null;
}
