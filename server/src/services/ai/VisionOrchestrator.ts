import { GoogleGenAI } from '@google/genai';
import { geminiPool } from '../../utils/gemini.js';

/**
 * Orchestrates Vision-based analysis for the AI Director.
 * Uses Gemini 1.5 Pro to "see" the stream content.
 */
export class VisionOrchestrator {
    constructor() {}

    /**
     * Analyzes a canvas snapshot for contextual awareness.
     */
    public async analyzeFrame(base64Image: string, prompt: string = "Describe what is happening in this live stream frame. Identify people, objects, and emotions.") {
        try {
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

            // Remove data URI prefix if present
            const imageData = base64Image.split(',')[1] || base64Image;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: imageData,
                                mimeType: "image/png"
                            }
                        }
                    ]
                }]
            });

            const response = result.response;
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);
            
            return response.text();
        } catch (error: any) {
            console.error('[VisionOrchestrator] Analysis failed:', error.message);
            return null;
        }
    }

    /**
     * Performs specialized analysis for specific director tasks (e.g. Commerce).
     */
    public async identifyProducts(base64Image: string) {
        const prompt = "Identify any physical products visible in this frame that could be for sale. Return only a JSON array of names.";
        const analysis = await this.analyzeFrame(base64Image, prompt);
        try {
            // Very simple extraction logic, would be more robust in production
            return JSON.parse(analysis || '[]');
        } catch {
            return [];
        }
    }
}

export const visionOrchestrator = new VisionOrchestrator();
