/**
 * Engine for detecting commerce intent and product mentions in live speech.
 * Maps spoken entities to the live product catalog.
 */
export interface CommerceIntent {
    productId: string | null;
    intent: 'promotion' | 'educational' | 'sale' | 'none';
    confidence: number;
    triggerSentence: string;
}

export class CommerceIntelligenceEngine {
    private products: any[] = [];
    private lastTriggerTime = 0;
    private cooldownMs = 30000; // Prevent spamming overlays

    private intentKeywords: Record<string, Record<string, string[]>> = {
        en: {
            promotion: ['buy', 'purchase', 'deal', 'get it', 'discount', 'checkout', 'off', 'flash', 'limited', 'grab', 'special'],
            educational: ['use', 'how', 'features', 'spec', 'quality', 'better', 'pro', 'demonstrate', 'works', 'example', 'tutorial'],
            sale: ['price', 'cost', 'bucks', 'affordable', 'only', 'cheap', 'value', 'save', 'worth', 'investment']
        },
        vi: {
            promotion: ['mua', 'đặt hàng', 'chốt đơn', 'giảm giá', 'khuyến mãi', 'ưu đãi', 'voucher', 'mã giảm', 'nhanh tay', 'siêu sale', 'giá sốc'],
            educational: ['dùng', 'sử dụng', 'cách dùng', 'tính năng', 'đặc điểm', 'chất lượng', 'hướng dẫn', 'demo', 'ví dụ', 'trải nghiệm'],
            sale: ['giá', 'nhiêu', 'bao nhiêu', 'tiền', 'rẻ', 'hợp lý', 'đáng tiền', 'tiết kiệm', 'đầu tư']
        }
    };

    private languages: string[] = ['en', 'vi']; // Supported languages

    /**
     * Updates the engine with the current live products for matching.
     */
    public setLiveProducts(products: any[]) {
        this.products = products;
    }

    /**
     * Processes a transcript snippet to detect product mentions and intent.
     */
    public async analyzeSpeech(transcript: string): Promise<CommerceIntent> {
        const text = transcript.toLowerCase();
        const now = Date.now();

        if (now - this.lastTriggerTime < this.cooldownMs) {
            return { productId: null, intent: 'none', confidence: 0, triggerSentence: '' };
        }

        let matchedProductId: string | null = null;
        let detectedIntent: any = 'none';
        let confidence = 0;

        // 1. Identify Product Entities
        for (const product of this.products) {
            // Check title and keywords (mocking keywords from title for now)
            const keywords = product.title.toLowerCase().split(' ');
            const matchCount = keywords.filter((k: string) => k.length > 3 && text.includes(k)).length;

            if (matchCount > 1 || text.includes(product.title.toLowerCase())) {
                matchedProductId = product.id;
                confidence += 0.5;
                break;
            }
        }

        if (!matchedProductId) return { productId: null, intent: detectedIntent, confidence: 0, triggerSentence: '' };

        // 2. Identify Intent
        let intentScore = 0;
        this.languages.forEach(lang => {
            const pool = this.intentKeywords[lang];
            if (!pool) return;
            
            Object.entries(pool).forEach(([intent, keys]) => {
                const hits = keys.filter(k => text.includes(k)).length;
                if (hits > intentScore) {
                    intentScore = hits;
                    detectedIntent = intent;
                }
            });
        });

        if (intentScore > 0) {
            confidence += 0.4;
        }

        // 3. Final Evaluation
        if (confidence > 0.6) {
            this.lastTriggerTime = now;
            console.log(`[CommerceEngine] Detected intent: ${detectedIntent} for product ${matchedProductId}`);
            return { productId: matchedProductId, intent: detectedIntent, confidence, triggerSentence: transcript };
        }

        return { productId: null, intent: 'none', confidence: 0, triggerSentence: '' };
    }

    public resetCooldown() {
        this.lastTriggerTime = 0;
    }
}

export const commerceIntelligenceEngine = new CommerceIntelligenceEngine();
