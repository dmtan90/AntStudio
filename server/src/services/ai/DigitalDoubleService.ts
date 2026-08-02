import { uploadToS3 } from '../../utils/s3.js';
import { InfluencerService } from '../streaming/InfluencerService.js';
import { Logger } from '../../utils/Logger.js';
import { generateText, generateImage } from '../../utils/AIGenerator.js';
import { promptService } from './PromptService.js';

export class DigitalDoubleService {
    constructor() {}

    /**
     * Orchestrates the generation of a Digital Double (3D Texture) from a photo.
     */
    async generateDigitalDouble(userId: string, entityId: string, imageBuffer: Buffer, mimeType: string): Promise<any> {
        Logger.info(`[DigitalDoubleService] Starting generation for entity: ${entityId}`);

        // 1. Upload source photo to S3 for persistence
        const sourcePath = `influencer/${userId}/${entityId}/source_${Date.now()}.png`;
        const sourceS3 = await uploadToS3(sourcePath, imageBuffer, mimeType);
        const sourceUrl = sourceS3.key;

        // 2. Use AIGenerator to analyze the photo and generate a technical prompt for Imagen
        const base64Image = imageBuffer.toString('base64');
        const promptTemplate = await promptService.get('ai/digital_double_analysis');

        const analysisPrompt = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            {
                text: promptTemplate
            }
        ];

        const imagenPrompt = await generateText(analysisPrompt, undefined);
        Logger.info(`[DigitalDoubleService] Synthesized Imagen Prompt: ${imagenPrompt}`);

        // 3. Call Imagen to generate the actual texture map via AIGenerator
        const visualPrompt = `(3D Texture Map, Albedo, Flat Lighting, Delit, UV Unwrapped) ${imagenPrompt}`;

        const { s3Key } = await generateImage(
            visualPrompt,
            userId, // Project ID / User ID context
            `texture_${Date.now()}`,
            {
                 s3Key: `influencer/${userId}/${entityId}/texture_${Date.now()}.png`
            }
        );

        if (!s3Key) {
            throw new Error('Failed to generate texture map via Imagen');
        }

        const textureUrl = s3Key;

        // 4. Update Influencer with the new visual identity
        const visual = {
            modelType: '3d' as const,
            modelUrl: '/assets/models/humanoid_base.glb', // Default base model
            lastGenerated: new Date()
        };

        await InfluencerService.updateVisual(userId, entityId, visual);

        return visual;
    }
}

export const digitalDoubleService = new DigitalDoubleService();
