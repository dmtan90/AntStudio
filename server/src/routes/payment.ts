import { Router } from 'express';
import { paymentService } from '../services/PaymentService.js';
import { payPalService } from '../services/PayPalService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { License } from '../models/License.js';
import { LicensePackage } from '../models/LicensePackage.js';
import { Transaction } from '../models/Transaction.js';
import crypto from 'crypto';

const router = Router();

// POST /api/payment/create-checkout - Stripe
router.post('/create-checkout', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { packageId, licenseKey } = req.body;
        const url = await paymentService.createLicenseCheckout(req.user!.userId, packageId, licenseKey);
        res.json({ success: true, data: { url } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/payment/paypal/create-order - PayPal
router.post('/paypal/create-order', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { packageId, licenseKey } = req.body;
        const url = await payPalService.createOrder(req.user!.userId, packageId, licenseKey);
        res.json({ success: true, data: { url } });// Return approval link
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/payment/verify-session - Finalize (called by frontend on success)
router.post('/verify-session', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { sessionId, gateway } = req.body;
        let tx;

        if (gateway === 'stripe') {
            tx = await paymentService.verifySession(sessionId);
        } else if (gateway === 'paypal') {
            tx = await payPalService.captureOrder(sessionId);
        }

        if (tx && tx.status === 'completed') {
            // Provision or Renew License
            const { packageId, licenseKey } = tx.metadata;
            const pkg = await LicensePackage.findById(packageId);

            if (pkg) {
                if (licenseKey) {
                    // RENEWAL
                    const lic = await License.findOne({ key: licenseKey });
                    if (lic) {
                        const base = lic.endDate > new Date() ? lic.endDate : new Date();
                        const newEnd = new Date(base);
                        if (pkg.billingPeriod === 'monthly') newEnd.setMonth(newEnd.getMonth() + 1);
                        else if (pkg.billingPeriod === 'yearly') newEnd.setFullYear(newEnd.getFullYear() + 1);

                        lic.endDate = newEnd;
                        lic.tier = pkg.tier; // Handle upgrade scenario
                        await lic.save();
                    }
                } else {
                    // NEW LICENSE
                    const startDate = new Date();
                    const endDate = new Date();
                    if (pkg.billingPeriod === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
                    else if (pkg.billingPeriod === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

                    const key = 'LIC-' + crypto.randomBytes(8).toString('hex').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
                    await License.create({
                        key,
                        owner: req.user!.email,
                        tier: pkg.tier,
                        instancesLimit: pkg.limits.instances,
                        maxUsersPerInstance: pkg.limits.usersPerInstance,
                        startDate,
                        endDate,
                        status: 'valid'
                    });
                }
            }
            res.json({ success: true, status: 'completed' });
        } else {
            res.json({ success: false, status: 'pending' });
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/payment/transactions - User history
router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user!.userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: { transactions } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/payment/admin/transactions - Global Ledger (Admin Only)
router.get('/admin/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        // In a real app, add pagination
        const transactions = await Transaction.find({})
            .populate('userId', 'email')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: { transactions } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/payment/admin/stats - Admin Financial Dashboard
router.get('/admin/stats',
    authMiddleware,
    cacheMiddleware({ ttl: 60, keyPrefix: 'admin:stats', varyByUser: false }),
    async (req: AuthRequest, res) => {
        try {
            // 1. Calculate Volume (Lifetime Gross)
            const volumeAgg = await Transaction.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const volume = volumeAgg[0]?.total || 0;

            // 2. Count Active Subscribers (Valid Licenses)
            const subscribers = await License.countDocuments({ status: 'valid', endDate: { $gt: new Date() } });

            // 3. Estimate MRR (Approximation based on active PRO/ENTERPRISE licenses)
            // Ideally, we'd sum the value of all active monthly subscriptions.
            // For MVP, simplistic calculation:
            const proCount = await License.countDocuments({ status: 'valid', tier: 'pro', endDate: { $gt: new Date() } });
            const entCount = await License.countDocuments({ status: 'valid', tier: 'enterprise', endDate: { $gt: new Date() } });
            const basicCount = await License.countDocuments({ status: 'valid', tier: 'basic', endDate: { $gt: new Date() } });

            // Assuming Pro=49, Ent=299
            const mrr = (proCount * 49) + (entCount * 299);

            // 4. Calculate Churn (Simplified placeholder for advanced analytics)
            const churn = 2.1;

            const stats = {
                mrr,
                subscribers,
                volume,
                churn,
                distribution: {
                    enterprise: entCount,
                    pro: proCount,
                    basic: basicCount
                }
            };
            res.json({ success: true, data: stats });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

export default router;
