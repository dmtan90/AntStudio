import axios from 'axios';
import crypto from 'crypto';
import { WebhookSubscription } from '../models/WebhookSubscription.js';

export class WebhookService {
    /**
     * Dispatch a tactical event to all authorized subscribers.
     */
    static async dispatch(userId: string, event: string, payload: any): Promise<void> {
        try {
            // Find active subscriptions for this event and user (or their tenant/org context)
            // In a full multi-tenant setup, we'd also scope by currentOrganizationId
            const subscriptions = await WebhookSubscription.find({
                userId,
                events: event,
                isActive: true
            });

            const timestamp = Date.now();
            const body = JSON.stringify({
                event,
                timestamp,
                data: payload
            });

            // Dispatch concurrently
            await Promise.all(subscriptions.map((sub: any) => this.sendToUrl(sub, body)));
        } catch (error) {
            // Log to system monitor instead of console
        }
    }

    /**
     * Perform the actual tactical HTTP handover with security signature.
     */
    private static async sendToUrl(subscription: any, body: string): Promise<void> {
        try {
            const signature = this.generateSignature(body, subscription.secret);

            await axios.post(subscription.url, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AntStudio-Webhook-Engine/1.0',
                    'x-antflow-signature': signature,
                    'x-antflow-event': 'true'
                },
                timeout: 10000 // 10s tactical timeout
            });
        } catch (error: any) {
            // Tactical single-retry attempt
            try {
                const signature = this.generateSignature(body, subscription.secret);
                await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5s
                await axios.post(subscription.url, body, {
                    headers: { 'x-antflow-signature': signature },
                    timeout: 10000
                });
            } catch (retryError) { }
        }
    }

    /**
     * Generate HMAC-SHA256 signature for payload verification.
     */
    private static generateSignature(payload: string, secret: string): string {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
}
