import { InfluencerService } from '../streaming/InfluencerService.js';
import { Logger } from '../../utils/Logger.js';
import { buildGuestSystemPrompt, buildGuestNormalizePrompt } from '../../utils/PromptBuilder.js';
import { generateJSON } from '../../utils/AIGenerator.js';

export class AIGuestService {
    constructor() {}

    /**
     * Generate a personality-driven response for a Influencer guest.
     */
    async generateGuestDialogue(userId: string, entityId: string, userPrompt: string, context?: { vibe?: string, vision?: string, voiceConfig?: any }): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string, action?: string, actionPayload?: any }> {
        return this.generateResponse(userId, entityId, {
            type: 'dialogue',
            content: userPrompt,
            context
        });
    }

    /**
     * Generate a reaction to a chat message
     */
    async generateChatReaction(userId: string, entityId: string, userName: string, message: string): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string, action?: string, actionPayload?: any }> {
        return this.generateResponse(userId, entityId, {
            type: 'chat',
            userName,
            content: message
        });
    }

    /**
     * Generate a reaction to a gift/donation
     */
    async generateGiftReaction(userId: string, entityId: string, userName: string, giftName: string, amount?: number): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string, action?: string, actionPayload?: any }> {
        return this.generateResponse(userId, entityId, {
            type: 'gift',
            userName,
            content: `Sent ${giftName}${amount ? ` worth ${amount} credits` : ''}`
        });
    }

    /**
     * Generate a reaction to a poll result
     */
    async generatePollReaction(userId: string, entityId: string, question: string, winner: string): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string, action?: string, actionPayload?: any }> {
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
    }): Promise<{ text: string, emotion: string, gesture: string, audioUrl?: string, action?: string, actionPayload?: any }> {
        // 1. Fetch Influencer (Identity & Memory)
        const influencer = await InfluencerService.getOrCreateInfluencer(userId, entityId, 'Unknown Influencer');

        // 2. Build Contextual System Prompt
        const keywords = input.content.split(' ').filter(w => w.length > 4);
        const flashbacks = await InfluencerService.getRelevantMemories(userId, entityId, keywords);

        const systemPrompt = await buildGuestSystemPrompt({
            influencer,
            input,
            flashbacks
        });

        const systemInstruction = input.content;

        // 3. Generate structured response via AIGenerator
        Logger.info(`[AI/Guest] Generating response for ${influencer.identity.name}. Input: ${input.type}`);
        
        try {
            const result = await generateJSON(systemInstruction, undefined, { 
                systemPrompt
            });
            
            Logger.info(`[AI/Guest] JSON Result for ${influencer.identity.name}:`, JSON.stringify(result));
            
            // Robust parsing with fallbacks
            let { text, emotion, gesture, action, actionPayload } = result;
            if (!text) {
                text = result.response || result.dialogue || result.content || result.message || result[influencer.identity.name];
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
                    Logger.error('[AI/Guest] TTS Synthesis failed during consolidated call:', ttsError);
                }
            }

            // 5. Archive this interaction and record history
            await InfluencerService.archiveEvent(userId, entityId, 'studio_interaction', `[${input.type}] Responded [${emotion}/${gesture}]: "${text.substring(0, 30)}..."`);
            
            if (input.type !== 'dialogue') {
                 await InfluencerService.recordInteraction(userId, entityId, {
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
                const knownTargets = influencer.social?.relationships.map(r => r.targetName) || [];
                const target = knownTargets.find(t => input.content.includes(t)) || 'Host';
                await InfluencerService.updateSocialRelationship(userId, entityId, target, bondDelta);
            }

            return { text, emotion, gesture, audioUrl, action, actionPayload };
        } catch (error: any) {
            Logger.error(`[AI/Guest] Generation failed for ${influencer.identity.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Normalize a raw text response from the Live API into structured JSON
     */
    async normalizeLiveResponse(text: string, context?: { vibe?: string }): Promise<{ text: string, emotion: string, gesture: string, action?: string, actionPayload?: any }> {
        const systemPrompt = await buildGuestNormalizePrompt({ text, vibe: context?.vibe });

        try {
            Logger.info('[AI/Guest] Normalizing Live Response:', text);
            const result = await generateJSON(text, undefined, { 
                systemPrompt
            });
            
            return {
                text, 
                emotion: result.emotion || 'neutral',
                gesture: result.gesture || 'normal',
                action: result.action,
                actionPayload: result.actionPayload
            };
        } catch (error) {
            Logger.error('[AI/Guest] Normalization failed, returning defaults:', error);
            return { text, emotion: 'neutral', gesture: 'normal' };
        }
    }
}

export const aiGuestService = new AIGuestService();
