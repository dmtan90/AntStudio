import { GeminiClient } from './integrations/ai/GeminiClient.js';
import { geminiPool } from './utils/gemini.js';
import { connectDB } from './utils/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiClient() {
    console.log('--- Testing GeminiClient ---');
    
    try {
        await connectDB();
        
        const client = new GeminiClient({}); // Should auto-resolve credentials
        
        // 1. Text Generation with Grounding
        console.log('\n[1] Testing Text Generation + Grounding...');
        const textResult = await client.generateContent('Who won the latest Super Bowl?', 'gemini-2.0-flash', {
            grounding: true
        });
        console.log('Response:', textResult.text.substring(0, 100) + '...');
        if ('usage' in textResult) {
            console.log('Usage:', textResult.usage);
        }

        // 2. TTS Voice List
        console.log('\n[2] Testing Voice List...');
        const voices = await client.listVoices();
        console.log(`Found ${voices.length} voices.`);
        console.log('Sample voices:', voices.slice(0, 3).map(v => v.name).join(', '));

        // 3. Audio Generation (Puck)
        console.log('\n[3] Testing Audio Generation (Puck)...');
        const audioResult = await client.generateAudio('Hello, this is a test of the unified Gemini client.', 'Puck');
        console.log('Audio Result:', audioResult.mimeType, audioResult.url.substring(0, 50) + '...');

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

testGeminiClient();
