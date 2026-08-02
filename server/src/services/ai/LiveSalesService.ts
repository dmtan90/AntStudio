import { promptService } from './PromptService.js';
import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { Types } from 'mongoose';
import { Influencer } from '../../models/Influencer.js';
import { Product } from '../../models/Product.js';
import { videoWorkflow } from './VideoWorkflow.js';

export class LiveSalesService {
    /**
     * Prepares a live session by ensuring all products have review videos.
     * If a video is missing in the Influencer's aidolClips, it triggers generation.
     */
    public async prepareProductVideos(influencerId: string, productIds: string[]) {
        const influencer = await Influencer.findOne({ entityId: influencerId });
        if (!influencer) {
            throw new Error(`Influencer ${influencerId} not found`);
        }

        // const clips = influencer.visual?.aidolClips || new Map<string, string>();
        const results = [];

        for (const productId of productIds) {
            try{
                const result = await this.prepareProductVideo(influencerId, productId);
                results.push(result);
            }catch(error){
                results.push({ productId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
            }
            // const product = await Product.findById(productId);
            // if (!product) continue;

            // // Check if video exists for this product in aidolClips
            // const existingUrl = clips instanceof Map ? clips.get(productId) : (clips as any)[productId];
            
            // if (existingUrl) {
            //     Logger.info(`[SalesEngine] Found existing video for product ${productId} in aidolClips.`);
            //     results.push({ productId, videoUrl: existingUrl, status: 'existing' });
            //     continue;
            // }

            // // [REFINEMENT] If influencer is NOT AIDOL, use product's default video
            // if (influencer.visual?.modelType && influencer.visual.modelType !== 'aidol') {
            //     if (product.video) {
            //         Logger.info(`[SalesEngine] Non-AIDOL influencer. Using product's default video for ${productId}.`);
            //         results.push({ productId, videoUrl: product.video, status: 'existing' });
            //         continue;
            //     } else {
            //         Logger.warn(`[SalesEngine] Non-AIDOL influencer, but product ${productId} has no video.`);
            //     }
            // }

            // // If not found (and is AIDOL or AIDOL generation required), trigger generation
            // Logger.info(`[SalesEngine] Video missing or AIDOL generation required for product ${productId}. Triggering simplified AI generation...`);
            
            // try {
            //     const language = influencer?.meta?.voiceConfig?.language || 'en-US';
                
            //     // Trigger real generation via AIGenerator - SIMPLIFIED: 8s, No storyboard/script needed
            //     const { generateVideo } = await import('../../utils/AIGenerator.js');
            //     const videoResult = await generateVideo({
            //         prompt: `Professional green screen video of ${influencer.identity.name} demonstrating ${product.name}. 
            //                  Influencer should speak naturally about ${product.name} in ${language} with expressive facial movements. 
            //                  Focus on high-quality product showcase. No background, transparent/green screen.`,
            //         duration: 8, // Fixed to 8 seconds
            //         aspectRatio: '9:16', 
            //         characterImages: [influencer.visual?.thumbnailUrl as string, product.image as string],
            //         metadata: {
            //             productId,
            //             influencerId: influencer.entityId,
            //             type: 'sales_review_minimal'
            //         },
            //         useGreenScreen: true,
            //         shouldNormalize: true
            //     });
                
            //     const videoUrl = videoResult.url;

            //     // Save the videoUrl to aidolClips
            //     if (!influencer.visual) influencer.visual = {};
            //     if (!influencer.visual.aidolClips) influencer.visual.aidolClips = new Map<string, string>();
                
            //     if (influencer.visual.aidolClips instanceof Map) {
            //         influencer.visual.aidolClips.set(productId, videoUrl);
            //     } else {
            //         (influencer.visual.aidolClips as any)[productId] = videoUrl;
            //     }
                
            //     influencer.markModified('visual.aidolClips');
            //     await influencer.save();
                
            //     results.push({ productId, videoUrl, status: 'existing' });
            // } catch (error) {
            //     Logger.error(`[SalesEngine] Failed to generate video for ${productId}:`, error);
            //     results.push({ productId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
            // }
        }

        return results;
    }

    /**
     * Prepares a live session by ensuring all products have review videos.
     * If a video is missing in the Influencer's aidolClips, it triggers generation.
     */
    public async prepareProductVideo(influencerId: string, productId: string, language?: string) {
        const influencer = await Influencer.findOne({ entityId: influencerId });
        if (!influencer) {
            throw new Error(`Influencer ${influencerId} not found`);
        }

        const product = await Product.findById(productId);
        if (!product){
            throw new Error(`Product ${productId} not found`);
        };

        // const clips = influencer.visual?.aidolClips || new Map<string, string>();
        
        // // Check if video exists for this product in aidolClips
        // const existingUrl = clips instanceof Map ? clips.get(productId) : (clips as any)[productId];
        
        // if (existingUrl) {
        //     Logger.info(`[SalesEngine] Found existing video for product ${productId} in aidolClips.`);
        //     return { productId, videoUrl: existingUrl, status: 'existing' };
        // }

        // [REFINEMENT] If influencer is NOT AIDOL, use product's default video (only for intro)
        if (influencer.visual?.modelType && influencer.visual.modelType !== 'aidol') {
            if (product.video) {
                Logger.info(`[SalesEngine] Non-AIDOL influencer. Using product's default video for ${productId}.`);
                return { productId, videoUrl: product.video, status: 'existing' };
            }
        }

        // If not found (and is AIDOL or AIDOL generation required), trigger generation
        Logger.info(`[SalesEngine] video missing or AIDOL generation required for product ${productId}. Triggering simplified AI generation...`);
        
        try {
            const finalLanguage = language || influencer?.meta?.voiceConfig?.language || 'en-US';
            const description = product.description;
            let images = [product.image];
            if (product.images && product.images.length > 0) {
                for(const image of product.images){
                    if(image !== product.image){
                        images.push(image);
                        if(images.length === 2){
                            break;
                        }
                    }
                }
            }

            // Trigger real generation via AIGenerator - SIMPLIFIED: 8s, No storyboard/script needed
            const { generateVideo } = await import('../../utils/AIGenerator.js');
            const baseFrameUrl = influencer.visual?.thumbnailUrl as string;
            const videoResult = await generateVideo({
                prompt: `Professional green screen video of ${influencer.identity.name} introducing ${product.name}. 
                        Influencer should speak naturally about ${product.name} with the highlight features '${description}' exactly in '${finalLanguage}' with expressive facial movements. 
                        Focus on high-quality product showcase. No background, transparent/green screen.`,
                duration: 8, // Fixed to 8 seconds
                aspectRatio: '9:16', 
                characterImages: [baseFrameUrl, ...images],
                imageStart: baseFrameUrl,
                imageEnd: baseFrameUrl,
                metadata: {
                    productId,
                    influencerId: influencer.entityId,
                    type: 'sales_review_minimal'
                },
                useGreenScreen: true,
                shouldNormalize: true
            });
            
            const videoUrl = videoResult.url;

            // Save the videoUrl to aidolClips
            if (!influencer.visual) influencer.visual = {};
            if (!influencer.visual.aidolClips) influencer.visual.aidolClips = new Map<string, string>();
            
            if (influencer.visual.aidolClips instanceof Map) {
                influencer.visual.aidolClips.set(productId, videoUrl);
            } else {
                (influencer.visual.aidolClips as any)[productId] = videoUrl;
            }
            
            influencer.markModified('visual.aidolClips');
            await influencer.save();
            
            return { productId, videoUrl, status: 'existing' };
        } catch (error) {
            Logger.error(`[SalesEngine] Failed to generate video for ${productId}:`, error);
            return { productId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Gets the current playlist of videos for a live session.
     */
    public async getSessionPlaylist(influencerId: string, productIds: string[]) {
        const influencer = await Influencer.findOne({ entityId: influencerId });
        if (!influencer) return [];

        const clips = influencer.visual?.aidolClips || new Map<string, string>();
        return productIds.map(pid => {
            const url = clips instanceof Map ? clips.get(pid) : (clips as any)[pid];
            return url ? { productId: pid, videoUrl: url } : null;
        }).filter(Boolean);
    }

    /**
     * Generates a coordinated multi-person sales script.
     * AssignmentMap: Record<productId, influencerId>
     */
    public async generateMultiPersonScript(assignmentMap: Record<string, string>, language: string = 'en-US') {
        const productIds = Object.keys(assignmentMap);
        const products = await Product.find({ _id: { $in: productIds.map(id => new Types.ObjectId(id)) } });
        
        const influencerIds = Array.from(new Set(Object.values(assignmentMap)));
        const influencers = await Influencer.find({ entityId: { $in: influencerIds } });

        // Phase 125: Chunking for LLM stability (Max 3 products per call)
        const chunkSize = 2;
        const productIdChunks = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
            productIdChunks.push(productIds.slice(i, i + chunkSize));
        }

        let fullScript: any[] = [];
        Logger.info(`[SalesEngine] Chunking storyboard generation into ${productIdChunks.length} parts for ${productIds.length} products.`);

        for (let i = 0; i < productIdChunks.length; i++) {
            const currentProductIds = productIdChunks[i];
            const isFirst = i === 0;
            const isLast = i === productIdChunks.length - 1;

            const chunkProducts = products.filter(p => currentProductIds.includes(p._id.toString()));
            
            const influencerAssignments = influencers.map((inf: any) => {
                const assignedProductIds = Object.entries(assignmentMap)
                    .filter(([pid, iid]) => iid === inf.entityId && currentProductIds.includes(pid))
                    .map(([pid]) => pid);
                
                const assignedProductNames = products
                    .filter((p: any) => assignedProductIds.includes(p._id.toString()))
                    .map((p: any) => p.name);
                
                if (assignedProductNames.length === 0) {
                     return `- **${inf.identity.name}** (${inf.jobRole || 'Influencer'}): Supporting the session and interacting with others.`;
                }
                
                return `- **${inf.identity.name}** (${inf.jobRole || 'Influencer'}): Leading the showcase for ${assignedProductNames.join(', ')}.`;
            }).join('\n');

            const productContext = chunkProducts.map((p: any) => {
                return `- **${p.name}** (ID: ${p._id.toString()}): ${p.description}. Price: ${p.price} ${p.currency}. Features: ${p.features.join(', ')}`;
            }).join('\n');

            let sessionFlowPrompt = "";
            if (isFirst && isLast) {
                sessionFlowPrompt = "Generate a complete session script including an introduction, full product showcases for the listed items, and a closing wrap-up.";
            } else if (isFirst) {
                sessionFlowPrompt = "Generate the START of a live session. Include a natural introduction/greeting for the influencers, then proceed to showcase ONLY the listed products. Do NOT end the session yet.";
            } else if (isLast) {
                sessionFlowPrompt = "This is the FINAL part of the session. Showcase the listed products, then provide a high-energy closing summary of all products mentioned today, thank the audience, and a call-to-action.";
            } else {
                sessionFlowPrompt = "This is a CONTINUATION of the session. Directly transition from the previous products and showcase the next set of items listed. Keep the momentum high.";
            }

            const prompt = await promptService.get('sales/multi_person_script', {
                topic: `Live Sales for ${chunkProducts.map((p: any) => p.name).join(', ')}`,
                language,
                vibe: 'hype',
                influencerAssignments,
                productContext,
                sessionFlowPrompt
            });

            try {
                const chunkScript = await generateJSON<any[]>(prompt, undefined);
                if (Array.isArray(chunkScript)) {
                    fullScript = [...fullScript, ...chunkScript];
                }
            } catch (error) {
                Logger.error(`[LiveSalesService] Chunk ${i} generation failed:`, error);
                // Continue with partial script if one chunk fails? Or throw?
                // For now throw to avoid broken scripts
                throw error;
            }
        }

        return fullScript;
    }
}

export const liveSalesService = new LiveSalesService();
