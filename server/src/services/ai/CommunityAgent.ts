import { generateText, generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../PromptService.js';


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
    constructor() {}

    /**
     * Processes an incoming chat message and generates an autonomous response.
     */
    public async handleMessage(message: string, history: any[], projectContext: string) {
        try {
            const prompt = await promptService.get('ai/community_agent', {
                projectContext,
                message,
                history: JSON.stringify(history)
            });

            return await generateText(prompt);
        } catch (error: any) {
            Logger.error('[CommunityAgent] Message handling failed:', error.message);
            return "I'm sorry, I'm having trouble responding right now.";
        }
    }

    /**
     * Analyzes sentiment from a collection of audience messages.
     */
    public async analyzeAudienceSentiment(messages: string[]) {
        try {
            const prompt = await promptService.get('ai/sentiment', {
                comments: messages.join('\n')
            });
            return await generateJSON(prompt);
        } catch (error: any) {
            Logger.error('[CommunityAgent] Sentiment analysis failed:', error.message);
            return { sentiment: 0, label: 'neutral' };
        }
    }
}

export const communityAgent = new CommunityAgent();
