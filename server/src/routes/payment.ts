import { Router } from 'express';
import { getStripeClient } from '../utils/stripe.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import config from '../utils/config.js';
// @ts-ignore
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/payment/history - Get user's payment history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const payments = await Payment.find({ userId: req.user!.userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: { payments }
        });
    } catch (error: any) {
        console.error('Fetch payment history error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to fetch payment history' });
    }
});

// POST /api/payment/create-checkout - Create Stripe checkout session
router.post('/create-checkout', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { planName, packageId, billingPeriod } = req.body;

        if (!planName && !packageId) {
            return res.status(400).json({ success: false, data: null, error: 'Plan name or Package ID is required' });
        }

        const settings = await AdminSettings.findOne();
        if (!settings) return res.status(500).json({ success: false, data: null, error: 'Admin settings not found' });

        const stripe = getStripeClient();
        const user = await User.findById(req.user!.userId);
        if (!user) return res.status(404).json({ success: false, data: null, error: 'User not found' });

        let sessionConfig: any = {
            payment_method_types: ['card'],
            success_url: `${config.public.baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.baseUrl}/pricing`,
            customer_email: user.email,
            metadata: {
                userId: user._id.toString()
            }
        };

        // Handle Subscription Plan
        if (planName) {
            const plan = settings.plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
            if (!plan) return res.status(404).json({ success: false, data: null, error: 'Plan not found' });

            const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.price;

            sessionConfig = {
                ...sessionConfig,
                mode: 'subscription',
                line_items: [
                    {
                        price_data: {
                            currency: plan.currency || 'usd',
                            product_data: {
                                name: `AntFlow ${plan.name} Plan (${billingPeriod || 'monthly'})`,
                                description: `${plan.features.monthlyCredits} credits/month`,
                            },
                            unit_amount: Math.round(price * 100),
                            recurring: {
                                interval: billingPeriod === 'yearly' ? 'year' : 'month',
                            },
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    ...sessionConfig.metadata,
                    type: 'subscription',
                    planName: plan.name,
                    billingPeriod: billingPeriod || 'monthly'
                }
            };
        }
        // Handle Credit Package (One-time)
        else if (packageId) {
            const pkg = settings.creditPackages.find(p => p.id === packageId);
            if (!pkg) return res.status(404).json({ success: false, data: null, error: 'Credit package not found' });

            sessionConfig = {
                ...sessionConfig,
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: pkg.currency || 'usd',
                            product_data: {
                                name: pkg.name,
                                description: `${pkg.credits} Credits`,
                            },
                            unit_amount: Math.round(pkg.price * 100),
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    ...sessionConfig.metadata,
                    type: 'credit_purchase',
                    packageId: pkg.id,
                    credits: pkg.credits.toString()
                }
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);
        res.json({ success: true, data: { url: session.url } });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to create checkout session' });
    }
});

// POST /api/payment/webhook - Stripe webhook handler
router.post('/webhook', async (req, res) => {
    try {
        await connectDB();
        const stripe = getStripeClient();
        const signature = req.headers['stripe-signature'] as string;

        let stripeEvent: any;
        try {
            stripeEvent = stripe.webhooks.constructEvent(
                (req as any).rawBody || JSON.stringify(req.body),
                signature,
                config.stripeWebhookSecret as string
            );
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (stripeEvent.type) {
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object;
                const userId = session.metadata.userId;
                const type = session.metadata.type;

                if (userId) {
                    if (type === 'subscription') {
                        await handleSuccessfulSubscription(userId, session);
                    } else if (type === 'credit_purchase') {
                        await handleSuccessfulCreditPurchase(userId, session);
                    }
                }
                break;
            }
        }

        res.json({ success: true, data: { received: true } });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ success: false, data: null, error: 'Internal server error' });
    }
});

async function handleSuccessfulSubscription(userId: string, session: any) {
    const settings = await AdminSettings.findOne();
    if (!settings) return;
    const user = await User.findById(userId);
    if (!user) return;

    const planName = session.metadata.planName;
    const plan = settings.plans.find(p => p.name === planName);

    if (plan) {
        user.subscription = {
            plan: plan.name.toLowerCase() as any,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Approximate
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string
        };

        if (!user.credits) user.credits = { balance: 0, membership: 0, bonus: 0, weekly: 0 };
        user.credits.membership = plan.features.monthlyCredits || 0;
        await user.save();

        await Payment.create({
            userId: user._id,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'completed',
            type: 'subscription',
            plan: plan.name,
            stripePaymentIntentId: session.payment_intent as string,
            metadata: session.metadata
        });
    }
}

async function handleSuccessfulCreditPurchase(userId: string, session: any) {
    const user = await User.findById(userId);
    if (!user) return;

    const creditsToAdd = parseInt(session.metadata.credits || '0');
    if (creditsToAdd > 0) {
        if (!user.credits) user.credits = { balance: 0, membership: 0, bonus: 0, weekly: 0 };

        user.credits.balance += creditsToAdd;
        await user.save();

        await Payment.create({
            userId: user._id,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'completed',
            type: 'one_time',
            plan: 'Credits',
            stripePaymentIntentId: session.payment_intent as string,
            metadata: session.metadata
        });
    }
}

export default router;
