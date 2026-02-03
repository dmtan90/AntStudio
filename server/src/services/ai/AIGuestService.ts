import { GeminiChatProvider } from '../../utils/ai/providers/GeminiChatProvider.js';
import { NeuralArchiveService } from '../NeuralArchiveService.js';

export class AIGuestService {
    private gemini: GeminiChatProvider;

    constructor() {
        this.gemini = new GeminiChatProvider();
    }

    /**
     * Generate a personality-driven response for an AI guest.
     */
    async generateGuestDialogue(userId: string, entityId: string, userPrompt: string): Promise<{ text: string }> {
        // 1. Fetch AI Soul (Identity & Memory)
        const soul = await NeuralArchiveService.getOrCreateArchive(userId, entityId, 'Unknown AI');

        // 2. Build Contextual System Prompt
        const systemPrompt = `You are ${soul.identity.name}. 
Identity Description: ${soul.identity.description}
Traits: ${soul.identity.traits.join(', ')}

STRATEGIC DIRECTIVE:
- Stay in character at all times.
- Your goal is to be a professional 3D AI guest in a live studio.
- Keep responses concise (under 250 characters) to maintain studio pace.
- Use your Tactical Memory to inform your response.

TACTICAL MEMORY (Recent Events):
${soul.memory.keyEvents.slice(-5).map(e => `- ${e.description} (${new Date(e.date).toLocaleDateString()})`).join('\n')}

COGNITIVE COMPRESSION (History Summary):
${soul.memory.summaries.slice(-1)[0] || 'No summary available.'}
`;

        // 3. Generate response via Gemini
        const result = await this.gemini.generateText(userPrompt, 'gemini-1.5-flash', { systemPrompt });
        const responseText = result.text.trim();

        // 4. Archive this interaction as a key event
        await NeuralArchiveService.archiveEvent(userId, entityId, 'studio_interaction', `Responded to user: "${userPrompt.substring(0, 30)}..." with "${responseText.substring(0, 30)}..."`);

        return { text: responseText };
    }
}

export const aiGuestService = new AIGuestService();
