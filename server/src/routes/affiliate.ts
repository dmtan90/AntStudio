import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Affiliate, Referral } from '../models/Affiliate.js';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import crypto from 'crypto';

import { Logger } from '../utils/Logger.js';

const router = Router();

// Join affiliate program
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        
        await connectDB();
        
        // Check if already an affiliate
        const existing = await Affiliate.findOne({ userId });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                error: 'You are already enrolled in the affiliate program' 
            });
        }
        
        // Generate unique referral code
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const baseCode = user.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
        const randomSuffix = crypto.randomBytes(2).toString('hex');
        const referralCode = `${baseCode}${randomSuffix}`;
        
        // Create affiliate account
        const affiliate = await Affiliate.create({
            userId,
            referralCode,
            commissionRate: 20, // Default 20%
            status: 'active' // Auto-approve for now
        });
        
        res.json({
            success: true,
            data: {
                id: affiliate._id,
                referralCode: affiliate.referralCode,
                commissionRate: affiliate.commissionRate,
                status: affiliate.status
            }
        });
    } catch (error: any) {
        Logger.error('Failed to join affiliate program:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to join affiliate program' 
        });
    }
});

// Get affiliate dashboard data
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        
        await connectDB();
        
        const affiliate = await Affiliate.findOne({ userId });
        if (!affiliate) {
            return res.json({ success: true, data: null });
        }
        
        // Get recent commissions
        const recentCommissions = await Referral.find({ 
            affiliateId: affiliate._id.toString(),
            status: { $in: ['approved', 'paid'] }
        })
        .sort({ convertedAt: -1 })
        .limit(10)
        .populate('referredUserId', 'name email');
        
        res.json({
            success: true,
            data: {
                affiliate: {
                    status: affiliate.status,
                    referralCode: affiliate.referralCode,
                    commissionRate: affiliate.commissionRate,
                    metrics: affiliate.metrics,
                    balance: affiliate.balance
                },
                recentCommissions: recentCommissions.map(r => ({
                    id: r._id,
                    referredUser: (r.referredUserId as any)?.name || 'Anonymous',
                    revenue: r.revenue,
                    commission: r.commission,
                    status: r.status,
                    convertedAt: r.convertedAt
                }))
            }
        });
    } catch (error: any) {
        Logger.error('Failed to get affiliate dashboard:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to get affiliate dashboard' 
        });
    }
});

interface TrackClickRequest extends Request {
    body: {
        referralCode: string;
    }
}

// Track referral click
router.post('/track-click', async (req: Request, res: Response) => {
    try {
        const { referralCode } = req.body as { referralCode: string };
        
        if (!referralCode) {
            return res.status(400).json({ success: false, error: 'Referral code required' });
        }
        
        await connectDB();
        
        const affiliate = await Affiliate.findOne({ referralCode });
        if (!affiliate) {
            return res.status(404).json({ success: false, error: 'Invalid referral code' });
        }
        
        // Create referral tracking record
        await Referral.create({
            affiliateId: affiliate._id.toString(),
            clickedAt: new Date()
        });
        
        // Update metrics
        await Affiliate.findByIdAndUpdate(affiliate._id, {
            $inc: { 'metrics.totalClicks': 1 }
        });
        
        res.json({ success: true, message: 'Click tracked' });
    } catch (error: any) {
        Logger.error('Failed to track click:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to track click' 
        });
    }
});

// Request payout
router.post('/payout', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { amount, method, details } = req.body;
        
        await connectDB();
        
        const affiliate = await Affiliate.findOne({ userId });
        if (!affiliate) {
            return res.status(404).json({ success: false, error: 'Affiliate account not found' });
        }
        
        if (amount > affiliate.balance.unpaid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient balance' 
            });
        }
        
        // In production, integrate with payment processor (Stripe, PayPal, etc.)
        // For now, just update balances
        await Affiliate.findByIdAndUpdate(affiliate._id, {
            $inc: {
                'balance.unpaid': -amount,
                'balance.totalPaid': amount
            },
            payoutMethod: { type: method, details }
        });
        
        res.json({
            success: true,
            message: 'Payout request submitted successfully'
        });
    } catch (error: any) {
        Logger.error('Failed to request payout:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to request payout' 
        });
    }
});

export default router;
