import { useI18n } from 'vue-i18n';

export interface PitchConfig {
    product: any;
    vibe: string;
    chatContext?: string[];
    language: 'vi-VN' | 'en-US';
}

export class ProductPitchService {
    /**
     * Generates a dynamic, interactive script for the AIdol/VTuber to say when a product is highlighted.
     */
    public static generateScript(config: PitchConfig): string {
        const { product, vibe, chatContext, language } = config;
        
        let intro = '';
        let benefits = '';
        let cta = '';
        let interactivity = '';

        if (language === 'vi-VN') {
            intro = `Các bạn ơi, nhìn xem mình đang có gì nè! Đây là ${product.name}, một sản phẩm cực kỳ xịn sò luôn!`;
            benefits = `${product.description || 'Sản phẩm này có thiết kế rất hiện đại và chất lượng tuyệt vời.'} `;
            cta = `Giá chỉ có ${product.price} ${product.currency || 'VNĐ'} thôi. Mọi người nhanh tay nhấn vào link hoặc quét mã QR trên màn hình để sở hữu ngay nhé!`;
            
            if (chatContext && chatContext.length > 0) {
                const randomUser = chatContext[Math.floor(Math.random() * chatContext.length)];
                interactivity = `Bạn ${randomUser} ơi, sản phẩm này hợp với bạn lắm luôn đó! `;
            }
        } else {
            intro = `Hey everyone, look what I have here! This is the ${product.name}, and it's absolutely amazing!`;
            benefits = `${product.description || 'It features a sleek design and outstanding quality.'} `;
            cta = `It's only ${product.price} ${product.currency || 'USD'}. Click the link or scan the QR code on screen to get yours now!`;

            if (chatContext && chatContext.length > 0) {
                const randomUser = chatContext[Math.floor(Math.random() * chatContext.length)];
                interactivity = `${randomUser}, I think you would really love this one! `;
            }
        }

        // Add vibe-specific flair
        let flair = '';
        if (vibe === 'hype') {
            flair = language === 'vi-VN' ? ' Chốt đơn ngay kẻo lỡ mọi người ơi, bùng nổ quá! 🔥' : ' Grab it now before it\'s gone, let\'s go! 🔥';
        } else if (vibe === 'chill') {
            flair = language === 'vi-VN' ? ' Một lựa chọn tuyệt vời cho ngày cuối tuần nhẹ nhàng.' : ' A perfect choice for a relaxed weekend.';
        }

        return `${intro} ${interactivity}${benefits} ${cta}${flair}`;
    }
}
