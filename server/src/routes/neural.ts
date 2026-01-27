import express, { Response } from 'express';
import { NeuralArchiveService } from '../services/NeuralArchiveService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { NeuralArchive } from '../models/NeuralArchive.js';

const router = express.Router();

// All neural operations require authentication
router.use(authMiddleware);

/**
 * GET /api/neural/archive/:entityId - Retrieve character soul
 */
router.get('/archive/:entityId', async (req: AuthRequest, res: Response) => {
    try {
        const archive = await NeuralArchiveService.getOrCreateArchive(
            req.user!.userId,
            req.params.entityId,
            req.query.name as string || req.params.entityId,
            (req as any).user?.currentOrganizationId
        );
        res.json({ success: true, data: archive });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/neural/archive/:entityId/style - Update tactical LoRAs
 */
router.post('/archive/:entityId/style', rbacMiddleware(Permission.AI_TUNE), async (req: AuthRequest, res: Response) => {
    try {
        await NeuralArchiveService.updateStyling(req.user!.userId, req.params.entityId, req.body.loras);
        res.json({ success: true, message: 'Neural styling weights recalibrated.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/neural/archive/:entityId/event - Persist tactical memory
 */
router.post('/archive/:entityId/event', async (req: AuthRequest, res: Response) => {
    try {
        const { missionId, description } = req.body;
        await NeuralArchiveService.archiveEvent(req.user!.userId, req.params.entityId, missionId, description);
        res.json({ success: true, message: 'Mission event archived to neural memory.' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/neural/list - List all persistent personalities
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const archives = await NeuralArchive.find({ userId: req.user!.userId }).sort({ lastUpdated: -1 });
        res.json({ success: true, data: archives });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
