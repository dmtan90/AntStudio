import { generateJSON } from '../AIGenerator.js';
import { Logger } from '../Logger.js';
import { promptService } from '../../services/ai/PromptService.js';

/**
 * Optimizes scene rendering based on AI feedback.
 */
export class RenderOptimizer {
    constructor() {}

    /**
     * Analyzes studio scene data to suggest optimizations.
     */
    public async optimizeScene(sceneData: any) {
        try {
            const prompt = await promptService.get('ai/render_optimize', {
                sceneData: JSON.stringify(sceneData)
            });

            return await generateJSON(prompt);
        } catch (error: any) {
            Logger.error('[RenderOptimizer] Optimization failed:', error.message);
            return { optimizations: [], priority: 'low' };
        }
    }
}

export const renderOptimizer = new RenderOptimizer();
