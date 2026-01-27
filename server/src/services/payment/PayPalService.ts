import axios from 'axios';
import { configService } from '../../utils/configService.js';

/**
 * Service for interacting with the PayPal REST API.
 * Supports order orchestration and payment capture.
 */
export class PayPalService {
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
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(`${this.baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return response.data.access_token;
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
     * Captures an authorized PayPal order.
     */
    public async captureOrder(orderId: string) {
        const accessToken = await this.getAccessToken();

        const response = await axios.post(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    }
}

export const payPalService = new PayPalService();
