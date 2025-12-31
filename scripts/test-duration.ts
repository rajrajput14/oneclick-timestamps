import { getVideoDuration } from '../src/lib/youtube/audio-extractor';

async function testDuration() {
    const videoId = 'dQw4w9WgXcQ'; // Rick Astley for testing
    console.log(`Testing duration for video: ${videoId}`);
    try {
        const duration = await getVideoDuration(videoId);
        console.log(`✅ Success! Duration: ${duration} seconds`);
    } catch (error) {
        console.error(`❌ Failed:`, error);
    }
}

testDuration();
