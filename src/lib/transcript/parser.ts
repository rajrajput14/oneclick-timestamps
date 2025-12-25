import { parse as parseSRT } from 'subsrt';

export interface TranscriptSegment {
    time: number; // seconds
    text: string;
}

/**
 * Parse SRT subtitle file
 */
export function parseSRTFile(content: string): TranscriptSegment[] {
    try {
        const parsed = parseSRT(content);

        return parsed.map((item: any) => ({
            time: Math.floor(item.start / 1000), // Convert ms to seconds
            text: item.text.replace(/\n/g, ' ').trim(),
        }));
    } catch (error) {
        console.error('Error parsing SRT file:', error);
        throw new Error('Invalid SRT file format');
    }
}

/**
 * Parse VTT subtitle file
 */
export function parseVTTFile(content: string): TranscriptSegment[] {
    try {
        // Remove WEBVTT header
        const lines = content.replace(/^WEBVTT\n\n/, '').split('\n');
        const segments: TranscriptSegment[] = [];

        let currentTime = 0;
        let currentText = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and cue identifiers
            if (!line || /^\d+$/.test(line)) continue;

            // Parse timestamp line (00:00:00.000 --> 00:00:05.000)
            if (line.includes('-->')) {
                const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})/);
                if (timeMatch) {
                    currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
                }
            } else {
                // Text line
                currentText += (currentText ? ' ' : '') + line;

                // Check if next line is empty or timestamp (end of cue)
                if (i + 1 >= lines.length || !lines[i + 1].trim() || lines[i + 1].includes('-->')) {
                    if (currentText) {
                        segments.push({
                            time: currentTime,
                            text: currentText.trim(),
                        });
                        currentText = '';
                    }
                }
            }
        }

        return segments;
    } catch (error) {
        console.error('Error parsing VTT file:', error);
        throw new Error('Invalid VTT file format');
    }
}

/**
 * Parse plain text file (no timestamps)
 */
export function parseTXTFile(content: string): TranscriptSegment[] {
    // For plain text, we create a single segment at time 0
    return [{
        time: 0,
        text: content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
    }];
}

/**
 * Auto-detect and parse transcript file
 */
export function parseTranscriptFile(content: string, filename: string): TranscriptSegment[] {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'srt':
            return parseSRTFile(content);
        case 'vtt':
            return parseVTTFile(content);
        case 'txt':
            return parseTXTFile(content);
        default:
            throw new Error('Unsupported file format. Please upload TXT, SRT, or VTT file.');
    }
}

/**
 * Convert transcript segments to plain text
 */
export function segmentsToText(segments: TranscriptSegment[]): string {
    return segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
}
