import { useStudioStore } from '@/stores/studio';

export class IntentAnalyzer {
    private static instance: IntentAnalyzer;
    
    // High-intent keywords for commerce (Vietnamese & English)
    private readonly COMMIT_KEYWORDS = [
        'mua', 'shopee', 'lazada', 'tiktok shop', 'giá', 'ưu đãi', 'giảm giá', 'sale', 'voucher', 
        'chốt đơn', 'mã giảm giá', 'link', 'quét mã', 'qr', 'buy', 'price', 'discount', 'deal', 
        'checkout', 'shop', 'order', 'limited', 'stock', 'hết hàng', 'còn hàng'
    ];

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
}

export const intentAnalyzer = IntentAnalyzer.getInstance();
