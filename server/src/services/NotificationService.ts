import admin from 'firebase-admin';
import path from 'path';
import { Logger } from '../utils/Logger.js';

class NotificationService {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            // Check for service account file
            // In production, this should be a secure path or env var
            const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                path.join(process.cwd(), 'serviceAccountKey.json');

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath)
                });
                this.initialized = true;
                Logger.info('✅ FCM Initialized', 'NotificationService');
            }
        } catch (error) {
            Logger.warn('⚠️ FCM Initialization failed (missing credentials?). Push notifications will be disabled.', 'NotificationService');
        }
    }

    public async sendToDevice(token: string, title: string, body: string, data?: any) {
        if (!this.initialized) return;

        try {
            await admin.messaging().send({
                token,
                notification: {
                    title,
                    body
                },
                data: data ? this.sanitizeData(data) : undefined
            });
            Logger.info(`📲 Notification sent to ${token.substring(0, 10)}...`, 'NotificationService');
        } catch (error) {
            Logger.error('❌ Failed to send notification', 'NotificationService', { error });
        }
    }

    public async sendToTopic(topic: string, title: string, body: string, data?: any) {
        if (!this.initialized) return;

        try {
            await admin.messaging().send({
                topic,
                notification: {
                    title,
                    body
                },
                data: data ? this.sanitizeData(data) : undefined
            });
        } catch (error) {
            Logger.error('❌ Failed to send topic notification', 'NotificationService', { error });
        }
    }

    // FCM data payload values must be strings
    private sanitizeData(data: any): Record<string, string> {
        const sanitized: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }
}

export const notificationService = new NotificationService();
