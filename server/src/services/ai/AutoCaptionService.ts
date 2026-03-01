import { GoogleGenAI } from '@google/genai';
import { geminiPool } from '../../utils/gemini.js';
import fs from 'fs';
import { Logger } from '../../utils/Logger.js';

/**
 * Service for generating AI-powered kinetic captions for short-form clips.
 */
export class AutoCaptionService {
    constructor() {}

    /**
     * Generates transcription and caption timing for a video buffer.
     */
    public async generateCaptions(videoBuffer: Buffer, mimeType: string = "video/mp4") {
        try {
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

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

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: videoData,
                                mimeType: mimeType
                            }
                        }
                    ]
                }]
            });

            const response = result.response || result;
            let content = '';
            if (typeof response.text === 'function') {
                content = response.text();
            } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = response.candidates[0].content.parts[0].text;
            }
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);

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
            Logger.error(`[AutoCaptionService] Generation failed: ${error.message}`, 'AutoCaptionService');
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
