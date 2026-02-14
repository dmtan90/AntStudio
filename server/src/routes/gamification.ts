import express, { Request, Response } from 'express';
import { gamificationService } from '../services/gamification/GamificationService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/gamification/progress - Get current user progress and quests
router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'User not authenticated' });
        
        const progress = await gamificationService.getUserProgress(userId);
        res.json(progress);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/gamification/leaderboard - Get global leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const leaderboard = await gamificationService.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
