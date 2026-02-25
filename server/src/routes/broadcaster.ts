import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcasterService } from '../services/BroadcasterService.js';

const router = Router();

// POST /api/broadcaster/presentation/start
router.post('/presentation/start', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { projectId } = req.body;
        await broadcasterService.startAutonomousChannel(projectId);
        res.json({ success: true, message: 'Presentation mode engaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/broadcaster/presentation/stop
router.post('/presentation/stop', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { projectId } = req.body;
        broadcasterService.stopAutonomousChannel(projectId);
        res.json({ success: true, message: 'Presentation mode disengaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
