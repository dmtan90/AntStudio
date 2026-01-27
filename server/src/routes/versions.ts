import { Router } from 'express';
import { versionControlService } from '../services/VersionControlService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

const router = Router();
router.use(authMiddleware);

// GET /api/versions/:projectId - Get version history
router.get('/:projectId', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const limit = parseInt(req.query.limit as string) || 20;
        const history = await versionControlService.getVersionHistory(req.params.projectId, limit);
        res.json({ success: true, data: { history } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/versions/:projectId/:version - Get specific version
router.get('/:projectId/:version', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const version = await versionControlService.getVersion(
            req.params.projectId,
            parseInt(req.params.version)
        );

        if (!version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        res.json({ success: true, data: { version } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/versions/:projectId - Create new version
router.post('/:projectId', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { message } = req.body;
        const version = await versionControlService.createVersion(
            req.params.projectId,
            req.user!.userId,
            message || 'Manual checkpoint'
        );
        res.json({ success: true, data: { version } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/versions/:projectId/revert/:version - Revert to version
router.post('/:projectId/revert/:version', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const result = await versionControlService.revertToVersion(
            req.params.projectId,
            parseInt(req.params.version),
            req.user!.userId
        );
        res.json({ success: true, data: { result } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/versions/:projectId/compare/:version1/:version2 - Compare versions
router.get('/:projectId/compare/:version1/:version2', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const changes = await versionControlService.compareVersions(
            req.params.projectId,
            parseInt(req.params.version1),
            parseInt(req.params.version2)
        );
        res.json({ success: true, data: { changes } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
