import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { configService } from '../configService.js';
import { Logger } from '../Logger.js';

/**
 * Service for self-evolving AI performance optimization.
 * Analyzes WebGPU logs and suggests shader improvements.
 */
export class RenderOptimizer {
    private ai: any;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || process.env.GEMINI_API_KEY || '';
        this.ai = genkit({
            plugins: [googleAI({ apiKey })]
        });
    }

    /**
     * Analyzes current rendering bottlenecks and suggests WGSL (WebGPU) optimizations.
     */
    public async suggestShaderOptimization(currentShaderCode: string, performanceLogs: string) {
        Logger.info('🧠 [RenderOptimizer] Analyzing WebGPU performance...', 'RenderOptimizer');

        try {
            const response = await this.ai.generate({
                model: 'googleai/gemini-1.5-pro',
                prompt: `
                    ACT AS: Elite Graphics Engineer & WebGPU Specialist.
                    
                    CONTEXT: The following WGSL shader is experiencing performance bottlenecks.
                    PERFORMANCE LOGS: ${performanceLogs}
                    CURRENT SHADER:
                    \`\`\`wgsl
                    ${currentShaderCode}
                    \`\`\`
                    
                    TASK: Suggest a 100% optimized version of this shader. 
                    Focus on reducing memory bandwidth and increasing occupancy.
                    Return only the optimized WGSL code.
                `
            });

            return response.text;

        } catch (error: any) {
            Logger.error(`[RenderOptimizer] Optimization analysis failed: ${error.message}`, 'RenderOptimizer');
            return null;
        }
    }
}

export const renderOptimizer = new RenderOptimizer();
