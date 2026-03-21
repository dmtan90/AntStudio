import { AIPerformanceService, PerformanceSnapshot } from './AIPerformanceService.js';
import { generateJSON } from '../../utils/AIGenerator.js';

import { Logger } from '../../utils/Logger.js';

/**
 * Service for predictive audience intelligence and engagement forecasting.
 */
export class AudiencePredictor {
    constructor() {}

    /**
     * Forecasts future engagement trends based on historical snapshots.
     */
    public async forecastEngagement(projectId: string, snapshots: PerformanceSnapshot[]) {
        if (snapshots.length < 5) return { trend: 'insufficient_data', confidence: 0 };

        try {
            const dataSummary = snapshots.slice(-10).map(s => ({
                t: s.timestamp,
                v: s.viewerCount,
                c: s.chatVelocity
            }));

            const prompt = `
                ACT AS: Data Scientist & Audience Retention Specialist.
                DATA: ${JSON.stringify(dataSummary)}
                
                Analyze the trend. Will engagement drop, rise, or remain stable in the next 5 minutes?
                Return JSON format ONLY: { "trend": "rise" | "drop" | "stable", "confidence": 0-1, "reasoning": "short reason" }
            `;

            return await generateJSON(prompt, undefined);

        } catch (error: any) {
            Logger.error('[AudiencePredictor] Forecast failed:', error.message);
            return { trend: 'error', confidence: 0 };
        }
    }

    /**
     * Determines if a "Hype Trigger" should be engaged based on forecasts.
     */
    public shouldTriggerHype(forecast: any): boolean {
        return forecast.trend === 'drop' && forecast.confidence > 0.7;
    }
}

export const audiencePredictor = new AudiencePredictor();
