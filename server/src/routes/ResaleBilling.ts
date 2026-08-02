import { Router } from 'express';
import Stripe from 'stripe';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { connectDB } from '../utils/db.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

/**
 * GET /api/resale/billing/tiers
 * Fetch the pricing tiers and credit allotments defined by the current Tenant.
 */
router.get('/tiers', tenantMiddleware, async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant || !tenant.resaleConfig?.enabled) {
            return res.status(404).json({ error: 'Resale not enabled for this tenant' });
        }

        res.json({
            success: true,
            data: {
                mode: tenant.deployment.mode,
                tiers: tenant.resaleConfig.credits,
                currency: tenant.billing.currency || 'USD'
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/resale/billing/subscribe
 * Create a Stripe Checkout session for an end-user, proxied through the Tenant's credentials.
 */
router.post('/subscribe', authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
        const tenant = req.tenant;
        const user = await User.findById(req.user!.userId);

        if (!tenant || !tenant.resaleConfig?.enabled) {
            return res.status(403).json({ error: 'Resale is not active' });
        }

        if (!user) return res.status(404).json({ error: 'User not found' });

        const { planTier } = req.body; // 'pro' or 'enterprise'
        if (!['pro', 'enterprise'].includes(planTier)) {
            return res.status(400).json({ error: 'Invalid plan tier' });
        }

        // Resolve Tenant's Stripe Credentials
        const stripeKey = tenant.resaleConfig.integratedBilling.secretKey;
        if (!stripeKey) {
            return res.status(500).json({ error: 'Tenant billing not configured' });
        }

        const stripe = new Stripe(stripeKey);

        // Build Product Info based on Tenant Config
        const amount = planTier === 'pro' ? 29 : 99; // Defaulting for demo, ideally comes from tenant settings
        const credits = tenant.resaleConfig.credits[planTier as keyof typeof tenant.resaleConfig.credits];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: user.email,
            line_items: [{
                price_data: {
                    currency: tenant.billing.currency || 'usd',
                    product_data: {
                        name: `${tenant.branding.companyName} - ${planTier.toUpperCase()} Plan`,
                        description: `Monthly Broadcast License: ${credits} Credits included.`,
                    },
                    unit_amount: amount * 100,
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }],
            success_url: `${req.headers.origin}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/subscription?canceled=true`,
            metadata: {
                userId: user._id.toString(),
                tenantId: tenant._id.toString(),
                planTier,
                type: 'resale_subscription'
            }
        });

        res.json({ success: true, data: { url: session.url } });

    } catch (error: any) {
        Logger.error('[ResaleBilling] Checkout failed:', error.message);
        res.status(500).json({ error: 'Subscription failed to initialize' });
    }
});

export default router;
