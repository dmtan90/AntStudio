import { GeminiChatProvider } from '../../utils/ai/providers/GeminiChatProvider.js';
import { VTuberService } from '../VTuberService.js';

export class AIGuestService {
    private gemini: GeminiChatProvider;

    constructor() {
        this.gemini = new GeminiChatProvider();
    }

    /**
     * Generate a personality-driven response for a VTuber guest.
     */
    async generateGuestDialogue(userId: string, entityId: string, userPrompt: string, context?: { vibe?: string, vision?: string, voiceConfig?: any }): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string }> {
        return this.generateResponse(userId, entityId, {
            type: 'dialogue',
            content: userPrompt,
            context
        });
    }

    /**
     * Generate a reaction to a chat message
     */
    async generateChatReaction(userId: string, entityId: string, userName: string, message: string): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string }> {
        return this.generateResponse(userId, entityId, {
            type: 'chat',
            userName,
            content: message
        });
    }

    /**
     * Generate a reaction to a gift/donation
     */
    async generateGiftReaction(userId: string, entityId: string, userName: string, giftName: string, amount?: number): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string }> {
        return this.generateResponse(userId, entityId, {
            type: 'gift',
            userName,
            content: `Sent ${giftName}${amount ? ` worth ${amount} credits` : ''}`
        });
    }

    /**
     * Generate a reaction to a poll result
     */
    async generatePollReaction(userId: string, entityId: string, question: string, winner: string): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string }> {
         return this.generateResponse(userId, entityId, {
            type: 'poll',
            content: `Poll Results: Question: "${question}" - Winner: "${winner}"`
        });
    }

    /**
     * Unified response generator
     */
    private async generateResponse(userId: string, entityId: string, input: {
        type: 'dialogue' | 'chat' | 'gift' | 'poll';
        userName?: string;
        content: string;
        context?: { 
            vibe?: string, 
            vision?: string,
            voiceConfig?: {
                provider?: string;
                voiceId?: string;
                language?: string;
            }
        };
    }): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string }> {
        // 1. Fetch VTuber (Identity & Memory)
        // Ensure entityId is treated as a potential UUID or EntityID
        const vtuber = await VTuberService.getOrCreateVTuber(userId, entityId, 'Unknown VTuber');

        // 2. Build Contextual System Prompt
        const keywords = input.content.split(' ').filter(w => w.length > 4);
        const flashbacks = await VTuberService.getRelevantMemories(userId, entityId, keywords);

        let systemInstruction = '';
        
        switch (input.type) {
            case 'chat':
                systemInstruction = `A viewer named ${input.userName} said: "${input.content}". Reply directly to them. Be concise and engaging.`;
                break;
            case 'gift':
                systemInstruction = `A viewer named ${input.userName} sent a gift: ${input.content}. Express gratitude and excitement! High energy!`;
                break;
            case 'poll':
                systemInstruction = `React to the poll results: ${input.content}. Share your opinion on the winner.`;
                break;
            case 'dialogue':
                systemInstruction = input.content;
                if (input.context?.vibe) systemInstruction += ` [Vibe: ${input.context.vibe}]`;
                if (input.context?.vision) systemInstruction += ` [Visual: ${input.context.vision}]`;
                break;
        }

        const systemPrompt = `You are ${vtuber.identity.name}. 
Identity Description: ${vtuber.identity.description}
Traits: ${vtuber.identity.traits.join(', ')}

STRATEGIC DIRECTIVE:
- Stay in character at all times.
- Your goal is to be a professional VTuber participant (Host or Guest) in a live studio.
- Keep responses concise (under 250 characters) to maintain studio pace.
- Use your Tactical Memory to inform your response.

SOCIAL CONNECTIVITY:
${vtuber.social?.relationships.map(r => `- ${r.targetName} (${r.type}): Level ${r.level}/100 - ${r.description || 'No specific bond details'}`).join('\n') || 'No established relationships.'}

ENVIRONMENTAL AWARENESS:
- Studio Vibe: ${input.context?.vibe || 'Neutral'}
- Visual Context: ${input.context?.vision || 'Normal room setup'}

${flashbacks.length > 0 ? `CONTEXTUAL FLASHBACKS (Long-term Memory):
${flashbacks.map(f => `- ${f}`).join('\n')}` : ''}

CURRENT INTERACTION:
${systemInstruction}

OUTPUT FORMAT (JSON):
{
  "text": "Your spoken dialogue here",
  "emotion": "joy" | "neutral" | "sorrow" | "anger" | "surprise",
  "gesture": "normal" | "point_left" | "point_right" | "wave" | "nod" | "shake_head",
  "action": "Optional: switch_scene, show_overlay, trigger_product, none",
  "actionPayload": "Optional: payload for the action (e.g., scene id or product id)"
}

TACTICAL MEMORY (Recent Events):
${vtuber.memory.keyEvents.slice(-5).map(e => `- ${e.description} (${new Date(e.date).toLocaleDateString()})`).join('\n')}

COGNITIVE COMPRESSION (History Summary):
${vtuber.memory.summaries.slice(-1)[0] || 'No summary available.'}
`;

        // 3. Generate structured response via Gemini
        console.log(`[AI/Guest] Generating response for ${vtuber.identity.name}. Input: ${input.type}`);
        
        try {
            const result = await this.gemini.generateJson(systemInstruction, 'gemini-2.5-flash', { systemPrompt });
            
            // Robust parsing with fallbacks
            let { text, emotion, gesture } = result;
            if (!text) {
                text = result.response || result.dialogue || result.content || result.message || result[vtuber.identity.name];
                if (!text) {
                     const firstString = Object.values(result).find(v => typeof v === 'string' && v.length > 0);
                     if (firstString) text = firstString as string;
                }
                if (!text) text = "...";
            }
            if (!emotion) emotion = 'neutral';
            if (!gesture) gesture = 'normal';

            // 4. Integrated TTS Synthesis
            let audioUrl: string | undefined = undefined;
            if (input.context?.voiceConfig) {
                try {
                    const { ttsService } = await import('./TTSService.js');
                    const ttsResult = await ttsService.generateSpeech({
                        text,
                        provider: input.context.voiceConfig.provider || 'google',
                        voiceId: input.context.voiceConfig.voiceId || 'en-US-Standard-A',
                        language: input.context.voiceConfig.language || 'en-US'
                    });
                    audioUrl = ttsResult.media.url;
                } catch (ttsError) {
                    console.error('[AI/Guest] TTS Synthesis failed during consolidated call:', ttsError);
                }
            }

            // 5. Archive this interaction and record history
            await VTuberService.archiveEvent(userId, entityId, 'studio_interaction', `[${input.type}] Responded [${emotion}/${gesture}]: "${text.substring(0, 30)}..."`);
            
            if (input.type !== 'dialogue') {
                 await VTuberService.recordInteraction(userId, entityId, {
                    type: input.type as any,
                    userName: input.userName || 'System',
                    content: input.content,
                    response: text,
                    sentiment: emotion === 'joy' ? 100 : (emotion === 'anger' ? 0 : 50)
                });
            }

            // 6. Relationship Evolution
            let bondDelta = 0;
            if (emotion === 'joy') bondDelta = 2;
            else if (emotion === 'anger' || emotion === 'sorrow') bondDelta = -2;

            if (bondDelta !== 0) {
                const knownTargets = vtuber.social?.relationships.map(r => r.targetName) || [];
                const target = knownTargets.find(t => input.content.includes(t)) || 'Host';
                await VTuberService.updateSocialRelationship(userId, entityId, target, bondDelta);
            }

            return { text, emotion, gesture, audioUrl };
        } catch (error: any) {
            console.error(`[AI/Guest] Generation failed for ${vtuber.identity.name}:`, error.message);
            throw error;
        }
    }
}

export const aiGuestService = new AIGuestService();
