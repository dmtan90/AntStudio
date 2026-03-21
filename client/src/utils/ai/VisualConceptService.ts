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

    public static async processDialogue(text: string, studioVibe: string) {
        if (this.isProcessing || !text || text.length < 20) return null;
        if (text.startsWith(this.lastQuery.substring(0, 10))) return null;

        this.isProcessing = true;
        this.lastQuery = text;

        try {
            console.log('[VisualConcept] Extracting semantic concepts from:', text);
            const keywords = this.extractKeywords(text);
            if (keywords.length === 0) return null;

            const primaryTopic = keywords[0];
            
            // Refactored to use backend promptId
            const res = await api.post('/ai/generate-broll', {
                promptId: 'ai/visual_concept',
                variables: {
                    topic: primaryTopic,
                    style: studioVibe
                },
                topic: primaryTopic
            });

            if (res.data && res.data.url) {
                const asset: BRollAsset = {
                    id: `broll_${Date.now()}`,
                    url: res.data.url,
                    topic: primaryTopic,
                    timestamp: Date.now()
                };
                
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
        const stopWords = ['the', 'and', 'with', 'this', 'that', 'from'];
        const words = text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
            .split(/\s+/)
            .filter(w => w.length > 4 && !stopWords.includes(w));
        
        return [...new Set(words)].sort((a, b) => b.length - a.length);
    }
}
