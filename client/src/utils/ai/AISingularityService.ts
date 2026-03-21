import api from '@/utils/api';
import type { ViralMoment } from './RecapOrchestrator';
import type { FactCheckResult } from './FactCheckingService';

/**
 * Handles communication with advanced LLM endpoints (Gemini) for high-level creative
 * and analytical tasks, acting as the "Singularity" core of the AI Director.
 */
export class AISingularityService {
    private static instance: AISingularityService;

    private constructor() {}

    public static getInstance(): AISingularityService {
        if (!AISingularityService.instance) {
            AISingularityService.instance = new AISingularityService();
        }
        return AISingularityService.instance;
    }

    /**
     * Generates a comprehensive session recap, utilizing viral moments, fact checks,
     * and overall session statistics.
     */
    public async generateRecap(
        promptContext: string,
        moments: ViralMoment[],
        factChecks: FactCheckResult[],
        sessionData: any
    ): Promise<any> {
        try {
            const completionPayload = {
                prompt: promptContext,
                systemPrompt: `You are the master overarching AI Director "Singularity". 
                You are generating the final broadcast recap.
                Analyze the provided moments, facts, and session stats.
                Return ONLY valid JSON matching the requested format.`,
                response_format: { type: "json_object" }
            };

            const response = await api.post('/ai/llm/completion', completionPayload);

            if (response.data && response.data.completion) {
                try {
                    return JSON.parse(response.data.completion);
                } catch (parseError) {
                    console.error('[AISingularity] Parse error on recap data', parseError);
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error('[AISingularity] Failed to generate full recap:', error);
            return null;
        }
    }
}

export const aiSingularityService = AISingularityService.getInstance();
