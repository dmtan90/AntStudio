import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from '../../utils/configService.js';

/**
 * Orchestrates Vision-based analysis for the AI Director.
 * Uses Gemini 1.5 Pro to "see" the stream content.
 */
export class VisionOrchestrator {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Analyzes a canvas snapshot for contextual awareness.
     */
    public async analyzeFrame(base64Image: string, prompt: string = "Describe what is happening in this live stream frame. Identify people, objects, and emotions.") {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use flash for low latency

            // Remove data URI prefix if present
            const imageData = base64Image.split(',')[1] || base64Image;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: imageData,
                        mimeType: "image/png"
                    }
                }
            ]);

            const response = await result.response;
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
