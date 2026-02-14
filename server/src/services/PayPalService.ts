import axios from 'axios';
import config from '../utils/config.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { LicensePackage } from '../models/LicensePackage.js';

class PayPalService {
    private baseUrl: string;
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.clientId = process.env.PAYPAL_CLIENT_ID || '';
        this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
        this.baseUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private async getAccessToken() {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        try {
            const response = await axios.post(`${this.baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data.access_token;
        } catch (e) {
            console.error('PayPal Auth Failed:', e);
            throw new Error('PayPal gateway authentication failed.');
        }
    }

    /**
     * Create PayPal Order for License.
     */
    async createOrder(userId: string, packageId: string, licenseKey?: string) {
        if (!this.clientId) throw new Error('PayPal gateway not configured.');

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
                return_url: `${config.public.baseUrl}/api/payment/paypal/callback`,
                cancel_url: `${config.public.baseUrl}/api/payment/paypal/cancel`,
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
     * Capture PayPal Payment.
     */
    async captureOrder(orderId: string) {
        const token = await this.getAccessToken();
        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.status === 'COMPLETED') {
            const tx = await Transaction.findOne({ gatewayTransactionId: orderId });
            if (tx && tx.status !== 'completed') {
                tx.status = 'completed';
                await tx.save();
                return tx;
            }
        }
        return null;
    }
}

export const payPalService = new PayPalService();
