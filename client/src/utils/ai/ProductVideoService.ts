import api from '@/utils/api';

export interface StorytellingConfig {
    hostType: 'aidol' | '3d' | 'live2d';
    product: any;
    vibe: string;
    customEvent?: string; // e.g. "product_A", "checkout_B"
}

export class ProductVideoService {
    /**
     * Generates a high-fidelity prompt for Veo3 or Kling to create a product preview video.
     */
    public static async generateVideoPrompt(config: StorytellingConfig): Promise<string> {
        const { product, vibe, customEvent } = config;
        const metadata = product.promptMetadata || { category: 'clothing', style: 'streetwear', features: [] };
        
        try {
            const res = await api.post('/prompts/studio', {
                type: 'veo_product',
                data: {
                    productName: product.name,
                    metadata: {
                        style: metadata.style,
                        category: metadata.category
                    },
                    vibe,
                    customEvent
                }
            });

            return res.data.data.prompt;
        } catch (error) {
            console.error('[ProductVideoService] Failed to fetch prompt from server, using fallback', error);
            // Minimal fallback
            return `A lifestyle preview of the ${product.name} in a ${vibe} studio setting. \nSetting: clean studio lighting against a pure green screen.`;
        }
    }

    /**
     * Extracts a call-to-action (CTA) script for the STT/TTS engine.
     */
    public static getCTAScript(product: any, language: 'vi-VN' | 'en-US' = 'vi-VN'): string {
        if (language === 'vi-VN') {
            return `Mọi người ơi, đây là ${product.name}! Sản phẩm cực hot với giá chỉ ${product.price}. Nhanh tay quét mã QR trên màn hình để chốt đơn ngay kẻo lỡ nhé!`;
        }
        return `Hey everyone, look at this ${product.name}! It's a must-have for just $${product.price}. Scan the QR code on your screen to grab yours now before we run out!`;
    }
}
