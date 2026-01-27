import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from '../../utils/configService.js';
import fs from 'fs';

/**
 * Service for generating AI-powered kinetic captions for short-form clips.
 */
export class AutoCaptionService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Generates transcription and caption timing for a video file.
     */
    public async generateCaptions(videoPath: string) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Read video as base64
            const videoData = fs.readFileSync(videoPath).toString('base64');

            const prompt = `
                Transcribe this video segment into kinetic typography captions for TikTok.
                Identify key words to highlight or emphasize with colors.
                Return transcript in JSON format: [{ text: string, start: number, end: number, highlight: boolean }]
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: videoData,
                        mimeType: "video/mp4"
                    }
                }
            ]);

            const response = await result.response;
            const content = response.text();

            // Extract JSON from response
            const jsonStr = content.match(/\[.*\]/s)?.[0] || '[]';
            return JSON.parse(jsonStr);

        } catch (error: any) {
            console.error('[AutoCaptionService] Generation failed:', error.message);
            return [];
        }
    }
}

export const autoCaptionService = new AutoCaptionService();
