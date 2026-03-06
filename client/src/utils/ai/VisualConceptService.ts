import api from '@/utils/api';

export interface BRollAsset {
    id: string;
    url: string;
    topic: string;
    timestamp: number;
}

export class VisualConceptService {
    private static isProcessing = false;
    private static lastQuery = '';

    /**
     * Extracts keywords from dialogue and triggers image generation.
     */
    public static async processDialogue(text: string, studioVibe: string) {
        if (this.isProcessing || !text || text.length < 20) return null;
        
        // Simple heuristic: don't process if too similar to previous
        if (text.startsWith(this.lastQuery.substring(0, 10))) return null;

        this.isProcessing = true;
        this.lastQuery = text;

        try {
            console.log('[VisualConcept] Extracting semantic concepts from:', text);
            
            // 1. Extract Keywords using LLM/Regex
            const keywords = this.extractKeywords(text);
            if (keywords.length === 0) return null;

            const primaryTopic = keywords[0];
            
            // 2. Trigger Generative Image API
            // Note: In a production AntStudio environment, this would call /ai/generate-image
            const res = await api.post('/ai/generate-broll', {
                prompt: `A cinematic, high-quality B-Roll image reflecting the concept: ${primaryTopic}. Style: ${studioVibe}.`,
                topic: primaryTopic
            });

            if (res.data && res.data.url) {
                const asset: BRollAsset = {
                    id: `broll_${Date.now()}`,
                    url: res.data.url,
                    topic: primaryTopic,
                    timestamp: Date.now()
                };
                
                // Notify the studio store to display the B-Roll
                window.dispatchEvent(new CustomEvent('show:b_roll_generated', { detail: asset }));
                return asset;
            }
        } catch (error) {
            console.error('[VisualConcept] B-Roll generation failed:', error);
        } finally {
            this.isProcessing = false;
        }
        return null;
    }

    public static async extractConcept(text: string): Promise<string | null> {
        const keywords = this.extractKeywords(text);
        return keywords.length > 0 ? keywords[0] : null;
    }

    private static extractKeywords(text: string): string[] {
        // Mock semantic extraction for now. 
        // In reality, this would use a small local model or Gemini-Flash.
        const stopWords = ['the', 'and', 'with', 'this', 'that', 'from'];
        const words = text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
            .split(/\s+/)
            .filter(w => w.length > 4 && !stopWords.includes(w));
        
        // Return unique sorted by length as a proxy for 'informational density'
        return [...new Set(words)].sort((a, b) => b.length - a.length);
    }
}
