import { GeminiChatProvider } from '../../utils/ai/providers/GeminiChatProvider.js';
import { uploadToS3 } from '../../utils/s3.js';
import { VTuberService } from '../VTuberService.js';
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
        const sourcePath = `vtuber/${userId}/${entityId}/source_${Date.now()}.png`;
        const sourceS3 = await uploadToS3(sourcePath, imageBuffer, mimeType);
        const sourceUrl = sourceS3.key;

        // 2. Use Gemini to analyze the photo and generate a technical prompt for Imagen
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
                
                The generated prompt MUST follow this strict technical format:
                "Texture Type: Professional 3D Albedo Map (UV Unwrapped).
                Subject: Human Face [Features from photo].
                Lighting: Flat, Delit, No Shadows, No Specular Highlights, Uniform Ambient Illumination.
                Layout: Symmetrical UV projection, ears fully unwrapped on sides, neck extension at bottom.
                Details: 8k resolution, high frequency pore detail, raw photogrammetry scan style, neutral expression, no makeup, no glasses."
                
                Return ONLY the generated prompt string.`
            }
        ];

        const response = await this.gemini.generateText(analysisPrompt, 'gemini-2.5-flash');
        const imagenPrompt = response.text;
        console.log(`[DigitalDoubleService] Synthesized Imagen Prompt: ${imagenPrompt}`);

        // 3. Call Imagen to generate the actual texture map
        const visualPrompt = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            {
                text: `(3D Texture Map, Albedo, Flat Lighting, Delit, UV Unwrapped) ${imagenPrompt}`
            }
        ];

        const imageResult = await this.gemini.generateImage(visualPrompt, 'gemini-3-pro-image');

        if (!imageResult || !imageResult.media?.url) {
            throw new Error('Failed to generate texture map via Imagen');
        }

        // 4. Upload the generated texture map to S3
        const textureBase64 = imageResult.media.url.split(',')[1];
        const textureBuffer = Buffer.from(textureBase64, 'base64');
        const texturePath = `vtuber/${userId}/${entityId}/texture_${Date.now()}.png`;
        const textureS3 = await uploadToS3(texturePath, textureBuffer, 'image/png');
        const textureUrl = textureS3.key;

        // 5. Update VTuber with the new visual identity
        const visual = {
            modelType: '3d' as const,
            modelUrl: '/assets/models/humanoid_base.glb', // Default base model
            lastGenerated: new Date()
        };

        await VTuberService.updateVisual(userId, entityId, visual);

        return visual;
    }
}

export const digitalDoubleService = new DigitalDoubleService();
