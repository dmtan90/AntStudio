import { GeminiChatProvider } from '../../utils/ai/providers/GeminiChatProvider.js';
import { uploadToS3 } from '../../utils/s3.js';
import { NeuralArchiveService } from '../NeuralArchiveService.js';
import config from '../../utils/config.js';

export class DigitalDoubleService {
    private gemini: GeminiChatProvider;

    constructor() {
        this.gemini = new GeminiChatProvider();
    }

    /**
     * Orchestrates the generation of a Digital Double (3D Texture) from a photo.
     */
    async generateDigitalDouble(userId: string, entityId: string, imageBuffer: Buffer, mimeType: string): Promise<any> {
        console.log(`[DigitalDoubleService] Starting generation for entity: ${entityId}`);

        // 1. Upload source photo to S3 for persistence
        const sourcePath = `neural/${userId}/${entityId}/source_${Date.now()}.png`;
        const sourceS3 = await uploadToS3(sourcePath, imageBuffer, mimeType);
        const sourceUrl = sourceS3.url || sourceS3.key;

        // 2. Use Gemini 2.0 Flash to analyze the photo and generate a technical prompt for Imagen
        const base64Image = imageBuffer.toString('base64');

        const analysisPrompt = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            {
                text: `Analyze this person's facial features, skin tone, eye color, and hair style. 
                Then, generate a highly detailed technical prompt for an AI Image Generator (Imagen 3.5) to create a professional 4K UV Head Texture Map.
                
                The generated prompt MUST follow this format:
                "A professional 4K UV head texture map, unwrapped flat, including front, sides and ears. Features: [SPECIFIC FEATURES FROM PHOTO]. Skin tone: [SKIN TONE]. Lighting: Flat, no highlights, neutral. Style: Hyper-realistic 3D asset, game engine ready, high frequency skin detail, pore detail."
                
                Return ONLY the generated prompt string.`
            }
        ];

        const imagenPrompt = await this.gemini.generateText(analysisPrompt, 'gemini-2.0-flash');
        console.log(`[DigitalDoubleService] Synthesized Imagen Prompt: ${imagenPrompt}`);

        // 3. Call Imagen 3.5 to generate the actual texture map
        const imageResult = await this.gemini.generateImage(imagenPrompt, 'imagen-3.0-generate-001');

        if (!imageResult || !imageResult.media?.url) {
            throw new Error('Failed to generate texture map via Imagen');
        }

        // 4. Upload the generated texture map to S3
        const textureBase64 = imageResult.media.url.split(',')[1];
        const textureBuffer = Buffer.from(textureBase64, 'base64');
        const texturePath = `neural/${userId}/${entityId}/texture_${Date.now()}.png`;
        const textureS3 = await uploadToS3(texturePath, textureBuffer, 'image/png');
        const textureUrl = textureS3.url || textureS3.key;

        // 5. Update Neural Archive with the new visual identity
        const visualIdentity = {
            avatarUrl: sourceUrl,
            textureMapUrl: textureUrl,
            glbUrl: '/assets/models/humanoid_base.glb', // Default base model
            lastGenerated: new Date()
        };

        await NeuralArchiveService.updateVisualIdentity(userId, entityId, visualIdentity);

        return visualIdentity;
    }
}

export const digitalDoubleService = new DigitalDoubleService();
