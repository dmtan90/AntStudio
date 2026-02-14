import express, { Response } from 'express';
import { VTuberService } from '../services/VTuberService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { VTuber } from '../models/VTuber.js';
import { digitalDoubleService } from '../services/ai/DigitalDoubleService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// All VTuber operations require authentication
router.use(authMiddleware);

/**
 * GET /api/vtuber/list - List all persistent VTubers
 * IMPORTANT: This must be BEFORE /:entityId to avoid "list" being treated as an entityId
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 12;
        const skip = (page - 1) * limit;

        const userId = req.user!.userId;
        const total = await VTuber.countDocuments({ userId });
        const vtubers = await VTuber.find({ userId })
            .sort({ lastUpdated: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: vtubers,
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
 * GET /api/vtuber/:entityId - Retrieve VTuber soul/identity
 */
router.get('/:entityId', async (req: AuthRequest, res: Response) => {
    try {
        const vtuber = await VTuberService.getOrCreateVTuber(
            req.user!.userId,
            req.params.entityId,
            req.query.name as string || req.params.entityId,
            (req as any).user?.currentOrganizationId
        );
        res.json({ success: true, data: vtuber });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/:entityId/update - Holistic synchronization
 */
router.post('/:entityId/update', rbacMiddleware(Permission.AI_TUNE), async (req: AuthRequest, res: Response) => {
    try {
        await VTuberService.updateVTuber(req.user!.userId, req.params.entityId, req.body);
        res.json({ success: true, message: 'VTuber updated and synchronized.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/:entityId/event - Persist tactical memory
 */
router.post('/:entityId/event', async (req: AuthRequest, res: Response) => {
    try {
        const { missionId, description } = req.body;
        await VTuberService.archiveEvent(req.user!.userId, req.params.entityId, missionId, description);
        res.json({ success: true, message: 'Mission event archived to VTuber memory.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/:entityId/digital-double - Generate 3D texture map from photo
 */
router.post('/:entityId/digital-double', upload.single('photo'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

        const visual = await digitalDoubleService.generateDigitalDouble(
            req.user!.userId,
            req.params.entityId,
            file.buffer,
            file.mimetype
        );

        res.json({ success: true, data: visual, message: 'VTuber Digital Double initialized.' });
    } catch (e: any) {
        console.error('[VTuberRoute] Digital Double Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/:entityId/model - Upload custom 3D Base Model
 */
import { aiGuestService } from '../services/ai/AIGuestService.js';

/**
 * POST /api/vtuber/:entityId/interact/chat - Trigger chat reaction
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
 * POST /api/vtuber/:entityId/interact/gift - Trigger gift reaction
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
 * POST /api/vtuber/:entityId/interact/poll - Trigger poll reaction
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
 * POST /api/vtuber/:entityId/performance - Update visual effects config
 */
router.post('/:entityId/performance', async (req: AuthRequest, res: Response) => {
    try {
        await VTuberService.updatePerformanceConfig(
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
 * POST /api/vtuber/:entityId/animation - Update motion config
 */
router.post('/:entityId/animation', async (req: AuthRequest, res: Response) => {
    try {
        await VTuberService.updateAnimationConfig(
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
 * GET /api/vtuber/:entityId/analytics - Get engagement stats
 */
router.get('/:entityId/analytics', async (req: AuthRequest, res: Response) => {
    try {
        const vtuber = await VTuberService.getOrCreateVTuber(
            req.user!.userId,
            req.params.entityId,
            req.params.entityId
        );
        
        res.json({ 
            success: true, 
            data: {
                analytics: vtuber.analytics || {},
                recentInteractions: vtuber.interactions || []
            } 
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/:entityId/model - Upload custom 3D Base Model
 */
import { uploadToS3 } from '../utils/s3.js';

router.post('/:entityId/model', upload.single('model'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No model file uploaded' });

        const userId = req.user!.userId;
        const entityId = req.params.entityId;
        const ext = file.originalname.split('.').pop() || 'glb';
        const path = `vtuber/${userId}/${entityId}/model_${Date.now()}.${ext}`;

        const s3Result = await uploadToS3(path, file.buffer, 'application/octet-stream');
        const modelUrl = s3Result.key;

        // Update VTuber
        const vtuber = await VTuber.findOne({ entityId, userId });
        if (!vtuber) throw new Error('VTuber not found');

        if (!vtuber.visual) vtuber.visual = {};
        vtuber.visual.modelUrl = modelUrl;
        await vtuber.save();

        res.json({ success: true, data: { modelUrl }, message: 'VTuber model uploaded successfully.' });
    } catch (e: any) {
        console.error('[VTuberRoute] Model Upload Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/vtuber/voices/:provider - Fetch dynamic voice list from provider
 */
import { getAdminSettings } from '../models/AdminSettings.js';
import { GoogleTTSProvider } from '../utils/ai/providers/GoogleTTSProvider.js';
import { ElevenLabsProvider } from '../utils/ai/providers/ElevenLabsProvider.js';
import { GeminiTTSProvider } from '../utils/ai/providers/GeminiTTSProvider.js';

router.get('/voices/:provider', async (req: AuthRequest, res: Response) => {
    try {
        const { provider } = req.params;
        const { language } = req.query; // Optional language filter
        
        const settings = await getAdminSettings();
        
        if (provider === 'google') {
            // Google TTS
            const { aiAccountManager } = await import('../utils/ai/AIAccountManager.js');
            const account = await aiAccountManager.getOptimalAccount('audio');
            
            const config: any = {};
            
            if (account && account.providerId === 'google') {
                const token = await aiAccountManager.refreshAccessToken(account);
                config.accessToken = token;
                config.projectId = account.projectId;
            } else {
                const googleProvider = settings.aiSettings.providers.find(p => p.id === 'google');
                config.apiKey = googleProvider?.apiKey || process.env.GOOGLE_API_KEY;
            }
            
            if (!config.apiKey && !config.accessToken) {
                return res.status(500).json({ success: false, error: 'Google TTS not configured' });
            }
            
            const ttsProvider = new GoogleTTSProvider(config);
            const voices = await ttsProvider.listVoices(language as string);
            
            const formattedVoices = voices.map((v: any) => ({
                id: v.name,
                name: v.name,
                language: v.languageCodes?.[0] || 'en-US',
                gender: v.ssmlGender || 'NEUTRAL',
                provider: 'google',
                audioSampleUrl: `https://cloud.google.com/static/text-to-speech/docs/audio/${v.name}.wav`
            }));
            
            return res.json({ success: true, data: formattedVoices });
        } 
        else if (provider === 'elevenlabs') {
            // ElevenLabs
            const elevenProvider = settings.aiSettings.providers.find(p => p.id === 'elevenlabs');
            let apiKey = elevenProvider?.apiKey || process.env.ELEVENLABS_API_KEY;
            
            if (!apiKey) {
                return res.status(500).json({ success: false, error: 'ElevenLabs API Key not configured' });
            }
            
            const ttsProvider = new ElevenLabsProvider(apiKey);
            const voices = await ttsProvider.listVoices();
            
            const formattedVoices = voices.map((v: any) => ({
                id: v.voice_id,
                name: v.name,
                language: v.labels?.language || 'en',
                gender: v.labels?.gender || 'neutral',
                provider: 'elevenlabs'
            }));
            
            return res.json({ success: true, data: formattedVoices });
        }
        else if (provider === 'gemini') {
            // Gemini TTS
            const geminiProvider = settings.aiSettings.providers.find(p => p.id === 'google');
            let apiKey = geminiProvider?.apiKey || process.env.GOOGLE_API_KEY;
            
            if (!apiKey) {
                return res.status(500).json({ success: false, error: 'Google API Key not configured' });
            }
            
            const ttsProvider = new GeminiTTSProvider({ apiKey });
            const voices = await ttsProvider.listVoices();
            
            return res.json({ success: true, data: voices });
        }
        else if (provider === 'openai') {
            // OpenAI TTS
            const openaiVoices = [
                { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral', provider: 'openai' },
                { id: 'echo', name: 'Echo', language: 'en', gender: 'male', provider: 'openai' },
                { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral', provider: 'openai' },
                { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male', provider: 'openai' },
                { id: 'nova', name: 'Nova', language: 'en', gender: 'female', provider: 'openai' },
                { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female', provider: 'openai' }
            ];
            
            return res.json({ success: true, data: openaiVoices });
        }
        else {
            return res.status(400).json({ success: false, error: 'Unsupported provider.' });
        }
    } catch (e: any) {
        console.error('[VTuberRoute] Voice List Fetch Failed:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});


/**
 * DELETE /api/vtuber/:entityId - Delete a VTuber
 */
router.delete('/:entityId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const entityId = req.params.entityId;

        const result = await VTuber.findOneAndDelete({ 
            userId, 
            entityId 
        });

        if (!result) {
            return res.status(404).json({ success: false, error: 'VTuber not found' });
        }

        res.json({ success: true, message: 'VTuber permanently deleted.' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/vtuber/voice-preview
 */
router.post('/voice-preview', async (req: AuthRequest, res: Response) => {
    try {
        const { text, provider, voiceId, language } = req.body;

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
            language: language || 'en-US'
        });

        res.json({ 
            success: true, 
            data: {
                audioUrl: audioResult.media.url,
                mimeType: audioResult.media.mimeType
            }
        });
    } catch (e: any) {
        console.error('[VTuber] Voice preview generation failed:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
