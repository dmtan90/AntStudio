// AI provider admin tools (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
import { aiManager } from '../../utils/ai/AIServiceManager.js';
import { adminMiddleware, AuthRequest } from '../../middleware/auth.js';

const router = Router();

/**
 * TEST AI CONNECTION
 * Verifies if the session for a native provider is active
 */
router.post('/test-connection', adminMiddleware, async (req: AuthRequest, res: any) => {
    try {
        const { providerId } = req.body;
        if (!providerId) return res.status(400).json({ error: 'providerId is required' });

        const result = await aiManager.testConnection(providerId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
