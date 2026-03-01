import { GeminiClient } from './integrations/ai/GeminiClient.js';
import { geminiPool } from './utils/gemini.js';
import { connectDB } from './utils/db.js';
import dotenv from 'dotenv';

import { Logger } from './utils/Logger.js';

dotenv.config();

async function testGeminiClient() {
    Logger.info('--- Testing GeminiClient ---');
    
    try {
        await connectDB();
        
        const client = new GeminiClient({}); // Should auto-resolve credentials
        
        // 1. Text Generation with Grounding
        Logger.info('\n[1] Testing Text Generation + Grounding...');
        const textResult = await client.generateContent('Who won the latest Super Bowl?', 'gemini-2.0-flash', {
            grounding: true
        });
        Logger.info('Response:', textResult.text.substring(0, 100) + '...');
        if ('usage' in textResult) {
            Logger.info('Usage:', textResult.usage);
        }

        // 2. TTS Voice List
        Logger.info('\n[2] Testing Voice List...');
        const voices = await client.listVoices();
        Logger.info(`Found ${voices.length} voices.`);
        Logger.info('Sample voices:', voices.slice(0, 3).map(v => v.name).join(', '));

        // 3. Audio Generation (Puck)
        Logger.info('\n[3] Testing Audio Generation (Puck)...');
        const audioResult = await client.generateAudio('Hello, this is a test of the unified Gemini client.', 'Puck');
        Logger.info('Audio Result:', audioResult.mimeType, audioResult.url.substring(0, 50) + '...');

        Logger.info('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        Logger.error('Verification Failed:', error);
        process.exit(1);
    }
}

testGeminiClient();
