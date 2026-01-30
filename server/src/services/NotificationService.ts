import admin from 'firebase-admin';
import path from 'path';

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
                console.log('✅ FCM Initialized');
            }
        } catch (error) {
            console.warn('⚠️ FCM Initialization failed (missing credentials?). Push notifications will be disabled.');
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
            console.log(`📲 Notification sent to ${token.substring(0, 10)}...`);
        } catch (error) {
            console.error('❌ Failed to send notification:', error);
        }
    }

    public async sendToTopic(topic: string, title: string, body: string) {
        if (!this.initialized) return;

        try {
            await admin.messaging().send({
                topic,
                notification: {
                    title,
                    body
                }
            });
        } catch (error) {
            console.error('❌ Failed to send topic notification:', error);
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
