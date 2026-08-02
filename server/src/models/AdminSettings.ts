import mongoose, { Schema, Document, Model } from 'mongoose';
import Config from '~/utils/config.js';
import { LicenseStatus, LicenseType } from './License.js';

export enum AIModelType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    MUSIC = 'music',
    VOICE = 'voice',
    AGENT = 'agent',
};

export enum AIModelCost {
    TEXT = 1,
    IMAGE = 4,
    VIDEO = 10,
    AUDIO = 1,
    MUSIC = 5,
    VOICE = 1,
    AGENT = 1,
};

export enum StorageProviderType {
    S3 = 's3',
    GOOGLE_DRIVE = 'google_drive',
    B2 = 'b2'
};

export enum CaptchaProviderType {
    YESCAPTCHA = 'yescaptcha',
    CAPSOLVER = 'capsolver',
    CAPMONSTER = 'capmonster',
    EZCAPTCHA = 'ezcaptcha',
    BROWSER = 'browser',
    PERSONAL = 'personal',
    REMOTE_BROWSER = 'remote_browser'
};

export enum ProxyProviderType {
    WEBSHARE = 'webshare'
};

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
};

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
};

export interface IAdminSettings extends Document {
    geminiApiKeys: Array<{
        key: string
        label: string
        isActive: boolean
        usageCount: number
        quotas?: Map<string, { used: number; limit: number; resetAt?: Date }>
        lastUsed?: Date
    }>
    apiConfigs: {
        payment: {
            stripe: { secretKey: string; publicKey: string; webhookSecret: string, enabled: boolean },
            paypal: { clientId: string; clientSecret: string; webhookSecret: string; mode?: 'sandbox' | 'live', enabled: boolean }
        },
        smtp: {
            host: string
            port: number
            secure: boolean
            user: string
            pass: string
            fromEmail: string
            fromName: string
        }
        oauth: {
            google: { clientId: string | undefined; clientSecret: string | undefined; redirectUri?: string; enabled: boolean }
            facebook: { appId: string | undefined; appSecret: string | undefined; enabled: boolean; redirectUri?: string }
            tiktok: { clientKey: string | undefined; clientSecret: string | undefined; enabled: boolean; redirectUri?: string }
        }
        media: {
            giphy: { apiKey: string; enabled: boolean }
            pexels: { apiKey: string; enabled: boolean }
            unsplash: { apiKey: string; enabled: boolean }
        }
        antMedia: {
            baseUrl: string
            email: string
            password: string
            appName: string
        }
        storage: {
            activeProvider: StorageProviderType | string
            aws: {
                accessKeyId: string;
                secretAccessKey: string;
                bucketName: string;
                region: string;
                endpoint: string;
            },
            googleDrive: {
                clientEmail: string
                privateKey: string
                rootFolderId: string
            }
            b2: {
                applicationKeyId: string
                applicationKey: string
                bucketName: string
            }
        }
        proxy?: {
            enabled: boolean
            webshare?: {
                proxyUsername: string
                proxyPassword: string
                domainName?: string
                proxyPort?: number
            }
        }
        captcha?: {
            method: CaptchaProviderType,
            yescaptcha?: { apiKey: string; baseUrl: string }
            remoteBrowser?: { apiKey: string; baseUrl: string; timeout: number }
            localBrowser?: { launchBackground: boolean; profileDir: string }
        }
    }
    aiSettings: {
        providers: Array<{
            id: string
            name: string
            apiKey: string
            baseUrl?: string
            supportedTypes: string[] // 'text' | 'image' | 'video' | 'audio' | 'music'
            isActive: boolean
            taskConfigs?: Map<string, {
                endpoint: string
                method: HttpMethod,
                headers?: Record<string, string>
                payloadTemplate?: string
                models?: string[]
                responseMapping?: {
                    text?: string
                    url?: string
                    b64?: string
                    jobId?: string
                }
                pollConfig?: {
                    endpoint: string           // e.g. "https://api.example.com/history/{{jobId}}"
                    method?: HttpMethod,
                    headers?: Record<string, string>
                    intervalMs?: number        // Poll interval (default: 3000ms)
                    timeoutMs?: number         // Total timeout (default: 120000ms)
                    statusPath?: string        // JSON path to status field, e.g. "data.status"
                    successValues?: string[]   // e.g. ["SUCCESS", "completed"]
                    failureValues?: string[]   // e.g. ["FAILED", "error"]
                    responseMapping?: {
                        url?: string
                        b64?: string
                        text?: string
                    }
                }
            }>
        }>
        defaults: {
            text: { providerId: string; modelId: string; creditCost: number }
            image: { providerId: string; modelId: string; creditCost: number }
            video: { providerId: string; modelId: string; creditCost: number }
            audio: { providerId: string; modelId: string; creditCost: number } // TTS
            music: { providerId: string; modelId: string; creditCost: number },
            voice: { providerId: string; modelId: string; creditCost: number },// LiveAPI
            agent: { providerId: string; modelId: string; creditCost: number } // Agent
        }
        models: Array<{
            id: string
            name: string
            providerId: string
            type: AIModelType
            creditCost: number
            isActive: boolean
        }>
    }
    s3: {
        totalStorageUsed: number
        totalStorageLimit: number
    }
    creditModeEnabled?: boolean
    plans: Array<{
        name: string
        price: number
        yearlyPrice: number // New: Yearly price
        currency: string
        features: {
            monthlyCredits: number // New: Credits per month
            prioritySupport: boolean
        }
    }>
    creditPackages: Array<{
        id: string
        name: string
        credits: number
        price: number
        currency: string
        isActive: boolean
    }>
    license: {
        key: string
        info: {
            status: string,
            type: string,
            maxUsers: number
            maxProjects: number
            startDate?: Date
            endDate?: Date
            owner?: string
            lastCheckedAt?: Date
        }
    }
    whitelabel: {
        appName: string
        logo: string
        favicon: string
        publicDomain?: string
    }
    logSettings: {
        emailNotificationsEnabled: boolean
        notificationEmail: string
        minNotificationLevel: LogLevel
        retentionDays: number
    }
    updatedAt: Date
}

const AdminSettingsSchema = new Schema<IAdminSettings>(
    {
        _id: { type: Schema.Types.Mixed, default: 'global_admin_settings' },
        geminiApiKeys: [
            {
                key: { type: String, required: true },
                label: { type: String, required: true },
                isActive: { type: Boolean, default: true },
                usageCount: { type: Number, default: 0 },
                quotas: {
                    type: Map,
                    of: new Schema({
                        used: { type: Number, default: 0 },
                        limit: { type: Number, default: 0 },
                        resetAt: Date
                    }, { _id: false }),
                    default: {}
                },
                lastUsed: Date
            }
        ],
        apiConfigs: {
            payment: {
                stripe: {
                    secretKey: { type: String, default: '' },
                    publicKey: { type: String, default: '' },
                    webhookSecret: { type: String, default: '' },
                    enabled: { type: Boolean, default: false }
                },
                paypal: {
                    clientId: { type: String, default: '' },
                    clientSecret: { type: String, default: '' },
                    webhookSecret: { type: String, default: '' },
                    enabled: { type: Boolean, default: false },
                    mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' }
                },
            },
            smtp: {
                host: { type: String, default: 'smtp.gmail.com' },
                port: { type: Number, default: 587 },
                secure: { type: Boolean, default: false },
                user: { type: String, default: '' },
                pass: { type: String, default: '' },
                fromEmail: { type: String, default: 'noreply@antstudio.ai' },
                fromName: { type: String, default: 'AntStudio' }
            },
            oauth: {
                facebook: { appId: { type: String, default: '' }, appSecret: { type: String, default: '' }, redirectUri: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                google: { clientId: { type: String, default: '' }, clientSecret: { type: String, default: '' }, redirectUri: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                tiktok: { clientKey: { type: String, default: '' }, clientSecret: { type: String, default: '' }, redirectUri: { type: String, default: '' }, enabled: { type: Boolean, default: false } }
            },
            media: {
                giphy: { apiKey: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                pexels: { apiKey: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                unsplash: { apiKey: { type: String, default: '' }, enabled: { type: Boolean, default: false } }
            },
            antMedia: {
                baseUrl: { type: String, default: '' },
                email: { type: String, default: '' },
                password: { type: String, default: '' },
                appName: { type: String, default: 'LiveApp' }
            },
            storage: {
                activeProvider: { type: String, enum: Object.values(StorageProviderType), default: StorageProviderType.S3 },
                aws: {
                    accessKeyId: { type: String, default: '' },
                    secretAccessKey: { type: String, default: '' },
                    bucketName: { type: String, default: '' },
                    region: { type: String, default: 'us-east-1' },
                    endpoint: { type: String, default: '' }
                },
                googleDrive: {
                    clientEmail: { type: String, default: '' },
                    privateKey: { type: String, default: '' },
                    rootFolderId: { type: String, default: 'root' }
                },
                b2: {
                    applicationKeyId: { type: String, default: '' },
                    applicationKey: { type: String, default: '' },
                    bucketName: { type: String, default: '' }
                }
            },
            proxy: {
                enabled: { type: Boolean, default: false },
                webshare: {
                    proxyUsername: { type: String, default: '' },
                    proxyPassword: { type: String, default: '' },
                    domainName: { type: String, default: 'p.webshare.io' },
                    proxyPort: { type: Number, default: 80 }
                }
            },
            captcha: {
                method: { type: String, enum: Object.values(CaptchaProviderType), default: CaptchaProviderType.YESCAPTCHA },
                yescaptcha: {
                    apiKey: { type: String, default: '' },
                    baseUrl: { type: String, default: 'https://api.yescaptcha.com' }
                },
                remoteBrowser: {
                    apiKey: { type: String, default: '' },
                    baseUrl: { type: String, default: '' },
                    timeout: { type: Number, default: 60 }
                },
                localBrowser: {
                    launchBackground: { type: Boolean, default: true },
                    profileDir: { type: String, default: 'browser_data' }
                }
            }
        },
        logSettings: {
            emailNotificationsEnabled: { type: Boolean, default: false },
            notificationEmail: { type: String, default: '' },
            minNotificationLevel: { type: String, enum: Object.values(LogLevel), default: LogLevel.ERROR },
            retentionDays: { type: Number, default: 30 }
        },
        aiSettings: {
            providers: [
                {
                    id: String,
                    name: String,
                    apiKey: String,
                    baseUrl: String,
                    supportedTypes: { type: [String], default: [] },
                    isActive: { type: Boolean, default: true },
                    taskConfigs: {
                        type: Map,
                        of: new Schema({
                            endpoint: String,
                            method: { type: String, enum: Object.values(HttpMethod), default: HttpMethod.POST },
                            headers: { type: Schema.Types.Mixed }, // Support both Map and JSON string
                            payloadTemplate: String,
                            models: { type: [String], default: [] },
                            responseMapping: {
                                text: String,
                                url: String,
                                b64: String,
                                jobId: String
                            },
                            pollConfig: {
                                endpoint: String,
                                method: { type: String, enum: Object.values(HttpMethod), default: HttpMethod.GET },
                                headers: { type: Schema.Types.Mixed },
                                intervalMs: { type: Number, default: 3000 },
                                timeoutMs: { type: Number, default: 120000 },
                                statusPath: String,
                                successValues: { type: [String], default: [] },
                                failureValues: { type: [String], default: [] },
                                responseMapping: {
                                    url: String,
                                    b64: String,
                                    text: String
                                }
                            }
                        }, { _id: false })
                    }
                }
            ],
            defaults: {
                text: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelTextAnalysis }, creditCost: { type: Number, default: AIModelCost.TEXT } },
                image: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelImageGeneration }, creditCost: { type: Number, default: AIModelCost.IMAGE } },
                video: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelVideoGeneration }, creditCost: { type: Number, default: AIModelCost.VIDEO } },
                audio: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelTTS }, creditCost: { type: Number, default: AIModelCost.AUDIO } },
                music: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelMusic }, creditCost: { type: Number, default: AIModelCost.MUSIC } },
                voice: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelVoice }, creditCost: { type: Number, default: AIModelCost.VOICE } },
                agent: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: Config.geminiModelAgent }, creditCost: { type: Number, default: AIModelCost.AGENT } }
            },
            models: [
                {
                    id: String,
                    name: String,
                    providerId: String,
                    type: { type: String, enum: Object.values(AIModelType), default: AIModelType.TEXT },
                    creditCost: { type: Number, default: 1 },
                    isActive: { type: Boolean, default: true }
                }
            ],
        },
        s3: {
            totalStorageUsed: { type: Number, default: 0 },
            totalStorageLimit: { type: Number, default: 1000 }
        },
        plans: [
            {
                name: String,
                price: Number,
                yearlyPrice: { type: Number, default: 0 },
                currency: { type: String, default: 'usd' },
                features: {
                    monthlyCredits: Number,
                    prioritySupport: { type: Boolean, default: false }
                }
            }
        ],
        creditPackages: [
            {
                id: String,
                name: String,
                credits: Number,
                price: Number,
                currency: { type: String, default: 'usd' },
                isActive: { type: Boolean, default: true }
            }
        ],
        license: {
            key: { type: String, default: '' },
            info: {
                status: { type: String, enum: Object.values(LicenseStatus), default: LicenseStatus.VALID },
                type: { type: String, enum: Object.values(LicenseType), default: LicenseType.TRIAL },
                maxUsers: { type: Number, default: 5 },
                maxProjects: { type: Number, default: 10 },
                startDate: Date,
                endDate: Date,
                owner: String,
                lastCheckedAt: Date
            }
        },
        whitelabel: {
            appName: { type: String, default: 'AntStudio' },
            logo: { type: String, default: '' }, // S3 path or URL
            favicon: { type: String, default: '' },
            publicDomain: { type: String, default: '' },
        },
        creditModeEnabled: { type: Boolean, default: false }
    },
    {
        timestamps: { createdAt: false, updatedAt: true }
    }
)

export const AdminSettings: Model<IAdminSettings> =
    mongoose.models.AdminSettings || mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema)

export const SETTINGS_ID = 'global_admin_settings';

// Singleton pattern - ensure only one settings document
export const getAdminSettings = async (): Promise<IAdminSettings> => {
    // 1. Fast path: Try to find existing settings document by fixed ID
    let settings = await AdminSettings.findOne({ _id: SETTINGS_ID });

    // 2. Fallback: Find any existing document
    if (!settings) {
        settings = await AdminSettings.findOne();
    }

    // 3. If no document exists at all, perform atomic upsert
    if (!settings) {
        try {
            settings = await AdminSettings.findOneAndUpdate(
                { _id: SETTINGS_ID },
                {
                    $setOnInsert: {
                        _id: SETTINGS_ID,
                        geminiApiKeys: [],
                        creditModeEnabled: false,
                        apiConfigs: {
                            payment: {
                                stripe: { 
                                    secretKey: Config.stripeSecretKey, 
                                    publicKey: Config.stripePublishableKey, 
                                    webhookSecret: Config.stripeWebhookSecret, 
                                    enabled: false 
                                },
                                paypal: { 
                                    clientId: Config.paypalClientId, 
                                    clientSecret: Config.paypalSecret, 
                                    webhookSecret: Config.paypalWebhookSecret, 
                                    enabled: false 
                                },
                            },
                            smtp: {
                                host: Config.smtpHost,
                                port: Config.smtpPort,
                                secure: Config.smtpSecure,
                                user: Config.smtpUser,
                                pass: Config.smtpPassword,
                                fromEmail: Config.smtpFromEmail,
                                fromName: Config.smtpFromName
                            },
                            oauth: {
                                facebook: { 
                                    appId: Config.facebookAppId, 
                                    appSecret: Config.facebookAppSecret, 
                                    redirectUri: Config.facebookRedirectUri, 
                                    enabled: false 
                                },
                                google: { 
                                    clientId: Config.googleClientId, 
                                    clientSecret: Config.googleClientSecret, 
                                    redirectUri: Config.googleRedirectUri, 
                                    enabled: false 
                                },
                                tiktok: { 
                                    clientKey: Config.tiktokClientKey, 
                                    clientSecret: Config.tiktokClientSecret, 
                                    redirectUri: Config.tiktokRedirectUri, 
                                    enabled: false 
                                },
                            },
                            media: { 
                                giphy: { apiKey: Config.giphyApiKey, enabled: true }, 
                                pexels: { apiKey: Config.pexelsApiKey, enabled: true }, 
                                unsplash: { apiKey: Config.unsplashApiKey, enabled: true } 
                            },
                            antMedia: {
                                baseUrl: '',
                                email: '',
                                password: '',
                                appName: 'LiveApp'
                            },
                            storage: {
                                activeProvider: Config.storageProvider,
                                aws: { 
                                    accessKeyId: Config.awsAccessKeyId, 
                                    secretAccessKey: Config.awsSecretAccessKey, 
                                    bucketName: Config.awsS3Bucket, 
                                    region: Config.awsRegion, 
                                    endpoint: Config.awsS3Endpoint 
                                },
                                googleDrive: {
                                    clientEmail: '',
                                    privateKey: '',
                                    rootFolderId: 'root'
                                },
                                b2: {
                                    applicationKeyId: Config.blazeB2AppId,
                                    applicationKey: Config.blazeB2AppKey,
                                    bucketName: Config.blazeB2BucketName
                                }
                            },
                        },
                        logSettings: {
                            emailNotificationsEnabled: false,
                            notificationEmail: '',
                            minNotificationLevel: LogLevel.ERROR,
                            retentionDays: 30
                        },
                        aiSettings: {
                            providers: [
                                { id: 'google', name: 'Google Gemini', apiKey: '', supportedTypes: Object.values(AIModelType), isActive: true },
                            ],
                            defaults: {
                                text: { providerId: 'google', modelId: Config.geminiModelTextAnalysis, creditCost: AIModelCost.TEXT },
                                image: { providerId: 'google', modelId: Config.geminiModelImageGeneration, creditCost: AIModelCost.IMAGE },
                                video: { providerId: 'google', modelId: Config.geminiModelVideoGeneration, creditCost: AIModelCost.VIDEO },
                                audio: { providerId: 'google', modelId: Config.geminiModelTTS, creditCost: AIModelCost.AUDIO },
                                music: { providerId: 'google', modelId: Config.geminiModelMusic, creditCost: AIModelCost.MUSIC },
                                voice: { providerId: 'google', modelId: Config.geminiModelVoice, creditCost: AIModelCost.VOICE },
                                agent: { providerId: 'google', modelId: Config.geminiModelAgent, creditCost: AIModelCost.AGENT },
                            },
                            models: [],
                        },
                        s3: {
                            totalStorageUsed: 0,
                            totalStorageLimit: 1000
                        },
                        plans: [
                            {
                                name: 'Free',
                                price: 0,
                                yearlyPrice: 0,
                                currency: 'usd',
                                features: { monthlyCredits: 500, prioritySupport: false }
                            },
                            {
                                name: 'Pro',
                                price: 29,
                                yearlyPrice: 290,
                                currency: 'usd',
                                features: { monthlyCredits: 2000, prioritySupport: true }
                            },
                            {
                                name: 'Enterprise',
                                price: 99,
                                yearlyPrice: 990,
                                currency: 'usd',
                                features: { monthlyCredits: 6000, prioritySupport: true }
                            }
                        ],
                        creditPackages: [
                            { id: 'cp_1000', name: '1000 Credits', credits: 1000, price: 10, currency: 'usd', isActive: true },
                            { id: 'cp_2000', name: '2000 Credits', credits: 2000, price: 20, currency: 'usd', isActive: true },
                            { id: 'cp_5500', name: '5500 Credits', credits: 5500, price: 50, currency: 'usd', isActive: true },
                            { id: 'cp_12000', name: '12000 Credits', credits: 12000, price: 100, currency: 'usd', isActive: true }
                        ],
                        license: {
                            key: '',
                            info: {
                                status: LicenseStatus.VALID,
                                type: LicenseType.TRIAL,
                                maxUsers: 5,
                                maxProjects: 10
                            }
                        },
                        whitelabel: {
                            appName: 'AntStudio',
                            logo: '',
                            favicon: '',
                            publicDomain: ''
                        }
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (e) {
            settings = await AdminSettings.findOne();
        }
    }

    return settings!;
}
