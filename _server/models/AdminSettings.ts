import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAdminSettings extends Document {
    geminiApiKeys: Array<{
        key: string
        label: string
        isActive: boolean
        usageCount: number
        lastUsed?: Date
    }>
    apiConfigs: {
        stripe: { secretKey: string; publicKey: string; webhookSecret: string }
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
        social: {
            facebook: { appId: string; appSecret: string }
            google: { clientId: string; clientSecret: string }
        }
    }
    aiSettings: {
        providers: Array<{
            id: string
            name: string
            apiKey: string
            baseUrl?: string
            isActive: boolean
        }>
        models: Array<{
            id: string
            name: string
            providerId: string
            type: 'image' | 'video' | 'audio' | 'text'
            creditCost: number
            isActive: boolean
        }>
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
    creditPackages: Array<{ // New: Credit packages
        id: string
        name: string
        credits: number
        price: number
        currency: string
        isActive: boolean
    }>
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
                lastUsed: Date
            }
        ],
        apiConfigs: {
            stripe: {
                secretKey: { type: String, default: '' },
                publicKey: { type: String, default: '' },
                webhookSecret: { type: String, default: '' }
            },
            aws: {
                accessKeyId: { type: String, default: '' },
                secretAccessKey: { type: String, default: '' },
                bucketName: { type: String, default: '' },
                region: { type: String, default: 'us-east-1' }
            },
            smtp: {
                host: { type: String, default: 'smtp.gmail.com' },
                port: { type: Number, default: 587 },
                secure: { type: Boolean, default: false },
                user: { type: String, default: '' },
                pass: { type: String, default: '' },
                fromEmail: { type: String, default: 'noreply@flova.ai' },
                fromName: { type: String, default: 'AntFlow' }
            },
            social: {
                facebook: { appId: { type: String, default: '' }, appSecret: { type: String, default: '' } },
                google: { clientId: { type: String, default: '' }, clientSecret: { type: String, default: '' } }
            }
        },
        aiSettings: {
            providers: [
                {
                    id: String,
                    name: String,
                    apiKey: String,
                    baseUrl: String,
                    isActive: { type: Boolean, default: true }
                }
            ],
            models: [
                {
                    id: String,
                    name: String,
                    providerId: String,
                    type: { type: String, enum: ['image', 'video', 'audio', 'text'] },
                    creditCost: { type: Number, default: 1 },
                    isActive: { type: Boolean, default: true }
                }
            ]
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
        ]
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
                aws: { accessKeyId: '', secretAccessKey: '', bucketName: '', region: 'us-east-1' },
                smtp: {
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    user: '',
                    pass: '',
                    fromEmail: 'noreply@flova.ai',
                    fromName: 'AntFlow'
                },
                social: { facebook: { appId: '', appSecret: '' }, google: { clientId: '', clientSecret: '' } }
            },
            aiSettings: {
                providers: [
                    { id: 'google', name: 'Google Gemini', apiKey: '', isActive: true },
                    { id: 'openai', name: 'OpenAI', apiKey: '', isActive: true },
                    { id: 'midjourney', name: 'Midjourney', apiKey: '', isActive: true }
                ],
                models: [
                    { id: 'gemini-pro', name: 'Gemini Pro', providerId: 'google', type: 'text', creditCost: 1, isActive: true },
                    { id: 'dall-e-3', name: 'DALL-E 3', providerId: 'openai', type: 'image', creditCost: 5, isActive: true }
                ]
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
            ]
        })
    }

    return settings
}
