import { Router, Response } from 'express';
import { generateVideo, generateImage, generateAudio } from '../utils/AIGenerator.js';
import { AuthRequest } from '../middleware/auth.js';
import { headlessRateLimiter } from '../middleware/rateLimiter.js';
import { connectDB } from '../utils/db.js';

const router = Router();

// Apply rate limiting to all headless endpoints
router.use(headlessRateLimiter);

/**
 * HEADLESS MEDIA GENERATION
 * Designed for programmatic usage via x-api-key.
 * Returns pure JSON response.
 */

// POST /api/headless/generate-video
router.post('/generate-video', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, model, aspectRatio } = req.body;

        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        // Trigger via AIGenerator
        const { jobId } = await generateVideo({
            prompt,
            aspectRatio: aspectRatio || '16:9'
        });

        res.json({
            success: true,
            data: {
                jobId: jobId,
                status: 'processing',
                pollUrl: `/api/projects/jobs/${jobId}`
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/headless/generate-image
router.post('/generate-image', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, count } = req.body;

        const { s3Key } = await generateImage(
            prompt,
            req.user!.userId,
            `headless_${Date.now()}`,
            { aspectRatio: '16:9' }
        );

        res.json({ success: true, data: { url: s3Key } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/headless/generate-voice
router.post('/generate-voice', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { text, voiceId } = req.body;

        const { s3Key } = await generateAudio(
            text,
            req.user!.userId,
            `headless_voice_${Date.now()}`,
            { voice: voiceId || 'gentle_female' }
        );

        res.json({ success: true, data: { url: s3Key } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
