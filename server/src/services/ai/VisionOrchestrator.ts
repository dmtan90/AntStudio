import { generateText, generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../PromptService.js';

/**
 * Orchestrates Vision-based analysis for the AI Director.
 * Uses Gemini 2.0 Flash to "see" the stream content.
 */
export class VisionOrchestrator {
    constructor() {}

    /**
     * Analyzes a canvas snapshot for contextual awareness.
     */
    public async analyzeFrame(base64Image: string, prompt: string = "Describe what is happening in this live stream frame. Identify people, objects, and emotions.") {
        try {
            const imageData = base64Image.split(',')[1] || base64Image;

            const promptTemplate = await promptService.get('ai/vision_analyze', {
                prompt
            });

            const promptParts = [
                { text: promptTemplate },
                {
                    inlineData: {
                        data: imageData,
                        mimeType: "image/png"
                    }
                }
            ];

            return await generateText(promptParts, undefined);
        } catch (error: any) {
            Logger.error('[VisionOrchestrator] Analysis failed:', error.message);
            return null;
        }
    }

    /**
     * Performs specialized analysis for specific director tasks (e.g. Commerce).
     */
    public async identifyProducts(base64Image: string) {
        try {
            const imageData = base64Image.split(',')[1] || base64Image;
            const promptTemplate = await promptService.get('ai/product_identify');

            const promptParts = [
                { text: promptTemplate },
                {
                    inlineData: {
                        data: imageData,
                        mimeType: "image/png"
                    }
                }
            ];

            return await generateJSON(promptParts);
        } catch (error: any) {
            Logger.error('[VisionOrchestrator] Product identification failed:', error.message);
            return [];
        }
    }
}

export const visionOrchestrator = new VisionOrchestrator();
