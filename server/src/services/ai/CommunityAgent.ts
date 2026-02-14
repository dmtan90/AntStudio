import { geminiPool } from '../../utils/gemini.js';
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
    constructor() {}

    /**
     * Processes an incoming chat message and generates an autonomous response.
     */
    public async handleMessage(projectId: string, message: ChatMessage) {
        systemLogger.info(`💬 [CommunityAgent] Processing message from ${message.user}: ${message.text}`, 'CommunityAgent');

        try {
            const modelName = 'gemini-2.5-flash';
            const { client: ai } = await geminiPool.getOptimalClient(modelName);

            const prompt = `
                USER: ${message.user}
                MESSAGE: ${message.text}
                
                You are a helpful, witty, and energetic stream moderator for AntStudio.
                Respond to this message. Keep it under 100 characters.
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });

            return {
                user: "AntBot",
                text: result.response.text(),
                shouldSpeak: true
            };
        } catch (error: any) {
            console.error('[CommunityAgent] Interaction failed:', error.message);
            return null;
        }
    }

    /**
     * Analyzes overall audience sentiment from a batch of messages.
     */
    public async analyzeAudienceSentiment(messages: string[]) {
        if (messages.length === 0) return { score: 0.5, status: 'neutral' };

        try {
            const modelName = 'gemini-2.5-flash';
            const { client: ai } = await geminiPool.getOptimalClient(modelName);

            const prompt = `
                Analyze the sentiment of the following stream chat messages:
                ${messages.join('\n')}
                
                Return JSON ONLY: { "score": 0-1, "status": "positive" | "negative" | "neutral", "summary": "One sentence summary" }
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });

            return JSON.parse(result.response.text());
        } catch (error: any) {
            console.error('[CommunityAgent] Sentiment analysis failed:', error.message);
            return { score: 0.5, status: 'neutral' };
        }
    }
}

export const communityAgent = new CommunityAgent();
