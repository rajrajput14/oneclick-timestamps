export interface SampleInterval {
    start: number;
    duration: number;
}

/**
 * Calculate sampling intervals for a video.
 * MAX_SAMPLES = 15
 * Sample Duration = 40s
 */
export function getSampleIntervals(
    totalDuration: number,
    maxSamples: number = 15,
    sampleLength: number = 40
): SampleInterval[] {
    const intervals: SampleInterval[] = [];

    // If video is shorter than sampleLength * 2, just take one sample or handle differently?
    // User wants fast. For very short videos, we can just take few samples.

    let numSamples = maxSamples;

    // For short videos, reduce number of samples to avoid excessive overlapping
    if (totalDuration < 600) { // < 10 mins
        numSamples = Math.min(maxSamples, Math.ceil(totalDuration / 60));
    }

    const intervalStep = totalDuration / numSamples;

    for (let i = 0; i < numSamples; i++) {
        const start = i * intervalStep;
        // Ensure duration doesn't exceed the interval or the video end
        const actualDuration = Math.min(sampleLength, totalDuration - start);

        if (actualDuration > 5) { // Only take samples that are at least 5s long
            intervals.push({
                start: Math.floor(start),
                duration: Math.ceil(actualDuration)
            });
        }
    }

    return intervals;
}
