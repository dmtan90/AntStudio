import { GeminiClient } from '../../integrations/ai/GeminiClient.js';
import { VTuberService } from '../VTuberService.js';

export class AIGuestService {
    private gemini: GeminiClient;

    constructor() {
        this.gemini = new GeminiClient({});
    }

    /**
     * Generate a personality-driven response for a VTuber guest.
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
  "action": "perform_song" | "stop_performance" | "switch_scene" | "show_overlay" | "trigger_product" | "none",
  "actionPayload": {
    "songName": "String (required for perform_song)",
    "artist": "String (optional)",
    "lyricsLanguage": "vi" | "en" | "ja" | "ko",
    "style": "bounce" | "slide" | "fade" | "scale",
    "position": "top" | "center" | "bottom"
  }
}

STRATEGIC DIRECTIVE:
- When asked to sing or play music:
  1. If a specific song name is provided, ACKNOWLEDGE IT (e.g., "Sure, I'll sing [Song] for you!") in the 'text' field AND use 'perform_song'.
  2. If NO song name is provided, DO NOT use 'perform_song'. Instead, ASK the user/host which song they would like to hear.
- PROTOCOL RELIABILITY: 
  * Respond ONLY with natural character dialogue in the 'text' field.
  * NEVER include internal reasoning, setup thoughts, or headers like "**Confirming Song Choice**". 
  * The user must never see your internal decision-making process.
- Use 'stop_performance' if specifically asked to stop.
- Stay in character at all times.
${vtuber.memory.keyEvents.slice(-5).map(e => `- ${e.description} (${new Date(e.date).toLocaleDateString()})`).join('\n')}

COGNITIVE COMPRESSION (History Summary):
${vtuber.memory.summaries.slice(-1)[0] || 'No summary available.'}

CRITICAL: YOU MUST RESPOND WITH DATA ONLY. DO NOT INCLUDE ANY PREAMBLE, HEADERS, OR MARKDOWN OUTSIDE THE JSON.
If you are performing an action, set the "action" and "actionPayload" fields and speak the acknowledgment in "text".
DO NOT say "I'm preparing to use the tool". JUST USE IT IMMEDIATELY.
`;

        // 3. Generate structured response via Gemini
        console.log(`[AI/Guest] Generating response for ${vtuber.identity.name}. Input: ${input.type}`);
        
        try {
            const rawResult = await this.gemini.generateContent(systemInstruction, 'gemini-2.5-flash', { 
                systemPrompt,
                generationConfig: { responseMimeType: "application/json" }
            });
            let result: any = {};
            try { result = JSON.parse(rawResult.text); } catch (e) {}
            console.log(`[AI/Guest] RAW JSON Result for ${vtuber.identity.name}:`, JSON.stringify(result));
            
            // Robust parsing with fallbacks
            let { text, emotion, gesture, action, actionPayload } = result;
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

            return { text, emotion, gesture, audioUrl, action, actionPayload };
        } catch (error: any) {
            console.error(`[AI/Guest] Generation failed for ${vtuber.identity.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Normalize a raw text response from the Live API into structured JSON
     */
    async normalizeLiveResponse(text: string, context?: { vibe?: string }): Promise<{ text: string, emotion: string, gesture: string, action?: string, actionPayload?: any }> {
        const systemPrompt = `You are a Live Director AI. Your job is to analyze the spoken text from a VTuber and extract the implied emotion, gesture, and actionable intent.
        
        INPUT TEXT: "${text}"
        CONTEXT VIBE: ${context?.vibe || 'Neutral'}

        OUTPUT FORMAT (JSON):
        {
            "emotion": "joy" | "neutral" | "sorrow" | "anger" | "surprise",
            "gesture": "normal" | "point_left" | "point_right" | "wave" | "nod" | "shake_head",
            "action": "perform_song" | "stop_performance" | "none",
            "actionPayload": {
                "songName": "Name of the song",
                "artist": "Optional artist name",
                "lyricsLanguage": "vi" | "en" | "ja" | "ko" (infer from song title or context)
            }
        }
        
        RULES:
        - ACTION DETECTION:
            1. If the text mentions singing, performing, or starting a song (e.g., "I'll sing [Song]", "Starting [Song]", "Performing [Song]"), set action="perform_song".
            2. Extract the song name accurately from quotes or context.
            3. Infer lyricsLanguage: "vi" for Vietnamese titles, "en" for English, etc.
        - If the text mentions stopping or ending the music, set action="stop_performance".
        - If no clear musical action, set action="none".
        - Infer emotion/gesture from the content.
        - Respond ONLY with the JSON object.
        `;

        try {
            console.log('[AI/Guest] Normalizing Live Response:', text);
            const rawResult = await this.gemini.generateContent(text, 'gemini-2.5-flash', { 
                systemPrompt,
                generationConfig: { responseMimeType: "application/json" }
            });
            let result: any = {};
            try { result = JSON.parse(rawResult.text); } catch (e) {}
            
            return {
                text, // Return original text to preserve speech timing
                emotion: result.emotion || 'neutral',
                gesture: result.gesture || 'normal',
                action: result.action,
                actionPayload: result.actionPayload
            };
        } catch (error) {
            console.error('[AI/Guest] Normalization failed, returning defaults:', error);
            return { text, emotion: 'neutral', gesture: 'normal' };
        }
    }
}

export const aiGuestService = new AIGuestService();
