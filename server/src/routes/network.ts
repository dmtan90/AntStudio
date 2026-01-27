import { Router } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { networkOrchestrator } from '../services/ai/NetworkOrchestrator.js';

const router = Router();

// GET /api/network/snapshot
router.get('/snapshot', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const data = await networkOrchestrator.getNetworkSnapshot();
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/network/event/global
router.post('/event/global', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { eventType, payload } = req.body;
        await networkOrchestrator.triggerGlobalEvent(eventType, payload);
        res.json({ success: true, message: `Global event ${eventType} triggered` });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
