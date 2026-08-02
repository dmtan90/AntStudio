import Stripe from 'stripe';
import { Transaction, TransactionGateway, TransactionStatus, TransactionType } from '~/models/Transaction.js';
import { User } from '~/models/User.js';
import { LicensePackage } from '~/models/LicensePackage.js';
import { getAdminSettings } from '~/models/AdminSettings.js';
import { configService } from '~/utils/ConfigService.js';

class StripeService {
    private stripe: Stripe | null = null;

    constructor() {
        const stripe = configService.stripe;
        if (stripe && stripe.publicKey && stripe.secretKey) {
            this.stripe = new Stripe(stripe.secretKey, { apiVersion: '2023-10-16' as any });
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
            success_url: `${configService.domain}/api/payment/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${configService.domain}/api/payment/stripe/cancel`,
            metadata: {
                userId,
                packageId,
                licenseKey: licenseKey || '', // If renewal
                type: licenseKey ? TransactionType.LICENSE_RENEWAL : TransactionType.LICENSE_PURCHASE
            }
        });

        // Record pending transaction
        await Transaction.create({
            userId,
            type: licenseKey ? TransactionType.LICENSE_RENEWAL : TransactionType.LICENSE_PURCHASE,
            amount: pkg.price,
            currency: pkg.currency,
            status: TransactionStatus.PENDING,
            gateway: TransactionGateway.STRIPE,
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
        const pkg = settings.creditPackages.find((p: any) => p.id === packageId);
        
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
            success_url: `${configService.domain}/api/payment/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${configService.domain}/api/payment/stripe/cancel`,
            metadata: {
                userId,
                packageId: pkg.id,
                credits: pkg.credits.toString(),
                type: TransactionType.CREDIT_PURCHASE
            }
        });

        // Record pending transaction
        await Transaction.create({
            userId,
            type: TransactionType.CREDIT_PURCHASE,
            amount: pkg.price,
            currency: pkg.currency,
            status: TransactionStatus.PENDING,
            gateway: TransactionGateway.STRIPE,
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
            if (tx && tx.status !== TransactionStatus.COMPLETED) {
                tx.status = TransactionStatus.COMPLETED;
                await tx.save();
                return tx;
            }
        }
        return null;
    }
}

export const stripeService = new StripeService();
