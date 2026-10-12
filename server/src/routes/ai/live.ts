// Live studio AI (guests, producer, performance) (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
import { Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.js';
import { aiPerformanceService } from '../../services/ai/AIPerformanceService.js';
import { styleABTestingEngine } from '../../services/ai/StyleABTestingEngine.js';
import { aiGuestService } from '../../services/ai/AIGuestService.js';
import { aiProducerService } from '../../services/ai/AIProducerService.js';
import { ttsService } from '../../services/ai/TTSService.js';
import { Logger } from '../../utils/Logger.js';

const router = Router();

// ============================================================================
// AI GUEST INTERACTION
// ============================================================================

/**
 * POST /api/ai/guest/talk - Generate personality-driven response
 */
router.post('/guest/talk', async (req: AuthRequest, res) => {
    try {
        const { entityId, prompt, context } = req.body;
        const userId = req.user!.userId;

        if (!entityId || !prompt) {
            return res.status(400).json({ success: false, error: 'EntityId and Prompt are required' });
        }

        const result = await aiGuestService.generateGuestDialogue(userId, entityId, prompt, context);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI/Guest] Talk Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/guest/tts - Generate voice for text
 */
router.post('/guest/tts', async (req: AuthRequest, res) => {
    try {
        const { text, voiceId, provider, language } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

        const result = await ttsService.generateSpeech({
            text,
            voiceId: voiceId || 'en-US-Standard-A',
            provider: provider || 'google',
            language: language || 'en-US'
        });
        res.json({ success: true, data: { url: result.media.url } });
    } catch (error: any) {
        Logger.error('[AI/Guest] TTS Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/producer/suggest - Generate director notes
 */
router.post('/producer/suggest', async (req: AuthRequest, res) => {
    try {
        const { studioState } = req.body;
        const userId = req.user!.userId;

        if (!studioState) return res.status(400).json({ success: false, error: 'StudioState is required' });

        const result = await aiProducerService.generateSuggestions(userId, studioState);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI/Producer] Suggest Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/performance/snapshot
router.post('/performance/snapshot', async (req, res) => {
    try {
        const { projectId, snapshot } = req.body;
        aiPerformanceService.recordSnapshot(projectId, snapshot);

        // Pass to AB Testing engine for potential style swap
        await styleABTestingEngine.evaluate(projectId, snapshot);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/performance/insights/:projectId
router.get('/performance/insights/:projectId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const data = await aiPerformanceService.generateDirectorInsights(req.params.projectId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/performance/optimize/start
router.post('/performance/optimize/start', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { projectId, initialStyle, candidates } = req.body;
        styleABTestingEngine.startOptimization(projectId, initialStyle, candidates);
        res.json({ success: true, message: 'Autonomous optimization cycle engaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// AI GUEST / INFLUENCER INTERACTION
// ============================================================================

/**
 * POST /api/ai/guest/talk
 * Generate personality-driven dialogue for an AI guest.
 */
router.post('/guest/talk', async (req: AuthRequest, res: Response) => {
    try {
        const { entityId, prompt, context } = req.body;
        const userId = req.user!.userId;

        // Extract from context if nested (for frontend compatibility)
        const type = req.body.type || context?.type;
        const userName = req.body.userName || context?.userName || 'Someone';
        const giftName = req.body.giftName || context?.giftName;
        const amount = req.body.amount || context?.amount;
        const content = req.body.content || context?.content || prompt;

        if (!entityId) return res.status(400).json({ success: false, error: 'entityId is required' });

        let result;
        if (type === 'gift') {
            result = await aiGuestService.generateGiftReaction(userId, entityId, userName, giftName, amount);
        } else if (type === 'chat') {
            result = await aiGuestService.generateChatReaction(userId, entityId, userName, content);
        } else {
            result = await aiGuestService.generateGuestDialogue(userId, entityId, prompt, context);
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI/Guest] Talk Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/guest/tts
 * Generate TTS audio for an AI guest.
 */
router.post('/guest/tts', async (req: AuthRequest, res: Response) => {
    try {
        const { text, voiceId, provider, language } = req.body;
        const userId = req.user!.userId;

        if (!text) return res.status(400).json({ success: false, error: 'text is required' });

        const audioResult = await ttsService.generateSpeech({
            text,
            provider: provider || 'google',
            voiceId: voiceId || 'en-US-Neural2-F',
            language: language || 'en-US'
        });

        res.json({ success: true, data: { url: audioResult.media.url } });
    } catch (error: any) {
        Logger.error('[AI/Guest] TTS Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
