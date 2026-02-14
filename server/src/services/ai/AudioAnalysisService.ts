import { GoogleGenAI } from '@google/genai';
import { geminiPool } from '../../utils/gemini.js';

/**
 * Service for analyzing audio characteristics like rhythm, beats, and energy peaks.
 */
export class AudioAnalysisService {
    constructor() {}

    /**
     * Detects rhythmic beats or major energy peaks in an audio/video buffer.
     * Returns an array of timestamps in seconds.
     */
    public async detectBeats(buffer: Buffer, mimeType: string = "audio/mpeg") {
        try {
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

            const audioBase64 = buffer.toString('base64');

            const prompt = `
                Analyze the rhythm and tempo of this audio. 
                Identify the exact timestamps (in seconds) for every major beat or rhythmic drop where a video cut would feel natural.
                
                Focus on:
                1. The main pulse/kick drum of the track.
                2. Transition points or drops.
                
                Return the result as a JSON array of numbers:
                [timestamp1, timestamp2, ...]
                
                Ensure the timestamps are precise and represent the pulse of the music.
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: audioBase64,
                                mimeType: mimeType
                            }
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const response = result.response;
            const text = response.text();
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);

            let beats = JSON.parse(text);

            if (!Array.isArray(beats)) {
                if (beats.beats && Array.isArray(beats.beats)) {
                    beats = beats.beats;
                } else if (beats.timestamps && Array.isArray(beats.timestamps)) {
                    beats = beats.timestamps;
                } else {
                    throw new Error('Unexpected AI response format for beats');
                }
            }

            // Ensure they are numbers and sorted
            return beats
                .map((b: any) => parseFloat(b))
                .filter((b: number) => !isNaN(b))
                .sort((a: number, b: number) => a - b);

        } catch (error: any) {
            console.error('[AudioAnalysisService] Analysis failed:', error.message);
            throw new Error(`Beat detection failed: ${error.message}`);
        }
    }
}

export const audioAnalysisService = new AudioAnalysisService();
