// Project analytics & tracking (moved verbatim from routes/projects.ts).
// Mounted by routes/projects.ts after authMiddleware.
import { Router } from 'express';
import { Response } from 'express';
import { connectDB } from '../../utils/db.js';
import { AnalyticsService } from '../../services/streaming/ProjectAnalyticsService.js';

const router = Router();

// GET /api/projects/:id/analytics - Get project analytics
router.get('/:id/analytics', async (req: any, res: Response) => {
    try {
        await connectDB();
        const analytics = await AnalyticsService.getProjectAnalytics(req.params.id);
        if (!analytics) return res.status(404).json({ success: false, error: 'Analytics not found' });
        res.json({ success: true, data: analytics });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/track - Track engagement
router.post('/:id/track', async (req: any, res: Response) => {
    try {
        await connectDB();
        const { type } = req.body;
        if (!['like', 'dislike', 'share'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid tracking type' });
        }
        await AnalyticsService.trackEngagement(req.params.id, type as any);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
