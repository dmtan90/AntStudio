import Stripe from 'stripe';
import config from '../utils/config.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { LicensePackage } from '../models/LicensePackage.js';
import { getAdminSettings } from '../models/AdminSettings.js';

class PaymentService {
    private stripe: Stripe | null = null;

    constructor() {
        if (config.stripeSecretKey) {
            this.stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2023-10-16' as any });
        }
    }

    /**
     * Create a Stripe Checkout Session for a License Package.
     */
    async createLicenseCheckout(userId: string, packageId: string, licenseKey?: string) {
        if (!this.stripe) throw new Error('Stripe gateway not configured.');

        const user = await User.findById(userId);
        const pkg = await LicensePackage.findById(packageId);
        if (!user || !pkg) throw new Error('Invalid user or package.');

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email,
            line_items: [{
                price_data: {
                    currency: pkg.currency.toLowerCase(),
                    product_data: {
                        name: `AntStudio ${pkg.name} License`,
                        description: pkg.description
                    },
                    unit_amount: Math.round(pkg.price * 100), // Cents
                },
                quantity: 1,
            }],
            mode: 'payment', // or 'subscription' if recurring
            success_url: `${config.public.baseUrl}/api/payment/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.baseUrl}/api/payment/stripe/cancel`,
            metadata: {
                userId,
                packageId,
                licenseKey: licenseKey || '', // If renewal
                type: licenseKey ? 'license_renewal' : 'license_purchase'
            }
        });

        // Record pending transaction
        await Transaction.create({
            userId,
            type: licenseKey ? 'license_renewal' : 'license_purchase',
            amount: pkg.price,
            currency: pkg.currency,
            status: 'pending',
            gateway: 'stripe',
            gatewayTransactionId: session.id,
            metadata: {
                packageId,
                licenseKey
            }
        });

        return session.url;
    }

    /**
     * Create a Stripe Checkout Session for a Credit Package.
     */
    async createCreditCheckout(userId: string, packageId: string) {
        if (!this.stripe) throw new Error('Stripe gateway not configured.');

        const user = await User.findById(userId);
        if (!user) throw new Error('Invalid user.');

        const settings = await getAdminSettings();
        const pkg = settings.creditPackages.find(p => p.id === packageId);
        
        if (!pkg || !pkg.isActive) throw new Error('Invalid or inactive credit package.');

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email,
            line_items: [{
                price_data: {
                    currency: pkg.currency.toLowerCase(),
                    product_data: {
                        name: `AntStudio ${pkg.name}`,
                        description: `${pkg.credits} AI Credits`
                    },
                    unit_amount: Math.round(pkg.price * 100), // Cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${config.public.baseUrl}/api/payment/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.baseUrl}/api/payment/stripe/cancel`,
            metadata: {
                userId,
                packageId: pkg.id,
                credits: pkg.credits.toString(),
                type: 'credit_purchase'
            }
        });

        // Record pending transaction
        await Transaction.create({
            userId,
            type: 'credit_purchase',
            amount: pkg.price,
            currency: pkg.currency,
            status: 'pending',
            gateway: 'stripe',
            gatewayTransactionId: session.id,
            metadata: {
                packageId: pkg.id,
                credits: pkg.credits
            }
        });

        return session.url;
    }

    /**
     * Verify Stripe Webhook or Manual Payment Completion.
     */
    async verifySession(sessionId: string) {
        if (!this.stripe) throw new Error('Stripe gateway not configured.');
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const tx = await Transaction.findOne({ gatewayTransactionId: sessionId });
            if (tx && tx.status !== 'completed') {
                tx.status = 'completed';
                await tx.save();
                return tx;
            }
        }
        return null;
    }
}

export const paymentService = new PaymentService();
