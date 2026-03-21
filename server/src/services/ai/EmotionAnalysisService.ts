import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';

export interface EmotionResult {
    emotion: 'happy' | 'surprised' | 'thinking' | 'sad' | 'neutral';
    intensity: number; // 0 to 1
    duration: number; // How long to hold the expression in seconds
}
import { promptService } from '../../services/PromptService.js';

/**
 * Service to analyze contextual emotions from text or audio 
 * to drive neural entity expressions.
 */
export class EmotionAnalysisService {
    /**
     * Analyze text to detect the appropriate visual emotion
     * @param text The text to analyze
     */
    static async analyzeText(text: string): Promise<EmotionResult> {
        try {
            const prompt = await promptService.get('ai/emotion_analysis', {
                text
            });

            return await generateJSON(prompt);
        } catch (error: any) {
            Logger.error('[EmotionAnalysis] Analysis failed:', error.message);
            return { emotion: 'neutral', intensity: 0.5, duration: 3 };
        }
    }
}
