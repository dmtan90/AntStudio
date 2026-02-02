import { AIServiceManager, aiManager } from './utils/ai/AIServiceManager.js';

async function testFix() {
    console.log('Testing AI Service Manager fix...');

    const manager = AIServiceManager.getInstance();

    // Mock a Genkit provider
    const mockProvider = {
        generate: async (args: any) => {
            console.log('Provider.generate called with args:', JSON.stringify(args, null, 2));
            return { text: 'Test response' };
        }
    };

    // Manually inject the mock provider
    // Note: This is an internal detail, but for testing we can use any
    (manager as any).getProvider = async () => mockProvider;

    const prompt = 'Hello';
    const options = {
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.5
    };

    try {
        console.log('Executing generateText with options containing systemPrompt...');
        // We force providerId to 'google' to trigger the specific logic block
        await (manager as any).resolveProvider = async () => ({
            provider: mockProvider,
            providerId: 'google',
            modelId: 'gemini-1.5-flash'
        });

        const result = await manager.generateText(prompt, 'gemini-1.5-flash', 'google', options);
        console.log('Result:', result);
        console.log('✅ Test PASSED: If the "Provider.generate called with args" log above shows systemInstruction outside config and no systemPrompt inside config.');
    } catch (error) {
        console.error('❌ Test FAILED:', error);
    }
}

testFix();
