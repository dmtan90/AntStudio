import { Router } from 'express';
import { stripeService } from '~/services/payment/StripeService.js';
import { payPalService } from '~/services/payment/PayPalService.js';
import { fulfillTransaction } from '~/services/payment/FulfillmentService.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { License } from '../models/License.js';
import { Transaction, TransactionGateway, TransactionStatus } from '../models/Transaction.js';
import { configService } from '../utils/ConfigService.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

async function isTransactionCompleted(gatewayTransactionId: string, userId?: string) {
    const query: Record<string, any> = { gatewayTransactionId, status: TransactionStatus.COMPLETED };
    if (userId) query.userId = userId;
    return !!(await Transaction.exists(query));
}

// POST /api/payment/create-checkout - Stripe
router.post('/create-checkout', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { packageId, licenseKey, type } = req.body;
        let url;
        const gateway = req.body.gateway || TransactionGateway.STRIPE;
        if(gateway == TransactionGateway.STRIPE){
            if (type === 'credit') {
                url = await stripeService.createCreditCheckout(req.user!.userId, packageId);
            } else {
                url = await stripeService.createLicenseCheckout(req.user!.userId, packageId, licenseKey);
            }
        }
        else if(gateway == TransactionGateway.PAYPAL){
            if (type === 'credit') {
                url = await payPalService.createCreditOrder(req.user!.userId, packageId);
            } else {
                url = await payPalService.createLicenseOrder(req.user!.userId, packageId, licenseKey);
            }
        } else {
            throw new Error('Invalid gateway');
        }

        res.json({ success: true, data: { url } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/payment/paypal/create-order - PayPal
router.post('/paypal/create-order', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { packageId, licenseKey } = req.body;
        const url = await payPalService.createLicenseOrder(req.user!.userId, packageId, licenseKey);
        res.json({ success: true, data: { url } });// Return approval link
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/payment/verify-session - Finalize (called by frontend on success)
router.post('/verify-session', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { sessionId, gateway } = req.body;
        if (typeof sessionId !== 'string' || !sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId is required' });
        }
        let tx;

        if (gateway === TransactionGateway.STRIPE) {
            tx = await stripeService.verifySession(sessionId);
        } else if (gateway === TransactionGateway.PAYPAL) {
            tx = await payPalService.captureOrder(sessionId);
        }

        if (tx) {
            // This request won the atomic pending -> completed transition, so it fulfills
            await fulfillTransaction(tx);
            res.json({ success: true, status: 'completed' });
        } else if (await isTransactionCompleted(sessionId, req.user!.userId)) {
            // Already fulfilled by the redirect callback or the webhook
            res.json({ success: true, status: 'completed' });
        } else {
            res.json({ success: false, status: 'pending' });
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/payment/webhook - Stripe webhook (source of truth for fulfillment).
// The raw body is captured in index.ts (express.json verify) for signature verification.
router.post('/webhook', async (req: any, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || !req.rawBody) {
        return res.status(400).json({ success: false, error: 'Missing signature' });
    }

    let event;
    try {
        event = stripeService.constructWebhookEvent(req.rawBody, String(signature));
    } catch (e: any) {
        Logger.warn(`[Payment] Rejected Stripe webhook: ${e.message}`, 'Payment');
        return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    try {
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
            const session: any = event.data.object;
            const tx = await stripeService.verifySession(session.id);
            if (tx) await fulfillTransaction(tx);
        }
        res.json({ received: true });
    } catch (e: any) {
        Logger.error('[Payment] Stripe webhook processing failed:', 'Payment', e);
        // Non-2xx makes Stripe retry; fulfillment is idempotent via the atomic claim
        res.status(500).json({ success: false, error: 'Webhook processing failed' });
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
router.get('/admin/transactions', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
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
    adminMiddleware,
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

// GET /api/payment/stripe/callback - Handle Stripe return
router.get('/stripe/callback', async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.redirect(`${configService.domain}/license-portal?payment=failed&reason=missing_session`);
        }

        // Verify the payment
        const tx = await stripeService.verifySession(session_id as string);

        if (tx) {
            await fulfillTransaction(tx);
            res.redirect(`${configService.domain}/license-portal?payment=success&gateway=stripe`);
        } else if (await isTransactionCompleted(session_id as string)) {
            // Already fulfilled by the webhook or verify-session
            res.redirect(`${configService.domain}/license-portal?payment=success&gateway=stripe`);
        } else {
            res.redirect(`${configService.domain}/license-portal?payment=failed&reason=verification_failed`);
        }
    } catch (e: any) {
        Logger.error('Stripe callback error:', e);
        res.redirect(`${configService.domain}/license-portal?payment=failed&reason=error`);
    }
});

// GET /api/payment/stripe/cancel - Handle Stripe cancel
router.get('/stripe/cancel', async (req, res) => {
    res.redirect(`${configService.domain}/license-portal?payment=cancelled&gateway=stripe`);
});

// GET /api/payment/paypal/callback - Handle PayPal return
router.get('/paypal/callback', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect(`${configService.domain}/license-portal?payment=failed&reason=missing_token`);
        }

        // Capture the payment
        const tx = await payPalService.captureOrder(token as string);

        if (tx) {
            await fulfillTransaction(tx);
            res.redirect(`${configService.domain}/license-portal?payment=success&gateway=paypal`);
        } else if (await isTransactionCompleted(token as string)) {
            // Already fulfilled by an earlier capture
            res.redirect(`${configService.domain}/license-portal?payment=success&gateway=paypal`);
        } else {
            res.redirect(`${configService.domain}/license-portal?payment=failed&reason=capture_failed`);
        }
    } catch (e: any) {
        Logger.error('PayPal callback error:', e);
        res.redirect(`${configService.domain}/license-portal?payment=failed&reason=error`);
    }
});

// GET /api/payment/paypal/cancel - Handle PayPal cancel
router.get('/paypal/cancel', async (req, res) => {
    res.redirect(`${configService.domain}/license-portal?payment=cancelled&gateway=paypal`);
});

export default router;
