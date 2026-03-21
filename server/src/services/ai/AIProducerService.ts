import { audiencePredictor } from './AudiencePredictor.js';
import { aiPerformanceService } from './AIPerformanceService.js';
import { InfluencerService } from '../InfluencerService.js';
import { Logger } from '../../utils/Logger.js';
import { directorWorkflow } from './DirectorWorkflow.js';

export class AIProducerService {
    /**
     * Generate "Director Notes" based on the current studio state.
     */
    async generateSuggestions(userId: string, studioState: {
        vibe: any,
        engagement: any,
        chatSummary: string,
        activeScene: string,
        projectId?: string,
        influencerId?: string,
        vision?: string
    }): Promise<{ 
        title: string, 
        description: string, 
        priority: 'low' | 'medium' | 'high', 
        actionLabel?: string, 
        actionType?: string,
        boardFeedback?: string,
        consensus?: any,
        logs?: string[]
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
        if (userId && studioState.influencerId) {
            try {
                const memories = await InfluencerService.getRelevantMemories(userId, studioState.influencerId, ['engagement', 'vibe', 'scene', 'hype']);
                if (memories.length > 0) {
                    memoryContext = `HISTORICAL CONTEXT (Relevant memories from past sessions):\n${memories.map(m => `- ${m}`).join('\n')}`;
                }
            } catch (err) {
                Logger.warn(`[AIProducer] Failed to fetch memories: ${err}`, 'AIProducer');
            }
        }

        try {
            const workflowResult = await directorWorkflow.run({
                userId,
                projectId: studioState.projectId,
                studioState: {
                    ...studioState,
                    predictiveContext,
                    memoryContext
                }
            });

            const result = workflowResult.finalDecision;
            result.logs = workflowResult.logs; // Attach workflow execution logs
            
            return result;
        } catch (error) {
            Logger.error(`[AIProducer] Suggestion generation failed: ${error}`, 'AIProducer');
            return {
                title: "Quality Check",
                description: "Broadcast looks stable. Keep up the energy!",
                priority: "low"
            };
        }
    }
}

export const aiProducerService = new AIProducerService();
