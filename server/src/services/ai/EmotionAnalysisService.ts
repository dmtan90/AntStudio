import { geminiPool } from '../../utils/gemini.js';

export interface EmotionResult {
    emotion: 'happy' | 'surprised' | 'thinking' | 'sad' | 'neutral';
    intensity: number; // 0 to 1
    duration: number; // How long to hold the expression in seconds
}

/**
 * Service to analyze contextual emotions from text or audio 
 * to drive neural entity expressions.
 */
export class EmotionAnalysisService {
    /**
     * Analyze text to detect the appropriate visual emotion
     * @param text The text to analyze
     */
    static async analyzeText(text: string): Promise<EmotionResult> {
        try {
            const modelName = "gemini-2.5-flash";
            const clientInfo = await geminiPool.getOptimalClient(modelName);
            
            if (!clientInfo) {
                throw new Error('No available Gemini clients');
            }

            const { client: ai, key } = clientInfo;

            const prompt = `
                Analyze the following text and determine the most appropriate visual emotion for an AI avatar.
                
                Text: "${text}"
                
                Available emotions:
                - happy: joyful, friendly, or positive statements
                - surprised: shock, awe, or unexpected info
                - thinking: deep thought, confusion, or complex explanations
                - sad: disappointment, melancholy, or serious empathy
                - neutral: standard facts, greeting, or unemotional content
                
                Return a JSON object:
                {
                    "emotion": "happy" | "surprised" | "thinking" | "sad" | "neutral",
                    "intensity": float (0.0 to 1.0),
                    "duration": float (seconds, typically 1.5 to 5.0)
                }
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const response = result.response;
            const textResult = response.text();
            
            await geminiPool.recordUsage(key, modelName);

            const parsed = JSON.parse(textResult);
            
            // Validation
            const validEmotions = ['happy', 'surprised', 'thinking', 'sad', 'neutral'];
            if (!validEmotions.includes(parsed.emotion)) {
                parsed.emotion = 'neutral';
            }
            
            return {
                emotion: parsed.emotion,
                intensity: Math.min(1, Math.max(0, parsed.intensity || 0.5)),
                duration: Math.min(10, Math.max(0.5, parsed.duration || 2))
            };
        } catch (error: any) {
            console.error('[EmotionAnalysisService] Analysis failed:', error.message);
            return { emotion: 'neutral', intensity: 0.5, duration: 2 };
        }
    }
}
