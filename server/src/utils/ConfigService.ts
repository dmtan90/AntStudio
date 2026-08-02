import { AIModelCost, AIModelType, getAdminSettings, StorageProviderType } from '../models/AdminSettings.js';
import { UserPlatformAccount } from '~/models/UserPlatformAccount.js';
import config from './config.js'; // Fallback to env vars
import { Logger } from './Logger.js';
import { StorageFactory } from '~/services/storage/StorageFactory.js';
import type { IAdminSettings } from '~/models/AdminSettings.js';

export const EnvConfig = config;

export class ConfigService {
    private static instance: ConfigService;
    private settings: IAdminSettings | null = null;
    private initPromise: Promise<void> | null = null;

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
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                this.settings = await getAdminSettings();
                Logger.info('✅ ConfigService initialized from Database', 'ConfigService');
            } catch (error: any) {
                Logger.error('❌ Failed to initialize ConfigService:', 'ConfigService', error);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    private ensureInit() {
        if (!this.settings && !this.initPromise) {
            this.initialize().catch(() => {});
        }
    }

    /**
     * Refresh settings from DB (e.g. after update)
     */
    public async refresh() {
        this.settings = null;
        await this.initialize();
        StorageFactory.reset(); // Clear adapter cache on config change
    }

    /**
     * Get AWS S3 Configuration
     */
    public get aws() {
        this.ensureInit();
        const dbAws = this.settings?.apiConfigs?.storage?.aws;
        return {
            accessKeyId: dbAws?.accessKeyId || EnvConfig.awsAccessKeyId,
            secretAccessKey: dbAws?.secretAccessKey || EnvConfig.awsSecretAccessKey,
            bucketName: dbAws?.bucketName || EnvConfig.awsS3Bucket,
            region: dbAws?.region || EnvConfig.awsRegion,
            endpoint: dbAws?.endpoint || EnvConfig.awsS3Endpoint
        };
    }

    /**
     * Get Stripe Configuration
     */
    public get stripe() {
        this.ensureInit();
        const dbStripe = this.settings?.apiConfigs?.payment?.stripe;
        return {
            secretKey: dbStripe?.secretKey || EnvConfig.stripeSecretKey,
            publicKey: dbStripe?.publicKey || EnvConfig.stripePublishableKey,
            webhookSecret: dbStripe?.webhookSecret || EnvConfig.stripeWebhookSecret,
            enabled: dbStripe?.enabled || false
        };
    }

    /**
     * Get PayPal Configuration
     */
    public get paypal() {
        this.ensureInit();
        const dbPaypal = this.settings?.apiConfigs?.payment?.paypal;
        return {
            clientId: dbPaypal?.clientId || EnvConfig.paypalClientId || '',
            clientSecret: dbPaypal?.clientSecret || EnvConfig.paypalSecret || '',
            webhookSecret: dbPaypal?.webhookSecret || EnvConfig.paypalWebhookSecret || '',
            mode: dbPaypal?.mode || (process.env.NODE_ENV !== 'production' ? 'sandbox' : 'live'),
            enabled: dbPaypal?.enabled || false
        };
    }

    /**
     * Get SMTP Configuration
     */
    public get smtp() {
        this.ensureInit();
        const dbSmtp = this.settings?.apiConfigs?.smtp;
        return {
            host: dbSmtp?.host || EnvConfig.smtpHost,
            port: dbSmtp?.port || EnvConfig.smtpPort,
            secure: dbSmtp?.secure ?? EnvConfig.smtpSecure,
            user: dbSmtp?.user || EnvConfig.smtpUser,
            pass: dbSmtp?.pass || EnvConfig.smtpPassword,
            fromEmail: dbSmtp?.fromEmail || EnvConfig.smtpFromEmail,
            fromName: dbSmtp?.fromName || EnvConfig.smtpFromName
        };
    }

    /**
     * Get Social Login Configuration
     */
    public get oauth() {
        this.ensureInit();

        const oauth = this.settings?.apiConfigs?.oauth;
        if(oauth && oauth.google && oauth.facebook && oauth.tiktok){
            return oauth;
        }
        return {
            google: {
                clientId: oauth?.google?.clientId || EnvConfig.googleClientId,
                clientSecret: oauth?.google?.clientSecret || EnvConfig.googleClientSecret,
                redirectUri: oauth?.google?.redirectUri || EnvConfig.googleRedirectUri,
                enabled: oauth?.google?.enabled || false
            },
            facebook: {
                appId: oauth?.facebook?.appId || EnvConfig.facebookAppId,
                appSecret: oauth?.facebook?.appSecret || EnvConfig.facebookAppSecret,
                redirectUri: oauth?.facebook?.redirectUri || EnvConfig.facebookRedirectUri,
                enabled: oauth?.facebook?.enabled || false
            },
            tiktok: {
                clientKey: oauth?.tiktok?.clientKey || EnvConfig.tiktokClientKey,
                clientSecret: oauth?.tiktok?.clientSecret || EnvConfig.tiktokClientSecret,
                redirectUri: oauth?.tiktok?.redirectUri || EnvConfig.tiktokRedirectUri,
                enabled: oauth?.tiktok?.enabled || false
            }
        };
    }

    /**
     * Get Ant Media Configuration
     */
    public get antMedia() {
        this.ensureInit();
        return {
            baseUrl: process.env.ANT_MEDIA_BASE_URL || '',
            email: process.env.ANT_MEDIA_EMAIL || '',
            password: process.env.ANT_MEDIA_PASSWORD || '',
            appName: process.env.ANT_MEDIA_APP_NAME || 'LiveApp'
        };
    }

    /**
     * Get AI Settings
     */
    public get aiSettings(){
        this.ensureInit();
        return this.settings?.aiSettings || {
            providers: this.aiProviders,
            defaults: this.aiDefaultModels,
            models: this.aiCustomModels
        };
    }

    /**
     * Get AI Providers
     */
    public get aiProviders() {
        this.ensureInit();
        return this.settings?.aiSettings?.providers || [];
    }

    /**
     * Get AI Default Models
     */
    public get aiDefaultModels() {
        this.ensureInit();
        return this.settings?.aiSettings?.defaults || {
            text: { providerId: 'google', modelId: EnvConfig.geminiModelTextAnalysis, creditCost: AIModelCost.TEXT },
            image: { providerId: 'google', modelId: EnvConfig.geminiModelImageGeneration, creditCost: AIModelCost.IMAGE },
            video: { providerId: 'google', modelId: EnvConfig.geminiModelVideoGeneration, creditCost: AIModelCost.VIDEO },
            audio: { providerId: 'google', modelId: EnvConfig.geminiModelTTS, creditCost: AIModelCost.AUDIO },
            music: { providerId: 'google', modelId: EnvConfig.geminiModelMusic, creditCost: AIModelCost.MUSIC },
            voice: { providerId: 'google', modelId: EnvConfig.geminiModelVoice, creditCost: AIModelCost.VOICE },
            agent: { providerId: 'google', modelId: EnvConfig.geminiModelAgent, creditCost: AIModelCost.AGENT },
        };
    }

    /**
     * Get AI Custom Providers
     */
    public get aiCustomModels() {
        this.ensureInit();
        return this.settings?.aiSettings?.models || []
    }

    /**
     * Get Log Settings
     */
    public get logs() {
        this.ensureInit();
        const dbLogs = this.settings?.logSettings;
        return {
            retentionDays: dbLogs?.retentionDays || 30,
            emailNotificationsEnabled: dbLogs?.emailNotificationsEnabled || false,
            notificationEmail: dbLogs?.notificationEmail || EnvConfig.smtpFromEmail,
            minNotificationLevel: dbLogs?.minNotificationLevel || 'error'
        };
    }

    /**
     * Get Storage Configuration
     */
    public get storage() {
        this.ensureInit();
        const dbStorage = this.settings?.apiConfigs?.storage;
        return {
            activeProvider: dbStorage?.activeProvider || EnvConfig.storageProvider || 's3',
            aws: {
                accessKeyId: dbStorage?.aws?.accessKeyId || EnvConfig.awsAccessKeyId,
                secretAccessKey: dbStorage?.aws?.secretAccessKey || EnvConfig.awsSecretAccessKey,
                region: dbStorage?.aws?.region || EnvConfig.awsRegion,
                bucketName: dbStorage?.aws?.bucketName || EnvConfig.awsS3Bucket,
                endpoint: dbStorage?.aws?.endpoint || EnvConfig.awsS3Endpoint,
            },
            googleDrive: {
                clientEmail: dbStorage?.googleDrive?.clientEmail || '',
                privateKey: dbStorage?.googleDrive?.privateKey || '',
                rootFolderId: dbStorage?.googleDrive?.rootFolderId || 'root'
            },
            b2: {
                applicationKeyId: dbStorage?.b2?.applicationKeyId || EnvConfig.blazeB2AppId,
                applicationKey: dbStorage?.b2?.applicationKey || EnvConfig.blazeB2AppKey,
                bucketName: dbStorage?.b2?.bucketName || EnvConfig.blazeB2BucketName
            }
        };
    }

    public get domain(){
        this.ensureInit();
        const isPkg = typeof (process as any).pkg !== 'undefined';
        if(isPkg){
            return `http://localhost:${EnvConfig.serverPort}`;
        }
        return this.settings?.whitelabel?.publicDomain || EnvConfig.baseUrl || 'http://localhost:3000';
    }

    public get publicDomain(){
        this.ensureInit();
        return this.settings?.whitelabel?.publicDomain || EnvConfig.baseUrl || 'http://localhost:3000';
    }

    public get whitelabel() {
        this.ensureInit();

        const wl = this.settings?.whitelabel;
        return {
            appName: wl?.appName || 'AntStudio',
            logo: wl?.logo || '',
            favicon: wl?.favicon || '',
            publicDomain: wl?.publicDomain || this.domain
        };
    }

    public get creditModeEnabled(){
        this.ensureInit();
        return this.settings?.creditModeEnabled || false;
    }

    public get paymentEnabled(){
        this.ensureInit();
        const payment = this.settings?.apiConfigs?.payment;
        const hasStripe = !!(payment?.stripe?.secretKey && payment?.stripe?.publicKey && payment.stripe?.enabled);
        const hasPaypal = !!(payment?.paypal?.clientId && payment?.paypal?.clientSecret && payment.paypal?.enabled);
        return hasStripe || hasPaypal;
    }

    public get license(){
        this.ensureInit();
        return this.settings?.license;
    }

    public get systemMode(){
        return config.systemMode || 'edge';
    }

    public get isMasterServer(){
        return this.systemMode === 'master';
    }

    public get isEdgeServer(){
        return this.systemMode === 'edge';
    }

    public get mediaAPI(){
        this.ensureInit();
        return this.settings?.apiConfigs?.media;
    }

    public get bucketName(){
        this.ensureInit();
        const storage = this.settings?.apiConfigs?.storage;
        let bucketName = EnvConfig.awsS3Bucket || EnvConfig.blazeB2BucketName || "antstudio";

        if(storage?.activeProvider === StorageProviderType.S3){
            bucketName = storage.aws?.bucketName || EnvConfig.awsS3Bucket;
        }
        else if(storage?.activeProvider === StorageProviderType.B2){
            bucketName = storage.b2?.bucketName || EnvConfig.blazeB2BucketName;
        }
        else if(storage?.activeProvider === StorageProviderType.GOOGLE_DRIVE){
            bucketName = storage.googleDrive?.rootFolderId;
        }
        return bucketName;
    }
}

export const configService = ConfigService.getInstance();
