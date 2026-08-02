import axios from 'axios';
import { Transaction, TransactionGateway, TransactionStatus, TransactionType } from '~/models/Transaction.js';
import { User } from '~/models/User.js';
import { LicensePackage } from '~/models/LicensePackage.js';
import { configService } from '~/utils/ConfigService.js';

import { Logger } from '~/utils/Logger.js';
import { getAdminSettings } from '~/models/AdminSettings.js';

class PayPalService {
    private baseUrl: string;

    constructor() {
        // Default to sandbox if not specified
        this.baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    /**
     * Generates an access token using Client ID and Secret.
     */
    private async getAccessToken(): Promise<string> {
        const { clientId, clientSecret } = configService.paypal;
        if (!clientId || !clientSecret) {
            throw new Error('PayPal credentials not configured. Please check admin settings.');
        }
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        try {
            const response = await axios.post(`${this.baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data.access_token;
        } catch (e) {
            Logger.error('PayPal Auth Failed:', e);
            throw new Error('PayPal gateway authentication failed.');
        }
    }

    /**
     * Creates a PayPal order.
     */
    public async createOrder(amount: number, currency: string = 'USD', metadata: any = {}) {
        const accessToken = await this.getAccessToken();

        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount.toFixed(2),
                },
                custom_id: JSON.stringify(metadata), // Store metadata like userId, planName
            }],
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    }

    /**
     * Create PayPal Order for License.
     */
    public async createLicenseOrder(userId: string, packageId: string, licenseKey?: string) {
        const { clientId, clientSecret } = configService.paypal;
        if (!clientId || !clientSecret) throw new Error('PayPal gateway not configured.');

        const user = await User.findById(userId);
        const pkg = await LicensePackage.findById(packageId);
        if (!user || !pkg) throw new Error('Invalid user or package.');

        const token = await this.getAccessToken();

        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, {
            intent: 'CAPTURE',
            purchase_units: [{
                description: `AntStudio ${pkg.name} License`,
                amount: {
                    currency_code: pkg.currency,
                    value: pkg.price.toFixed(2)
                },
                custom_id: JSON.stringify({ userId, packageId, licenseKey })
            }],
            application_context: {
                return_url: `${configService.domain}/api/payment/paypal/callback`,
                cancel_url: `${configService.domain}/api/payment/paypal/cancel`,
                brand_name: 'AntStudio Enterprise'
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const order = response.data;

        // Record pending transaction
        await Transaction.create({
            userId,
            type: licenseKey ? 'license_renewal' : 'license_purchase',
            amount: pkg.price,
            currency: pkg.currency,
            status: 'pending',
            gateway: 'paypal',
            gatewayTransactionId: order.id,
            metadata: { packageId, licenseKey }
        });

        const approveLink = order.links.find((l: any) => l.rel === 'approve');
        return approveLink ? approveLink.href : null;
    }

    /**
     * Create a Paypal Checkout Session for a Credit Package.
     */
    async createCreditOrder(userId: string, packageId: string) {
        const { clientId, clientSecret } = configService.paypal;
        if (!clientId || !clientSecret) throw new Error('PayPal gateway not configured.');

        const user = await User.findById(userId);
        if (!user) throw new Error('Invalid user.');

        const settings = await getAdminSettings();
        const pkg = settings.creditPackages.find((p: any) => p.id === packageId);
        
        if (!pkg || !pkg.isActive) throw new Error('Invalid or inactive credit package.');

        const token = await this.getAccessToken();
        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, {
            intent: 'CAPTURE',
            purchase_units: [{
                description: `${pkg.credits} AI Credits`,
                amount: {
                    currency_code: pkg.currency,
                    value: pkg.price.toFixed(2)
                },
                custom_id: JSON.stringify({ userId, packageId })
            }],
            application_context: {
                return_url: `${configService.domain}/api/payment/paypal/callback`,
                cancel_url: `${configService.domain}/api/payment/paypal/cancel`,
                brand_name: 'AntStudio Enterprise'
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const order = response.data;

        // Record pending transaction
        await Transaction.create({
            userId,
            type: TransactionType.CREDIT_PURCHASE,
            amount: pkg.price,
            currency: pkg.currency,
            status: TransactionStatus.PENDING,
            gateway: TransactionGateway.PAYPAL,
            gatewayTransactionId: order.id,
            metadata: { packageId }
        });

        const approveLink = order.links.find((l: any) => l.rel === 'approve');
        return approveLink ? approveLink.href : null;
    }

    /**
     * Capture PayPal Payment.
     */
    async captureOrder(orderId: string) {
        const token = await this.getAccessToken();
        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.status === 'COMPLETED') {
            const tx = await Transaction.findOne({ gatewayTransactionId: orderId });
            if (tx && tx.status !== TransactionStatus.COMPLETED) {
                tx.status = TransactionStatus.COMPLETED;
                await tx.save();
                return tx;
            }
        }
        return null;
    }
}

export const payPalService = new PayPalService();
