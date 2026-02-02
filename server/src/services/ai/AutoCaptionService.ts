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
     * Generates transcription and caption timing for a video buffer.
     */
    public async generateCaptions(videoBuffer: Buffer, mimeType: string = "video/mp4") {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Convert buffer to base64
            const videoData = videoBuffer.toString('base64');

            const prompt = `
                Transcribe this video segment into kinetic typography captions for TikTok.
                Identify key words to highlight or emphasize.
                Return transcript in JSON format: 
                [{ 
                    "text": string, 
                    "start": number (seconds), 
                    "end": number (seconds), 
                    "style": "default" | "highlight" | "karaoke" 
                }]
                Ensure timestamps are relative to the start of the video (0.0).
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: videoData,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            const content = response.text();

            // Extract JSON from response
            const jsonStr = content.match(/\[.*\]/s)?.[0] || '[]';
            const parsed = JSON.parse(jsonStr);

            // Validate structure
            return parsed.map((c: any) => ({
                text: c.text,
                start: parseFloat(c.start),
                end: parseFloat(c.end),
                style: c.style || 'default'
            }));

        } catch (error: any) {
            console.error('[AutoCaptionService] Generation failed:', error.message);
            // Fallback mock for dev/testing if API fails
            if (process.env.NODE_ENV === 'development') {
                return [
                    { start: 0.5, end: 1.5, text: "Mock Caption", style: 'default' },
                    { start: 1.5, end: 2.5, text: "Generated due to error", style: 'highlight' }
                ];
            }
            throw error;
        }
    }
}

export const autoCaptionService = new AutoCaptionService();
