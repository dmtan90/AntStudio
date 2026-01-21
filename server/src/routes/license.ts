import { Router } from 'express';
import { License } from '../models/License.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, sysAdminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware to ensure DB connection
router.use(async (req, res, next) => {
    await connectDB();
    next();
});

// GET /api/license/list - List all licenses (Sys-Admin only)
router.get('/list', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        // console.log("req.user", req.user);
        if (req.user?.role !== 'sys-admin') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const licenses = await License.find().sort({ createdAt: -1 });
        res.json({ success: true, data: { licenses } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/license/generate - Generate new license (Sys-Admin only)
router.post('/generate', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        if (req.user?.role !== 'sys-admin') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const { owner, type, maxUsers, maxProjects, durationDays } = req.body;

        console.log(req.body, owner, type, maxUsers, maxProjects, durationDays);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (durationDays || 365));

        // Generate a random key (simple implementation, can be improved)
        const key = 'LIC-' + Math.random().toString(36).substring(2, 15).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

        const license = await License.create({
            key,
            owner,
            type,
            maxUsers,
            maxProjects,
            startDate,
            endDate,
            status: 'valid'
        });

        res.json({ success: true, data: { license } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/license/:id - Delete/Revoke license (Sys-Admin only)
router.delete('/:id', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        if (req.user?.role !== 'sys-admin') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        await License.findByIdAndDelete(req.params.id);
        res.json({ success: true, data: { message: 'License deleted' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/license/license-status - Public endpoint to check license status
router.post('/license-status', async (req, res) => {
    try {
        const { key, instanceId, ip } = req.body;

        const license = await License.findOne({ key });

        if (!license) {
            return res.json({ status: 'invalid', message: 'License not found' });
        }

        if (license.status === 'revoked') {
            return res.json({ status: 'invalid', message: 'License revoked' });
        }

        const now = new Date();
        if (now > license.endDate) {
            license.status = 'expired';
            await license.save();
            return res.json({ status: 'expired', startDate: license.startDate.getTime(), endDate: license.endDate.getTime() });
        }

        if (license.hwid && license.hwid !== instanceId) {
            return res.json({ status: 'invalid', message: 'HWID mismatch' });
        }

        // Bind HWID on first use if not bound? 
        // For strict binding:
        if (!license.hwid && instanceId) {
            license.hwid = instanceId;
            await license.save();
        }

        res.json({
            licenseId: license._id,
            md5Key: license.key, // Placeholder
            startDate: license.startDate.getTime(),
            endDate: license.endDate.getTime(),
            type: license.type,
            licenseCount: 1, // Number of servers
            owner: license.owner,
            status: 'valid',
            hourUsed: 0
        });

    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

export default router;
