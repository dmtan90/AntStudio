import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../../services/PromptService.js';

/**
 * Service for analyzing audio characteristics like rhythm, beats, and energy peaks.
 */
export class AudioAnalysisService {
    constructor() {}

    /**
     * Detects rhythmic beats or major energy peaks in an audio/video buffer.
     * Returns an array of timestamps in seconds.
     */
    public async detectBeats(audioBuffer: Buffer, mimeType: string) {
        try {
            const prompt = await promptService.get('ai/beat_detection');

            const promptParts = [
                { text: prompt },
                {
                    inlineData: {
                        data: audioBuffer.toString('base64'),
                        mimeType: mimeType
                    }
                }
            ];

            let beats = await generateJSON(promptParts, undefined);

            // Normalize response
            if (!Array.isArray(beats)) {
                if (beats.beats && Array.isArray(beats.beats)) {
                    return { beats: beats.beats, bpm: beats.bpm || 0 };
                }
                return { beats: [], bpm: 0 };
            }

            return { beats: beats, bpm: 0 };
        } catch (error: any) {
            Logger.error('[AudioAnalysis] Beat detection failed:', error.message);
            return { beats: [], bpm: 0 };
        }
    }
}

export const audioAnalysisService = new AudioAnalysisService();
