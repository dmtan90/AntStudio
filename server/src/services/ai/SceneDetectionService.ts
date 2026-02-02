import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from '../../utils/configService.js';

/**
 * Service for automatically identifying shot boundaries (scenes) in video clips using AI.
 */
export class SceneDetectionService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        // Initialize with Google API Key from config
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || process.env.GOOGLE_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Analyzes a video buffer and detects logical scene changes.
     * @param videoBuffer The video file as a buffer
     * @param mimeType The file mimetype (default: video/mp4)
     * @returns Array of detected scenes with start/end times and descriptions
     */
    public async detectScenes(videoBuffer: Buffer, mimeType: string = "video/mp4") {
        try {
            // Using flash for speed and cost efficiency on long-form content
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            const videoBase64 = videoBuffer.toString('base64');

            const prompt = `
                Analyze this video and identify every logical shot change or scene boundary.
                For each scene, provide the start and end timestamp in seconds, and a brief descriptive label.
                
                Return the result as a JSON array:
                [{
                    "start": number,
                    "end": number,
                    "label": string,
                    "description": string
                }]
                
                Ensure the timestamps are precise and represent the exact moment of the cut.
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: videoBase64,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Parse response
            let scenes = JSON.parse(text);

            // Basic validation and sorting
            if (!Array.isArray(scenes)) {
                // If it returned { "scenes": [...] } instead of direct array
                if (scenes.scenes && Array.isArray(scenes.scenes)) {
                    scenes = scenes.scenes;
                } else {
                    throw new Error('Unexpected AI response format');
                }
            }

            return scenes.sort((a: any, b: any) => a.start - b.start).map((s: any) => ({
                start: parseFloat(s.start),
                end: parseFloat(s.end),
                label: s.label || 'Scene',
                description: s.description || ''
            }));

        } catch (error: any) {
            console.error('[SceneDetectionService] Analysis failed:', error.message);
            throw new Error(`Scene detection failed: ${error.message}`);
        }
    }
}

export const sceneDetectionService = new SceneDetectionService();
