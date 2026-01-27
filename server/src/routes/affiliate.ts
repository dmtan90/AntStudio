import { Router } from 'express';
import { Affiliate } from '../models/Affiliate.js';
import { Commission } from '../models/Commission.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

const router = Router();

/**
 * GET /api/affiliate/stats
 * Fetch performance metrics for the current affiliate agent.
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const affiliate = await Affiliate.findOne({ userId: req.user!.userId });

        if (!affiliate) {
            return res.status(404).json({ success: false, error: 'Affiliate profile not found' });
        }

        res.json({
            success: true,
            data: {
                referralCode: affiliate.referralCode,
                commissionRate: affiliate.commissionRate,
                metrics: affiliate.metrics,
                balance: affiliate.balance,
                status: affiliate.status
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/affiliate/join
 * Register the current user as an affiliate.
 */
router.post('/join', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        // 1. Check if already an affiliate
        const existing = await Affiliate.findOne({ userId: req.user!.userId });
        if (existing) {
            return res.status(400).json({ success: false, error: 'You are already an affiliate' });
        }

        // 2. Generate unique code (e.g. from name or random)
        const code = `agent_${Math.random().toString(36).substring(2, 8)}`;

        const affiliate = await Affiliate.create({
            userId: req.user!.userId,
            referralCode: code,
            commissionRate: 20 // Default 20%
        });

        res.json({ success: true, data: affiliate });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/affiliate/commissions
 * Fetch the detailed history of earned commissions.
 */
router.get('/commissions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const affiliate = await Affiliate.findOne({ userId: req.user!.userId });
        if (!affiliate) return res.status(404).json({ error: 'Not an affiliate' });

        const commissions = await Commission.find({ affiliateId: affiliate._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, data: { commissions } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
