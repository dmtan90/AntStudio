import mongoose, { Schema, Document, Model } from 'mongoose'

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
        stripe: { secretKey: string; publicKey: string; webhookSecret: string }
        paypal: { clientId: string; clientSecret: string; webhookSecret: string; mode?: 'sandbox' | 'live' }
        aws: { accessKeyId: string; secretAccessKey: string; bucketName: string; region: string }
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
            google: { clientId: string; clientSecret: string; redirectUriOverride?: string; enabled: boolean }
            facebook: { appId: string; appSecret: string; enabled: boolean }
            tiktok: { clientKey: string; clientSecret: string; enabled: boolean }
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
            activeProvider: 's3' | 'google_drive'
            googleDrive: {
                clientEmail: string
                privateKey: string
                rootFolderId: string
            }
        }
        publicDomain?: string
    }
    // settings.oauthProviders is deprecated in favor of apiConfigs.oauth but kept for migration if needed, 
    // but better to remove it now to avoid confusion.
    // aiSettings...
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
                method: 'POST' | 'GET'
                headers?: Record<string, string>
                payloadTemplate?: string
                responseMapping?: {
                    text?: string
                    url?: string
                    b64?: string
                    jobId?: string
                }
            }>
        }>
        defaults: {
            text: { providerId: string; modelId: string; creditCost: number }
            image: { providerId: string; modelId: string; creditCost: number }
            video: { providerId: string; modelId: string; creditCost: number }
            audio: { providerId: string; modelId: string; creditCost: number } // TTS
            music: { providerId: string; modelId: string; creditCost: number }
        }
        models: Array<{
            id: string
            name: string
            providerId: string
            type: 'image' | 'video' | 'audio' | 'text' | 'music'
            creditCost: number
            isActive: boolean
        }>
        flowWorkspaceUrls: string[]
        flowSessionToken?: string
        sessionSync?: {
            googleCookies?: string // For AIStudio/Gemini
            flowCookies?: string // For Labs Flow
        }
    }
    s3: {
        totalStorageUsed: number
        totalStorageLimit: number
    }
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
            status: 'valid' | 'expired' | 'invalid'
            type: 'trial' | 'basic' | 'pro' | 'enterprise'
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
    }
    logSettings: {
        emailNotificationsEnabled: boolean
        notificationEmail: string
        minNotificationLevel: 'debug' | 'info' | 'warn' | 'error'
        retentionDays: number
    }
    updatedAt: Date
}

const AdminSettingsSchema = new Schema<IAdminSettings>(
    {
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
            stripe: {
                secretKey: { type: String, default: '' },
                publicKey: { type: String, default: '' },
                webhookSecret: { type: String, default: '' }
            },
            paypal: {
                clientId: { type: String, default: '' },
                clientSecret: { type: String, default: '' },
                webhookSecret: { type: String, default: '' },
                mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' }
            },
            aws: {
                accessKeyId: { type: String, default: '' },
                secretAccessKey: { type: String, default: '' },
                bucketName: { type: String, default: '' },
                region: { type: String, default: 'us-east-1' },
                endpoint: { type: String, default: '' }
            },
            smtp: {
                host: { type: String, default: 'smtp.gmail.com' },
                port: { type: Number, default: 587 },
                secure: { type: Boolean, default: false },
                user: { type: String, default: '' },
                pass: { type: String, default: '' },
                fromEmail: { type: String, default: 'noreply@flova.ai' },
                fromName: { type: String, default: 'AntStudio' }
            },
            oauth: {
                facebook: { appId: { type: String, default: '' }, appSecret: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                google: { clientId: { type: String, default: '' }, clientSecret: { type: String, default: '' }, redirectUriOverride: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
                tiktok: { clientKey: { type: String, default: '' }, clientSecret: { type: String, default: '' }, enabled: { type: Boolean, default: false } }
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
                appName: { type: String, default: 'WebRTCAppEE' }
            },
            storage: {
                activeProvider: { type: String, enum: ['s3', 'google_drive'], default: 's3' },
                googleDrive: {
                    clientEmail: { type: String, default: '' },
                    privateKey: { type: String, default: '' },
                    rootFolderId: { type: String, default: 'root' }
                }
            },
            publicDomain: { type: String, default: '' }
        },
        logSettings: {
            emailNotificationsEnabled: { type: Boolean, default: false },
            notificationEmail: { type: String, default: '' },
            minNotificationLevel: { type: String, enum: ['debug', 'info', 'warn', 'error'], default: 'error' },
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
                            method: { type: String, default: 'POST' },
                            headers: { type: Schema.Types.Mixed }, // Support both Map and JSON string
                            payloadTemplate: String,
                            responseMapping: {
                                text: String,
                                url: String,
                                b64: String,
                                jobId: String
                            }
                        }, { _id: false })
                    }
                }
            ],
            defaults: {
                text: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: 'gemini-pro' }, creditCost: { type: Number, default: 1 } },
                image: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: 'gemini-pro-vision' }, creditCost: { type: Number, default: 4 } },
                video: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: 'veo-2.0' }, creditCost: { type: Number, default: 10 } },
                audio: { providerId: { type: String, default: 'google' }, modelId: { type: String, default: 'tts-1' }, creditCost: { type: Number, default: 1 } },
                music: { providerId: { type: String, default: 'suno' }, modelId: { type: String, default: 'v3.5' }, creditCost: { type: Number, default: 5 } }
            },
            models: [
                {
                    id: String,
                    name: String,
                    providerId: String,
                    type: { type: String, enum: ['image', 'video', 'audio', 'text', 'music'] },
                    creditCost: { type: Number, default: 1 },
                    isActive: { type: Boolean, default: true }
                }
            ],
            flowWorkspaceUrls: { type: [String], default: [] },
            flowSessionToken: { type: String, default: '' },
            sessionSync: {
                googleCookies: { type: String, default: '' },
                flowCookies: { type: String, default: '' }
            }
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
                status: { type: String, default: 'invalid' }, // valid, expired, invalid
                type: { type: String, default: 'trial' }, // trial, free, enterprise
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
            favicon: { type: String, default: '' }
        }
    },
    {
        timestamps: { createdAt: false, updatedAt: true }
    }
)

export const AdminSettings: Model<IAdminSettings> =
    mongoose.models.AdminSettings || mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema)

// Singleton pattern - ensure only one settings document
export const getAdminSettings = async () => {
    let settings = await AdminSettings.findOne()

    if (!settings) {
        // Create default settings
        settings = await AdminSettings.create({
            geminiApiKeys: [],
            apiConfigs: {
                stripe: { secretKey: '', publicKey: '', webhookSecret: '' },
                paypal: { clientId: '', clientSecret: '', webhookSecret: '' },
                aws: { accessKeyId: '', secretAccessKey: '', bucketName: '', region: 'us-east-1' },
                smtp: {
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    user: '',
                    pass: '',
                    fromEmail: 'noreply@flova.ai',
                    fromName: 'AntStudio'
                },
                oauth: {
                    facebook: { appId: '', appSecret: '', enabled: false },
                    google: { clientId: '', clientSecret: '', redirectUriOverride: '', enabled: false },
                    tiktok: { clientKey: '', clientSecret: '', enabled: false }
                },
                media: { giphy: { apiKey: '', enabled: false }, pexels: { apiKey: '', enabled: false }, unsplash: { apiKey: '', enabled: false } },
                antMedia: {
                    baseUrl: '',
                    email: '',
                    password: '',
                    appName: 'WebRTCAppEE'
                },
                storage: {
                    activeProvider: 's3',
                    googleDrive: {
                        clientEmail: '',
                        privateKey: '',
                        rootFolderId: 'root'
                    }
                },
                publicDomain: ''
            },
            logSettings: {
                emailNotificationsEnabled: false,
                notificationEmail: '',
                minNotificationLevel: 'error',
                retentionDays: 30
            },
            aiSettings: {
                providers: [
                    { id: 'google', name: 'Google Gemini', apiKey: '', supportedTypes: ['text', 'image', 'video', 'audio'], isActive: true },
                    { id: 'geminigen-ai', name: 'GeminiGen AI', apiKey: '', supportedTypes: ['text', 'image', 'video', 'audio'], isActive: true },
                    { id: 'openai', name: 'OpenAI', apiKey: '', supportedTypes: ['text', 'image'], isActive: true },
                    { id: 'suno', name: 'Suno', apiKey: '', supportedTypes: ['music'], isActive: true }
                ],
                defaults: {
                    text: { providerId: 'google', modelId: 'gemini-2.5-flash', creditCost: 1 },
                    image: { providerId: 'google', modelId: 'imagen-3.0', creditCost: 4 },
                    video: { providerId: 'google', modelId: 'veo-2.0', creditCost: 10 },
                    audio: { providerId: 'google', modelId: 'tts-1', creditCost: 1 },
                    music: { providerId: 'suno', modelId: 'v3.5', creditCost: 5 }
                },
                models: [
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'google', type: 'text', creditCost: 1, isActive: true },
                    { id: 'imagen-3.0', name: 'Imagen 3', providerId: 'google', type: 'image', creditCost: 4, isActive: true },
                    { id: 'veo-2.0', name: 'Veo 2.0', providerId: 'google', type: 'video', creditCost: 10, isActive: true }
                ],
                flowWorkspaceUrls: [],
                flowSessionToken: ''
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
                    status: 'invalid',
                    type: 'trial',
                    maxUsers: 5,
                    maxProjects: 10
                }
            },
            whitelabel: {
                appName: 'AntStudio',
                logo: '',
                favicon: ''
            }
        })
    }

    // Ensure nested defaults exist if schema changed on existing document
    if (!settings.apiConfigs.oauth) {
        settings.apiConfigs.oauth = {
            facebook: { appId: '', appSecret: '', enabled: false },
            google: { clientId: '', clientSecret: '', redirectUriOverride: '', enabled: false },
            tiktok: { clientKey: '', clientSecret: '', enabled: false }
        };
        await settings.save();
    }
    if (settings.apiConfigs.publicDomain === undefined) {
        settings.apiConfigs.publicDomain = '';
        await settings.save();
    }

    return settings
}
