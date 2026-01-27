import { Router } from 'express';
import { Release } from '../models/Release.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, sysAdminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/releases/latest - Edge Server Update Check (Public/Authenticated)
router.get('/latest', async (req, res) => {
    try {
        await connectDB();
        const { channel } = req.query; // 'stable', 'beta', 'nightly'

        const release = await Release.findOne({
            isActive: true,
            channel: channel || 'stable'
        }).sort({ publishedAt: -1 });

        if (!release) return res.status(404).json({ success: false, message: 'No updates available.' });

        res.json({ success: true, data: { release } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/releases - Publish new version (Master Sys-Admin)
router.post('/', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { version, channel, releaseNotes, downloadUrl, minLicenseTier } = req.body;

        const release = await Release.create({
            version,
            channel: channel || 'stable',
            releaseNotes,
            downloadUrl,
            minLicenseTier: minLicenseTier || 'basic',
            isActive: true
        });

        res.status(201).json({ success: true, data: { release } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/releases/history - Admin view
router.get('/history', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const releases = await Release.find().sort({ publishedAt: -1 });
        res.json({ success: true, data: { releases } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
