import express, { Response } from 'express';
import { NeuralArchiveService } from '../services/NeuralArchiveService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { NeuralArchive } from '../models/NeuralArchive.js';
import { digitalDoubleService } from '../services/ai/DigitalDoubleService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

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
 * POST /api/neural/archive/:entityId/update - Holistic synchronization
 */
router.post('/archive/:entityId/update', rbacMiddleware(Permission.AI_TUNE), async (req: AuthRequest, res: Response) => {
    try {
        await NeuralArchiveService.updateNeuralArchive(req.user!.userId, req.params.entityId, req.body);
        res.json({ success: true, message: 'Neural Soul updated and synchronized.' });
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
 * POST /api/neural/archive/:entityId/digital-double - Generate 3D texture map from photo
 */
router.post('/archive/:entityId/digital-double', upload.single('photo'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

        const visual = await digitalDoubleService.generateDigitalDouble(
            req.user!.userId,
            req.params.entityId,
            file.buffer,
            file.mimetype
        );

        res.json({ success: true, data: visual, message: 'Digital Double initialized successfully.' });
    } catch (e: any) {
        console.error('[NeuralRoute] Digital Double Failed:', e);
        res.status(500).json({ success: false, error: e.message });
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
