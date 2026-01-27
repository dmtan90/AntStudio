import { Router } from 'express';
import { ModerationAudit } from '../models/ModerationAudit.js';
import { Tenant } from '../models/Tenant.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

const router = Router();

/**
 * ADMIN AUDIT ENDPOINTS
 */

// GET /api/moderation/audits - List safety events
router.get('/audits', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { status, type, tenantId } = req.query;

        const query: any = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (tenantId) query.tenantId = tenantId;

        const audits = await ModerationAudit.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('userId', 'name email')
            .populate('tenantId', 'name');

        res.json({ success: true, data: audits });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/moderation/audits/:id/resolve - Admin manual decision
router.post('/audits/:id/resolve', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { status, notes } = req.body;

        const audit = await ModerationAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ error: 'Audit record not found' });

        audit.status = status; // 'approved' or 'blocked'
        audit.decisionBy = req.user!.userId as any;
        audit.decisionNotes = notes;
        await audit.save();

        res.json({ success: true, message: `Content ${status} successfully.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * TENANT SETTINGS
 */

// POST /api/moderation/settings - Update custom blacklist
router.post('/settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const tenant = req.tenant;
        if (!tenant || !tenant.config) {
            return res.status(400).json({ error: 'Moderation settings not configured' });
        }

        // Check content filter level (e.g. low, medium, high) - assume stored in config
        // Schema shows 'config' has 'allowUserSignup' etc. 
        // We might need to assume a 'contentFilter' prop exists or add it.
        // For now, let's just use existing config property to pass the check
        const filterLevel = (tenant.config as any).contentFilter || 'medium';
        // The original code had a redundant check for tenant here, removing it.
        // if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        // The original code used 'blacklist' from req.body, but the provided snippet removes it.
        // Assuming 'blacklist' should now come from somewhere else or is not directly set here.
        // For now, I'll keep the structure as provided in the instruction, which implies 'blacklist' is still used.
        // If 'blacklist' is intended to be removed, the line below would need adjustment.
        const { blacklist } = req.body; // Re-adding this based on the original context and the use of 'blacklist' below.

        if (!tenant.config) tenant.config = {} as any; // Changed from tenant.settings to tenant.config
        (tenant.config as any).moderation = { // Changed from tenant.settings to tenant.config
            blacklist: blacklist || []
        };

        await tenant.save();
        res.json({ success: true, message: 'Safety settings updated', data: tenant.config });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
