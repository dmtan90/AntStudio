import puter from '@heyputer/puter.js';

export class PuterService {
    private static instance: PuterService;

    private constructor() { }

    public static getInstance(): PuterService {
        if (!PuterService.instance) {
            PuterService.instance = new PuterService();
        }
        return PuterService.instance;
    }

    /**
     * Chat using Puter's LLM
     */
    async chat(prompt: string, model: string = 'gpt-4o-mini', options: any = {}) {
        try {
            console.log(`[PuterService] Calling Puter Chat (${model})...`);
            const response = await puter.ai.chat(prompt, { model });
            return response;
        } catch (error: any) {
            console.error('[PuterService] Chat Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate an image using Puter (Flux or DALL-E)
     */
    async generateImage(prompt: string) {
        try {
            console.log(`[PuterService] Calling Puter Image Generation...`);
            const response = await puter.ai.txt2img(prompt);
            return response;
        } catch (error: any) {
            console.error('[PuterService] Image Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate speech from text using Puter
     */
    async tts(text: string) {
        try {
            console.log(`[PuterService] Calling Puter TTS...`);
            const response = await puter.ai.txt2speech(text);
            return response;
        } catch (error: any) {
            console.error('[PuterService] TTS Error:', error.message);
            throw error;
        }
    }
}

export const puterService = PuterService.getInstance();
