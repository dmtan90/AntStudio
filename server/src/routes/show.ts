import express, { Request, Response } from 'express';
import { showRunnerService } from '../services/ai/ShowRunnerService.js';
import { authMiddleware } from '../middleware/auth.js';
import { EmotionAnalysisService } from '../services/ai/EmotionAnalysisService.js';

const router = express.Router();

// GET /api/show/profiles
router.get('/profiles', authMiddleware, (req: Request, res: Response) => {
    const profiles = showRunnerService.getProfiles();
    res.json(profiles);
});

// POST /api/show/generate
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { profileId, inputs } = req.body;
        const script = await showRunnerService.generateScript(profileId, inputs);
        res.json(script);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/show/start
router.post('/start', authMiddleware, (req: Request, res: Response) => {
    showRunnerService.startShow();
    res.json({ success: true });
});

// POST /api/show/stop
router.post('/stop', authMiddleware, (req: Request, res: Response) => {
    showRunnerService.stopShow();
    res.json({ success: true });
});

// POST /api/show/pause
router.post('/pause', authMiddleware, (req: Request, res: Response) => {
    showRunnerService.pauseShow();
    res.json({ success: true });
});

// GET /api/show/active
router.get('/active', authMiddleware, (req: Request, res: Response) => {
    const script = showRunnerService.getActiveScript();
    res.json(script);
});

// POST /api/show/next
router.post('/next', authMiddleware, (req: Request, res: Response) => {
    showRunnerService.nextStep();
    res.json({ success: true });
});


/**
 * Analyze emotion from text for neural expressions
 */
router.post('/analyze-emotion', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });
        
        const result = await EmotionAnalysisService.analyzeText(text);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

