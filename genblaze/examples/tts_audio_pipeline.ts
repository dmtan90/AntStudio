/**
 * TTS audio pipeline example.
 * 1:1 port of examples/tts_audio_pipeline.py
 */

import { OpenAITTSProvider } from '../libs/connectors/openai/genblaze_openai/index.js';

async function main() {
    console.log('🗣️ Running TTS Audio Pipeline Example...');
    const tts = new OpenAITTSProvider();
    console.log('OpenAI TTS initialized:', tts.name);
}

main().catch(console.error);
