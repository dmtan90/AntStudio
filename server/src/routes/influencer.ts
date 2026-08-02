import express, { Response } from 'express';
import { InfluencerService } from '~/services/streaming/InfluencerService.js';
import { authMiddleware, AuthRequest } from '~/middleware/auth.js';
import { rbacMiddleware } from '~/middleware/rbac.js';
import { Permission } from '~/utils/permissions.js';
import { Influencer } from '~/models/Influencer.js';
//import { digitalDoubleService } from '../services/ai/DigitalDoubleService.js';
import multer from 'multer';
import { liveSalesService } from '~/services/ai/LiveSalesService.js';
import { Logger } from '~/utils/Logger.js';
import { generateImage, translateContent, generateText, generateVideo } from '../utils/AIGenerator.js';
import { deductCredits, getCreditCost } from '~/utils/credits.js';
import { configService, EnvConfig } from '~/utils/ConfigService.js';
import { AIModelType, getAdminSettings } from '~/models/AdminSettings.js';
import { GoogleTTSProvider } from '~/utils/ai/providers/GoogleTTSProvider.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import { Media } from '~/models/Media.js';
import { aiAccountManager } from '~/utils/ai/AIAccountManager.js';
import { AIAccountProvider } from '~/models/AIAccount.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// All Influencer operations require authentication
router.use(authMiddleware);

/**
 * GET /api/influencer/list - List all persistent Influencers
 * IMPORTANT: This must be BEFORE /:entityId to avoid "list" being treated as an entityId
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 12;
        const skip = (page - 1) * limit;

        const userId = req.user!.userId;
        const total = await Influencer.countDocuments({ userId });
        const influencers = await Influencer.find({ userId })
            .sort({ lastUpdated: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: influencers,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/influencer/voices/:provider - Fetch dynamic voice list from provider
 */

router.get('/voices/:provider', async (req: AuthRequest, res: Response) => {
    try {
        const { provider } = req.params;
        const { language } = req.query; // Optional language filter

        if(!provider){
            return res.status(400).json({ success: false, error: `Unsupported provider:${provider}` });
        }

        let lisVoices: any[] = [];
        if(provider === AIAccountProvider.GOOGLE){
            lisVoices = await AIServiceManager.getInstance().getVoiceList(AIAccountProvider.GOOGLE, language as string);
        }
        else if(provider === AIAccountProvider.GEMINI){
            lisVoices = await AIServiceManager.getInstance().getVoiceList(AIAccountProvider.GEMINI, language as string);
        }
        else{
            Logger.error(`Unsupported provider.${provider}`);
        }
        return res.json({ success: true, data: lisVoices });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Voice List Fetch Failed:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/influencer/:entityId - Retrieve Influencer soul/identity
 */
router.get('/:entityId', async (req: AuthRequest, res: Response) => {
    try {
        const influencer = await InfluencerService.getOrCreateInfluencer(
            req.user!.userId,
            req.params.entityId,
            req.query.name as string || req.params.entityId,
            (req as any).user?.currentOrganizationId
        );
        res.json({ success: true, data: influencer });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/update - Holistic synchronization
 */
router.post('/:entityId/update', rbacMiddleware(Permission.AI_TUNE), async (req: AuthRequest, res: Response) => {
    try {
        await InfluencerService.updateInfluencer(req.user!.userId, req.params.entityId, req.body);
        res.json({ success: true, message: 'Influencer updated and synchronized.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/sync-clips - Specialized clips synchronization
 */
router.post('/:entityId/sync-clips', async (req: AuthRequest, res: Response) => {
    try {
        const { aidolClips } = req.body;
        await InfluencerService.syncAidolClips(req.user!.userId, req.params.entityId, aidolClips);
        res.json({ success: true, message: 'Aidol clips synchronized.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/event - Persist tactical memory
 */
router.post('/:entityId/event', async (req: AuthRequest, res: Response) => {
    try {
        const { missionId, description } = req.body;
        await InfluencerService.archiveEvent(req.user!.userId, req.params.entityId, missionId, description);
        res.json({ success: true, message: 'Mission event archived to Influencer memory.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/digital-double - Generate 3D texture map from photo
 */
router.post('/:entityId/digital-double', upload.single('photo'), async (req: AuthRequest, res: Response) => {
    /*try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

        const visual = await digitalDoubleService.generateDigitalDouble(
            req.user!.userId,
            req.params.entityId,
            file.buffer,
            file.mimetype
        );

        res.json({ success: true, data: visual, message: 'Influencer Digital Double initialized.' });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Digital Double Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }*/
	res.status(500).json({ success: false, error: "Deprecated: Not support this mode" });
});

/**
 * POST /api/influencer/:entityId/model - Upload custom 3D Base Model
 */
import { aiGuestService } from '../services/ai/AIGuestService.js';

/**
 * POST /api/influencer/:entityId/interact/chat - Trigger chat reaction
 */
router.post('/:entityId/interact/chat', async (req: AuthRequest, res: Response) => {
    try {
        const { userName, message } = req.body;
        const result = await aiGuestService.generateChatReaction(
            req.user!.userId,
            req.params.entityId,
            userName,
            message
        );
        res.json({ success: true, data: result });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/interact/gift - Trigger gift reaction
 */
router.post('/:entityId/interact/gift', async (req: AuthRequest, res: Response) => {
    try {
        const { userName, giftName, amount } = req.body;
        const result = await aiGuestService.generateGiftReaction(
            req.user!.userId,
            req.params.entityId,
            userName,
            giftName,
            amount
        );
        res.json({ success: true, data: result });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/interact/poll - Trigger poll reaction
 */
router.post('/:entityId/interact/poll', async (req: AuthRequest, res: Response) => {
    try {
        const { question, winner } = req.body;
        const result = await aiGuestService.generatePollReaction(
            req.user!.userId,
            req.params.entityId,
            question,
            winner
        );
        res.json({ success: true, data: result });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});



/**
 * POST /api/influencer/:entityId/performance - Update visual effects config
 */
router.post('/:entityId/performance', async (req: AuthRequest, res: Response) => {
    try {
        await InfluencerService.updatePerformanceConfig(
            req.user!.userId,
            req.params.entityId,
            req.body
        );
        res.json({ success: true, message: 'Performance settings updated' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/animation - Update motion config
 */
router.post('/:entityId/animation', async (req: AuthRequest, res: Response) => {
    try {
        await InfluencerService.updateAnimationConfig(
            req.user!.userId,
            req.params.entityId,
            req.body
        );
        res.json({ success: true, message: 'Animation settings updated' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/influencer/:entityId/analytics - Get engagement stats
 */
router.get('/:entityId/analytics', async (req: AuthRequest, res: Response) => {
    try {
        const influencer = await InfluencerService.getOrCreateInfluencer(
            req.user!.userId,
            req.params.entityId,
            req.params.entityId
        );
        
        res.json({ 
            success: true, 
            data: {
                analytics: influencer.analytics || {},
                recentInteractions: influencer.interactions || []
            } 
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/model - Upload custom 3D Base Model
 */
import { uploadToS3 } from '../utils/s3.js';
import { ServiceType } from '~/utils/CreditManager.js';
import { AIServiceManager } from '~/utils/ai/AIServiceManager.js';

router.post('/:entityId/model', upload.single('model'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No model file uploaded' });

        const userId = req.user!.userId;
        const entityId = req.params.entityId;
        const ext = file.originalname.split('.').pop() || 'glb';
        const path = `influencer/${userId}/${entityId}/model_${Date.now()}.${ext}`;

        const s3Result = await uploadToS3(path, file.buffer, 'application/octet-stream');
        const modelUrl = s3Result.key;

        // Update Influencer
        const influencer = await Influencer.findOne({ entityId, userId });
        if (!influencer) throw new Error('Influencer not found');

        if (!influencer.visual) influencer.visual = {};
        influencer.visual.modelUrl = modelUrl;
        await influencer.save();

        res.json({ success: true, data: { modelUrl }, message: 'Influencer model uploaded successfully.' });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Model Upload Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// import { AIModelType, getAdminSettings } from '../models/AdminSettings.js';
// import { GoogleTTSProvider } from '../utils/ai/providers/GoogleTTSProvider.js';
// import { GeminiClient } from '../integrations/ai/GeminiClient.js';
// import { Media } from '~/models/Media.js';
// import { AIAccountProvider } from '~/models/AIAccount.js';

/**
 * GET /api/influencer/voices/:provider - Fetch dynamic voice list from provider
 */
// router.get('/voices/:provider', async (req: AuthRequest, res: Response) => {
//     try {
//         const { provider } = req.params;
//         const { language } = req.query; // Optional language filter
        
//         const settings = await getAdminSettings();
        
//         if (provider === AIAccountProvider.GOOGLE) {
//             // Google TTS
            
//             const account = await aiAccountManager.getOptimalAccount(AIModelType.AUDIO);
            
//             const config: any = {};
            
//             if (account && account.providerId === AIAccountProvider.GOOGLE) {
//                 const token = await aiAccountManager.refreshAccessToken(account);
//                 config.accessToken = token;
//                 config.projectId = account.projectId;
//             } else {
//                 const googleProvider = settings.aiSettings.providers.find((p: any) => p.id === AIAccountProvider.GOOGLE || p.id === AIAccountProvider.GOOGLE_VERTEX);
//                 config.apiKey = googleProvider?.apiKey || process.env.GOOGLE_API_KEY;
//                 config.serviceAccount = (googleProvider as any)?.serviceAccount || EnvConfig.googleApplicationCredentials;
//             }
            
//             if (!config.apiKey && !config.accessToken && !config.serviceAccount) {
//                 return res.status(500).json({ success: false, error: 'Google TTS not configured' });
//             }
            
//             const ttsProvider = new GoogleTTSProvider(config);
//             const voices = await ttsProvider.listVoices(language as string);
            
//             const formattedVoices = voices.map((v: any) => ({
//                 id: v.name,
//                 name: v.name,
//                 language: v.languageCodes?.[0] || 'en-US',
//                 gender: v.ssmlGender || 'NEUTRAL',
//                 provider: 'google',
//                 audioSampleUrl: `https://cloud.google.com/static/text-to-speech/docs/audio/${v.name}.wav`
//             }));
            
//             return res.json({ success: true, data: formattedVoices });
//         }
//         else if (provider === AIAccountProvider.GEMINI) {
//             // Gemini TTS
//             const geminiProvider = settings.aiSettings.providers.find((p: any) => p.id === AIAccountProvider.GOOGLE || p.id === AIAccountProvider.GOOGLE_VERTEX);
//             let apiKey = geminiProvider?.apiKey || EnvConfig.geminiApiKey;
            
//             if (!apiKey) {
//                 return res.status(500).json({ success: false, error: 'Google API Key not configured' });
//             }
            
//             const client = new GeminiClient({ apiKey });
//             const voices = await client.listVoices();
            
//             return res.json({ success: true, data: voices });
//         }
//         else {
//             return res.status(400).json({ success: false, error: 'Unsupported provider.' });
//         }
//     } catch (e: any) {
//         Logger.error('[InfluencerRoute] Voice List Fetch Failed:', e.message);
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

/**
 * DELETE /api/influencer/:entityId - Delete a Influencer
 */
router.delete('/:entityId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const entityId = req.params.entityId;

        const result = await Influencer.findOneAndDelete({ 
            userId, 
            entityId 
        });

        if (!result) {
            return res.status(404).json({ success: false, error: 'Influencer not found' });
        }

        res.json({ success: true, message: 'Influencer permanently deleted.' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/voice-preview
 */
router.post('/voice-preview', async (req: AuthRequest, res: Response) => {
    try {
        const { text, provider, voiceId, language, speed, pitch } = req.body;

        if (!text || !provider || !voiceId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const { TTSService } = await import('../services/ai/TTSService.js');
        const ttsService = new TTSService();

        const audioResult = await ttsService.generateSpeech({
            text,
            provider,
            voiceId,
            language: language || 'en-US',
            speed,
            pitch
        });

        res.json({ 
            success: true, 
            data: {
                audioUrl: audioResult.media.url,
                mimeType: audioResult.media.mimeType
            }
        });
    } catch (e: any) {
        Logger.error('[Influencer] Voice preview generation failed:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/influencer/generate-video
// Generate video for influencer
router.post('/generate-video', async (req: AuthRequest, res) => {
    try {
        const { prompt, duration, characterImages } = req.body;
        const effectiveDuration = duration || 8;

        // Credit Deduction
        const baseCreditCost = await getCreditCost(AIModelType.VIDEO);
        const creditAmount = Math.ceil(effectiveDuration * baseCreditCost);
        const deductionDescription = `Generate Video (Generic) - ${effectiveDuration}s @ ${baseCreditCost} cr/s`;

        try {
            await deductCredits(req.user!.userId, ServiceType.VIDEO, creditAmount, deductionDescription);
        } catch (creditError: any) {
            return res.status(402).json({ success: false, error: creditError.message || 'Insufficient credits' });
        }

        const userId = req.user!.userId;
        const { url, jobId: returnedJobId } = await generateVideo({
            prompt,
            duration: effectiveDuration,
            aspectRatio: '9:16',
            characterImages: characterImages,
            metadata: {
                projectId: userId,
                filename: req.body.filename || `gen_vid_${Date.now()}`
            },
            useGreenScreen: true,
            shouldNormalize: true
        });

        const jobId = returnedJobId || `gen-fallback-${Date.now()}`;
        const existingMedia = await Media.findOne({
            $or: [
                { 'metadata.jobId': jobId },
                { 'key': url }
            ]
        });

        let media = existingMedia;
        if (!media) {
            media = await Media.create({
                userId,
                key: url,
                fileName: `AI Video - ${jobId}`,
                contentType: 'video/mp4',
                size: 0,
                bucket: configService.bucketName, // Consistent with images
                purpose: 'ai-video',
                metadata: {
                    jobId,
                    status: 'completed',
                    prompt
                }
            });
        }

        return res.json({ success: true, data: { media, url } });
    } catch (error: any) {
        Logger.error('Video generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate video' });
    }
});

/**
 * POST /api/influencer/:entityId/generate-product-video
 * Triggers autonomous video generation for product.
 */
router.post('/:entityId/generate-product-video', async (req: AuthRequest, res: Response) => {
    try {
        const { productId, language } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, error: 'ProductId is required' });
        }

        const result = await liveSalesService.prepareProductVideo(req.params.entityId, productId, language);
        
        // If any result failed, return 400 to signal error to the client
        // const hasFailures = results.some(r => r.status === 'failed');
        // if (hasFailures) {
        //     return res.status(400).json({ 
        //         success: false, 
        //         data: results, 
        //         message: 'The product failed video generation.' 
        //     });
        // }

        res.json({ success: true, data: result, message: 'Autonomous product video generation triggered.' });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Product Video Generation Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/influencer/:entityId/sales/playlist
 * Returns the active sales video playlist.
 */
router.get('/:entityId/sales/playlist', async (req: AuthRequest, res: Response) => {
    try {
        const { productIds } = req.query;
        const pIds = typeof productIds === 'string' ? productIds.split(',') : (Array.isArray(productIds) ? productIds as string[] : []);
        
        const playlist = await liveSalesService.getSessionPlaylist(req.params.entityId, pIds);
        res.json({ success: true, data: playlist });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/co-host/toggle
 */
router.post('/:entityId/co-host/toggle', async (req: AuthRequest, res: Response) => {
    try {
        const { coHostId, action } = req.body;
        if (!coHostId || !action) {
            return res.status(400).json({ success: false, error: 'coHostId and action are required' });
        }
        await InfluencerService.toggleCoHost(req.user!.userId, req.params.entityId, coHostId, action);
        res.json({ success: true, message: `Co-host ${action === 'add' ? 'added to' : 'removed from'} session.` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/:entityId/collaborator/toggle
 */
router.post('/:entityId/collaborator/toggle', async (req: AuthRequest, res: Response) => {
    try {
        const { collaboratorId, action } = req.body;
        if (!collaboratorId || !action) {
            return res.status(400).json({ success: false, error: 'collaboratorId and action are required' });
        }
        await InfluencerService.toggleCollaborator(req.user!.userId, req.params.entityId, collaboratorId, action);
        res.json({ success: true, message: `Collaborator ${action === 'add' ? 'added to' : 'removed from'} network.` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});


/**
 * POST /api/influencer/ai/generate-image
 */
router.post('/ai/generate-image', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const config = req.body;
        
        // Deduct credits
        const creditCost = await getCreditCost(AIModelType.IMAGE);
        await deductCredits(userId, ServiceType.IMAGE, creditCost, 'AI Influencer Avatar Generation');

        // Build character context for AIGenerator
        const charContext = {
            name: config.customPrompt?.substring(0, 20) || 'AI Influencer',
            description: config.customPrompt || `Professional ${config.nationality || config.ethnicity || ''} AI Influencer/Avatar`,
            nationality: config.nationality,
            gender: config.gender,
            age: config.age,
            skin_or_fur_color: config.skinColor,
            skin_complexion: [config.nationality, config.ethnicity, config.skinType, config.skinCondition].filter(Boolean).join(', '),
            hair: config.hairType,
            eye_color: config.eyeColor,
            eyes: config.eyesType,
            species: config.characterType === 'human' ? 'human' : config.characterType
        };

        const { s3Key } = await generateImage(
            config.customPrompt || `Professional ${config.nationality || ''} portrait`,
            userId,
            `influencer_avatar_${Date.now()}`,
            {
                generationType: 'character',
                characterContext: [charContext],
                aspectRatio: '9:16',
                views: 'front view',
                greenScreen: false,
                videoStyle: config.style || "realistic"
            }
        );

        res.json({ success: true, data: {imageUrl: s3Key} });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] AI Image Gen Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/ai/analyze-vision
 */
router.post('/ai/analyze-vision', upload.single('image'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        const { prompt } = req.body;
        if (!file) return res.status(400).json({ success: false, error: 'No image uploaded' });

        const creditCost = await getCreditCost(AIModelType.IMAGE);
        await deductCredits(req.user!.userId, ServiceType.IMAGE, creditCost, 'Influencer Vision Analysis');

        // Vision analysis logic using generateText with multi-modal support
        const result = await generateText(prompt || 'Analyze this image for influencer personality alignment', undefined, {
            image: file.buffer,
            mimeType: file.mimetype
        });

        res.json({ success: true, data: result });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Vision Analysis Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/ai/translate
 */
router.post('/ai/translate', async (req: AuthRequest, res: Response) => {
    try {
        const { text, targetLanguage } = req.body;
        if (!text || !targetLanguage) return res.status(400).json({ success: false, error: 'Text and targetLanguage are required' });

        const result = await translateContent(text, targetLanguage);
        res.json({ success: true, data: result });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Translation Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/sales/orchestrate
 * Generates a coordinated multi-person sales script/storyboard.
 */
router.post('/sales/orchestrate', async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentMap, language, productIds, influencerIds } = req.body;
        if (!assignmentMap) {
            return res.status(400).json({ success: false, error: 'Assignment map is required' });
        }
        
        // Multi-person coordination script
        const script = await liveSalesService.generateMultiPersonScript(assignmentMap, language || 'en-US');
        res.json({ success: true, data: { script, productIds, influencerIds } });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Script orchestration failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/influencer/ai/generate-script
 * Generates an engaging speech script for AI Avatar
 */
router.post('/ai/generate-script', async (req: AuthRequest, res: Response) => {
    try {
        const { avatarName, topic, language, style } = req.body;
        const prompt = `As a viral video scriptwriter, write a compelling, natural, short 2-3 sentence speech script for an AI avatar named "${avatarName || 'AIDOL Host'}".
Topic / Context: ${topic || 'Welcome video introducing AI content creation and high quality video synthesis'}.

CRITICAL LANGUAGE INSTRUCTION:
- Write the entire speech script in the EXACT SAME language as the Topic / Context provided above (e.g. if the topic is in Vietnamese, write the entire script in natural, fluent Vietnamese; if the topic is in English, write in English).
- Do NOT translate to English if the input topic is written in Vietnamese or another language.

Style: ${style || 'engaging and professional'}.

Return ONLY the plain text script without quotes, markdown headers, or extra formatting.`;

        const scriptText = await generateText(prompt, undefined);
        res.json({ success: true, data: { script: scriptText.trim() } });
    } catch (e: any) {
        Logger.error('[InfluencerRoute] Script generation failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
