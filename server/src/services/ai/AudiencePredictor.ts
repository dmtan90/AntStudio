import { AIPerformanceService, PerformanceSnapshot } from './AIPerformanceService.js';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { configService } from '../../utils/configService.js';

/**
 * Service for predictive audience intelligence and engagement forecasting.
 */
export class AudiencePredictor {
    private ai: any;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || process.env.GEMINI_API_KEY || '';
        this.ai = genkit({
            plugins: [googleAI({ apiKey })]
        });
    }

    /**
     * Forecasts future engagement trends based on historical snapshots.
     */
    public async forecastEngagement(projectId: string, snapshots: PerformanceSnapshot[]) {
        if (snapshots.length < 10) return { trend: 'insufficient_data', confidence: 0 };

        try {
            const dataSummary = snapshots.slice(-10).map(s => ({
                t: s.timestamp,
                v: s.viewerCount,
                c: s.chatVelocity
            }));

            const response = await this.ai.generate({
                model: 'googleai/gemini-1.5-flash',
                prompt: `
                    ACT AS: Data Scientist & Audience Retention Specialist.
                    DATA: ${JSON.stringify(dataSummary)}
                    
                    Analyze the trend. Will engagement drop, rise, or remain stable in the next 5 minutes?
                    Return JSON: { trend: "rise" | "drop" | "stable", confidence: 0-1, reasoning: "short reason" }
                `
            });

            return JSON.parse(response.text.match(/\{.*\}/s)?.[0] || '{"trend": "stable", "confidence": 0.5}');

        } catch (error: any) {
            console.error('[AudiencePredictor] Forecast failed:', error.message);
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
