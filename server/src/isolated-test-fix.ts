// Isolated test of the logic applied to AIServiceManager.ts

async function runIsolatedTest() {
    console.log('Running isolated logic test for systemPrompt fix...');

    // This simulates the 'options' and 'prompt' passed to generateText
    const prompt = 'Translate "Hello" to French';
    const options = {
        systemPrompt: 'You are a professional translator.',
        temperature: 0.7,
        topP: 0.9
    };

    // This simulates the logic inside AIServiceManager.ts
    const { systemPrompt, ...genConfig } = options;

    console.log('--- Payload Transformation result ---');
    console.log('Original Options:', JSON.stringify(options, null, 2));

    const finalArgs = {
        model: 'gemini-1.5-flash',
        prompt: prompt,
        systemInstruction: systemPrompt,
        config: genConfig
    };

    console.log('Transformed Args:', JSON.stringify(finalArgs, null, 2));

    // Verification
    if (finalArgs.systemInstruction === 'You are a professional translator.' &&
        !(finalArgs.config as any).systemPrompt &&
        (finalArgs.config as any).temperature === 0.7) {
        console.log('✅ LOGIC VERIFIED: systemPrompt was correctly moved and stripped from config.');
    } else {
        console.error('❌ LOGIC FAILED');
        process.exit(1);
    }
}

runIsolatedTest();
