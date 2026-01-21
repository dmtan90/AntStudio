import { getAdminSettings } from '../models/AdminSettings.js';
import config from './config.js'; // Fallback to env vars

class ConfigService {
    private static instance: ConfigService;
    private settings: any = null;

    private constructor() { }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * Initialize the configuration service by fetching settings from DB
     */
    public async initialize() {
        try {
            this.settings = await getAdminSettings();
            console.log('✅ ConfigService initialized from Database');
        } catch (error) {
            console.error('❌ Failed to initialize ConfigService:', error);
            // Fallback to null settings, getters will handle defaults
        }
    }

    /**
     * Refresh settings from DB (e.g. after update)
     */
    public async refresh() {
        await this.initialize();
    }

    /**
     * Get AWS S3 Configuration
     */
    public get aws() {
        const dbAws = this.settings?.apiConfigs?.aws;
        return {
            accessKeyId: dbAws?.accessKeyId || config.awsAccessKeyId,
            secretAccessKey: dbAws?.secretAccessKey || config.awsSecretAccessKey,
            bucketName: dbAws?.bucketName || config.awsS3Bucket,
            region: dbAws?.region || config.awsRegion,
            endpoint: dbAws?.endpoint || config.awsS3Endpoint
        };
    }

    /**
     * Get Stripe Configuration
     */
    public get stripe() {
        const dbStripe = this.settings?.apiConfigs?.stripe;
        return {
            secretKey: dbStripe?.secretKey || config.stripeSecretKey,
            publicKey: dbStripe?.publicKey || config.public.stripePublishableKey,
            webhookSecret: dbStripe?.webhookSecret || config.stripeWebhookSecret
        };
    }

    /**
     * Get SMTP Configuration
     */
    public get smtp() {
        const dbSmtp = this.settings?.apiConfigs?.smtp;
        return {
            host: dbSmtp?.host || config.smtpHost,
            port: dbSmtp?.port || config.smtpPort,
            secure: dbSmtp?.secure ?? config.smtpSecure,
            user: dbSmtp?.user || config.smtpUser,
            pass: dbSmtp?.pass || config.smtpPassword,
            fromEmail: dbSmtp?.fromEmail || config.smtpFromEmail,
            fromName: dbSmtp?.fromName || config.smtpFromName
        };
    }

    /**
     * Get Social Login Configuration
     */
    public get social() {
        const dbSocial = this.settings?.apiConfigs?.social;
        return {
            google: {
                clientId: dbSocial?.google?.clientId || config.facebookAppId, // Logic check: should map correctly if implementing social login later
                clientSecret: dbSocial?.google?.clientSecret || config.facebookAppSecret
            },
            facebook: {
                appId: dbSocial?.facebook?.appId || config.facebookAppId,
                appSecret: dbSocial?.facebook?.appSecret || config.facebookAppSecret
            }
        };
    }

    /**
     * Get Ant Media Configuration
     */
    public get antMedia() {
        const dbStreaming = this.settings?.apiConfigs?.antMedia;
        return {
            baseUrl: dbStreaming?.baseUrl || '',
            email: dbStreaming?.email || '',
            password: dbStreaming?.password || '',
            appName: dbStreaming?.appName || 'WebRTCAppEE'
        };
    }

    /**
     * Get AI Settings
     */
    public get ai() {
        return this.settings?.aiSettings || {
            providers: [],
            defaults: {},
            models: []
        };
    }
}

export const configService = ConfigService.getInstance();
