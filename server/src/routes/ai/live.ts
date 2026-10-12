// Live studio AI (guests, producer, performance) (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
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
 * POST /api/ai/guest/talk - Generate personality-driven response.
 * With `type: 'gift' | 'chat'` (top-level or in `context`) it generates a reaction to a viewer
 * gift/chat instead; that variant used to be a second, shadowed registration of this path.
 */
router.post('/guest/talk', async (req: AuthRequest, res) => {
    try {
        const { entityId, prompt, context } = req.body;
        const userId = req.user!.userId;
        const type = req.body.type || context?.type;

        if (type === 'gift' || type === 'chat') {
            if (!entityId) return res.status(400).json({ success: false, error: 'entityId is required' });
            const userName = req.body.userName || context?.userName || 'Someone';
            const result = type === 'gift'
                ? await aiGuestService.generateGiftReaction(userId, entityId, userName, req.body.giftName || context?.giftName, req.body.amount || context?.amount)
                : await aiGuestService.generateChatReaction(userId, entityId, userName, req.body.content || context?.content || prompt);
            return res.json({ success: true, data: result });
        }

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

export default router;
