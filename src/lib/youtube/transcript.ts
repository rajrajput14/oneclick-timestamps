import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Fetch YouTube video transcript
 * Uses youtube-transcript library to get captions
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<{
    transcript: string;
    timestampedTranscript: Array<{ time: number; text: string }>;
} | null> {
    try {
        console.log('Fetching transcript for video ID:', videoId);

        // Fetch transcript using youtube-transcript library
        const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

        console.log('Transcript data received:', transcriptData ? `${transcriptData.length} segments` : 'null');

        if (!transcriptData || transcriptData.length === 0) {
            console.log('No transcript data available');
            return null;
        }

        // Format transcript with timestamps
        const timestampedTranscript = transcriptData.map((item) => ({
            time: Math.floor(item.offset / 1000), // Convert ms to seconds
            text: item.text.replace(/\n/g, ' ').trim(),
        }));

        // Create plain text transcript
        const transcript = timestampedTranscript
            .map((item) => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log('Transcript generated successfully, length:', transcript.length);

        return {
            transcript,
            timestampedTranscript,
        };
    } catch (error) {
        console.error('Error fetching YouTube transcript:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        return null;
    }
}

/**
 * Format seconds to YouTube timestamp format (MM:SS or HH:MM:SS)
 */
export function formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
