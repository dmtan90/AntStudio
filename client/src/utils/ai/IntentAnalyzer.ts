import { useStudioStore } from '@/stores/studio';

export class IntentAnalyzer {
    private static instance: IntentAnalyzer;
    
    // High-intent keywords for commerce (Vietnamese & English)
    private readonly COMMIT_KEYWORDS = [
        'mua', 'shopee', 'lazada', 'tiktok shop', 'giá', 'ưu đãi', 'giảm giá', 'sale', 'voucher', 
        'chốt đơn', 'mã giảm giá', 'link', 'quét mã', 'qr', 'buy', 'price', 'discount', 'deal', 
        'checkout', 'shop', 'order', 'limited', 'stock', 'hết hàng', 'còn hàng'
    ];

    // Phase 25: Context-specific intent signal maps
    private readonly CONTEXT_KEYWORDS: Record<string, string[]> = {
        sales: ['buy', 'price', 'deal', 'discount', 'voucher', 'checkout', 'order', 'shop', 'mua', 'giá', 'flash sale'],
        game_streaming: ['gg', 'clutch', 'rekt', 'carrying', 'ez', 'noob', 'carry', 'hype', 'poggers', 'lets go', 'insane'],
        sport: ['goal', 'yesss', 'comeback', 'offside', 'penalty', 'foul', 'amazing', 'incredible', 'score', 'winner'],
        news: ['breaking', 'shocking', 'update', 'confirmed', 'source', 'report', 'latest', 'exclusive'],
        music: ['fire', 'banger', 'love this', 'vibes', 'drop', 'lyrics', 'concert', 'sing along'],
        talkshow: ['agree', 'disagree', 'interesting', 'point', 'debate', 'opinion', 'think'],
        gameshow: ['winner', 'win', 'answer', 'correct', 'wrong', 'competition', 'prize'],
        general: ['wow', 'amazing', 'great', 'love', 'awesome']
    };

    private constructor() {}

    public static getInstance(): IntentAnalyzer {
        if (!IntentAnalyzer.instance) {
            IntentAnalyzer.instance = new IntentAnalyzer();
        }
        return IntentAnalyzer.instance;
    }

    /**
     * Analyzes a piece of text (script or chat) for commerce intent.
     * Returns a score from 0 to 1.
     */
    public analyze(text: string): number {
        if (!text) return 0;
        
        const lowerText = text.toLowerCase();
        let matches = 0;
        
        this.COMMIT_KEYWORDS.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                matches++;
            }
        });

        // Heuristic: If we have multiple keywords, intent is very high
        const score = Math.min(1, matches / 3);
        
        // Update studio store if intent is high enough
        if (score > 0.6) {
            const studioStore = useStudioStore();
            studioStore.updateIntentScore(score);
        }

        return score;
    }

    /**
     * Phase 25: Analyze text for context-specific audience signals.
     * Returns a score from 0 to 1 based on the current streaming context.
     */
    public analyzeContextSignal(text: string, context: string): number {
        if (!text) return 0;
        const lowerText = text.toLowerCase();
        const keywords = this.CONTEXT_KEYWORDS[context] || this.CONTEXT_KEYWORDS.general;
        const matches = keywords.filter(k => lowerText.includes(k)).length;
        return Math.min(1, matches / 2);
    }

    /**
     * Phase 25: Returns sensitivity config for a given context.
     */
    public getContextSensitivity(context: string): { threshold: number, pivotReason: string } {
        switch (context) {
            case 'sales':         return { threshold: 0.5, pivotReason: 'High purchase intent detected' };
            case 'game_streaming': return { threshold: 0.6, pivotReason: 'Hype peak in chat' };
            case 'sport':         return { threshold: 0.6, pivotReason: 'Crowd energy spike' };
            case 'gameshow':      return { threshold: 0.5, pivotReason: 'Audience excitement peak' };
            default:              return { threshold: 0.7, pivotReason: 'Audience engagement spike' };
        }
    }
}

export const intentAnalyzer = IntentAnalyzer.getInstance();
