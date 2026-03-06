export interface StorytellingConfig {
    hostType: 'aidol' | '3d' | 'live2d';
    product: any;
    vibe: string;
    customEvent?: string; // e.g. "product_A", "checkout_B"
}

export class VeoPromptService {
    /**
     * Generates a high-fidelity prompt for Veo3 or Kling to create a product preview video.
     */
    public static generateVeoPrompt(config: StorytellingConfig): string {
        const { product, vibe, customEvent } = config;
        const metadata = product.promptMetadata || { category: 'clothing', style: 'streetwear', features: [] };
        
        let basePrompt = '';
        
        if (customEvent && customEvent.startsWith('product')) {
            basePrompt = `A charming woman wearing the ${product.name}, showing off the ${metadata.style} detail.`;
        } else if (customEvent && customEvent.startsWith('checkout')) {
            basePrompt = `A charming woman pointing at the ${product.name} with excitement, encouraging viewers to buy.`;
        } else {
            switch (metadata.category) {
                case 'clothing':
                    basePrompt = `A stunning young woman wearing a ${metadata.style} ${product.name}, showcasing the fabric detail and fit.`;
                    break;
                case 'tech':
                    basePrompt = `Close-up cinematic shot of the ${product.name}, showing its sleek design and advanced features.`;
                    break;
                case 'beauty':
                    basePrompt = `Professional close-up of a model applying ${product.name}, focusing on the smooth texture and vibrant color.`;
                    break;
                default:
                    basePrompt = `A lifestyle preview of the ${product.name} in a ${vibe} studio setting.`;
            }
        }

        const lighting = vibe === 'hype' ? 'dynamic flashing neon lights' : 
                         vibe === 'chill' ? 'soft warm morning light' : 
                         vibe === 'professional' ? 'clean studio lighting' : 'natural light';

        return `${basePrompt} \nSetting: ${lighting} against a pure green screen. \nVisual only, no audio. High-end commercial aesthetic, 4k, 60fps, professional color grading.`;
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
