import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { configService } from '../../utils/configService.js';
import { systemLogger } from '../../utils/systemLogger.js';

export interface ChatMessage {
    user: string;
    text: string;
    timestamp: Date;
    isModerated: boolean;
}

/**
 * Service for autonomous audience interaction and community management.
 */
export class CommunityAgent {
    private ai: any;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || process.env.GEMINI_API_KEY || '';
        this.ai = genkit({
            plugins: [googleAI({ apiKey })]
        });
    }

    /**
     * Processes an incoming chat message and generates an autonomous response.
     */
    public async handleMessage(projectId: string, message: ChatMessage) {
        systemLogger.info(`💬 [CommunityAgent] Processing message from ${message.user}: ${message.text}`, 'CommunityAgent');

        try {
            const response = await this.ai.generate({
                model: 'googleai/gemini-1.5-flash',
                prompt: `
                    USER: ${message.user}
                    MESSAGE: ${message.text}
                    
                    You are a helpful, witty, and energetic stream moderator for AntStudio.
                    Respond to this message. Keep it under 100 characters.
                `
            });

            return {
                user: "AntBot",
                text: response.text,
                shouldSpeak: true
            };
        } catch (error: any) {
            console.error('[CommunityAgent] Interaction failed:', error.message);
            return null;
        }
    }

    public async analyzeSentiment(messages: string[]) {
        return { score: 0.85, status: 'positive' };
    }
}

export const communityAgent = new CommunityAgent();
