import { GeminiClient } from '../../integrations/ai/GeminiClient.js';
import { audiencePredictor } from './AudiencePredictor.js';
import { aiPerformanceService } from './AIPerformanceService.js';
import { consensusService } from './ConsensusService.js';
import { VTuberService } from '../VTuberService.js';

export class AIProducerService {
    private gemini: GeminiClient;

    constructor() {
        this.gemini = new GeminiClient({});
    }

    /**
     * Generate "Director Notes" based on the current studio state.
     */
    async generateSuggestions(userId: string, studioState: {
        vibe: any,
        engagement: any,
        chatSummary: string,
        activeScene: string,
        projectId?: string,
        vtuberId?: string,
        vision?: string
    }): Promise<{ 
        title: string, 
        description: string, 
        priority: 'low' | 'medium' | 'high', 
        actionLabel?: string, 
        actionType?: string,
        boardFeedback?: string,
        consensus?: any
    }> {
        
        let predictiveContext = '';
        if (studioState.projectId) {
            const snapshots = aiPerformanceService.getSnapshots(studioState.projectId);
            const forecast = await audiencePredictor.forecastEngagement(studioState.projectId, snapshots);
            if (forecast && forecast.trend === 'drop' && forecast.confidence > 0.6) {
                predictiveContext = `[URGENT PREDICTION]: Audience engagement is FORECASTED TO DROP soon (Confidence: ${Math.round(forecast.confidence * 100)}%). Reason: ${forecast.reasoning}. PROPOSE A HYPE EVENT OR DEAL IMMEDIATELY.`;
            } else if (forecast && forecast.trend === 'rise') {
                predictiveContext = `[TREND ALERT]: Audience interest is peaking! Seize the moment for a call to action or showcase.`;
            }
        }

        let memoryContext = '';
        if (userId && studioState.vtuberId) {
            try {
                const memories = await VTuberService.getRelevantMemories(userId, studioState.vtuberId, ['engagement', 'vibe', 'scene', 'hype']);
                if (memories.length > 0) {
                    memoryContext = `HISTORICAL CONTEXT (Relevant memories from past sessions):\n${memories.map(m => `- ${m}`).join('\n')}`;
                }
            } catch (err) {
                console.warn('[AIProducer] Failed to fetch memories:', err);
            }
        }

        const systemPrompt = `
You are the AI Studio Producer for a live stream. Your goal is to monitor the studio health, engagement, and atmosphere, and give the human streamer "Director Notes" to improve the broadcast.

PREDICTIVE INTELLIGENCE:
${predictiveContext || 'Stable trends predicted.'}

${memoryContext || 'No relevant historical memories found.'}

CURRENT STUDIO STATE:
- Vibe: ${JSON.stringify(studioState.vibe)}
- Engagement: ${JSON.stringify(studioState.engagement)}
- Active Scene: ${studioState.activeScene}
- Visual Context: ${studioState.vision || 'Normal stage setup'}
- Chat Recent History: 
${studioState.chatSummary}

DIRECTIVES:
1. Be proactive but professional.
2. If engagement is low, suggest an interaction (Poll, Flash Sale, Question).
3. If the vibe is high (Hype), suggest a cinematic change (Scene switch, Effect).
4. If the streamer is missing a question in chat, highlight it.
5. Keep descriptions very short and punchy (under 20 words).

OUTPUT FORMAT (JSON):
{
  "title": "Actionable Title (e.g., 'Hype the Chat')",
  "description": "Short explanation (e.g., 'Viewers are asking about your gear. Start a poll about it!')",
  "priority": "low" | "medium" | "high",
  "actionLabel": "Optional button text (e.g., 'Start Poll')",
  "actionType": "Optional action trigger (e.g., 'start_poll', 'flash_sale', 'scene_switch')"
}
`;

        const userPrompt = "Analyze the studio state and provide the single most important Director Note right now.";

        try {
            const rawResult = await this.gemini.generateContent(userPrompt, 'gemini-2.5-flash', { 
                systemPrompt,
                generationConfig: { responseMimeType: "application/json" } 
            });
            let result: any = {};
            try { result = JSON.parse(rawResult.text); } catch(e) {}

            // Board Consensus for High-Priority Actions
            if (result.priority === 'high' && studioState.projectId) {
                const boardDecision = await consensusService.reachConsensus(studioState.projectId, `Producer suggests: ${result.title}. ${result.description}`);
                
                if (boardDecision.result === 'rejected') {
                    return {
                        title: "AI Board Feedback",
                        description: "The AI Board rejected the previous proposal. Creative and Technical alignment needed.",
                        priority: "low",
                        boardFeedback: boardDecision.debrief
                    };
                }
                
                result.title = `[Board Approved] ${result.title}`;
                (result as any).consensus = boardDecision;
            }

            return result;
        } catch (error) {
            console.error('[AIProducer] Suggestion generation failed:', error);
            return {
                title: "Quality Check",
                description: "Broadcast looks stable. Keep up the energy!",
                priority: "low"
            };
        }
    }
}

export const aiProducerService = new AIProducerService();
