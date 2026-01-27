import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcasterService } from '../services/BroadcasterService.js';

const router = Router();

// POST /api/broadcaster/autopilot/start
router.post('/autopilot/start', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { projectId } = req.body;
        await broadcasterService.startAutonomousChannel(projectId);
        res.json({ success: true, message: 'Auto-pilot engaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/broadcaster/autopilot/stop
router.post('/autopilot/stop', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { projectId } = req.body;
        broadcasterService.stopAutonomousChannel(projectId);
        res.json({ success: true, message: 'Auto-pilot disengaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
