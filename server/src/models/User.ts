import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser extends Document {
    email: string
    passwordHash: string
    name: string
    avatar?: string
    role: 'user' | 'admin' | 'sys-admin'
    tenantId?: mongoose.Types.ObjectId // Association with White-label Tenant
    currentOrganizationId?: mongoose.Types.ObjectId // Active Team Context
    subscription: {
        plan: 'free' | 'pro' | 'enterprise'
        status: 'active' | 'cancelled' | 'expired'
        startDate?: Date
        endDate?: Date
        stripeCustomerId?: string
        stripeSubscriptionId?: string
    }
    credits: {
        balance: number
        membership: number
        bonus: number
        weekly: number
    }
    creditLogs: Array<{
        type: 'consumed' | 'obtained'
        amount: number
        description: string
        timestamp: Date
    }>
    emailVerified: boolean
    language: 'en' | 'vi' | 'zh' | 'ja' | 'es'
    isActive: boolean
    notificationSettings: {
        taskCompletion: boolean
        largeTaskReminder: boolean
        email: boolean
        push: boolean
        inApp: boolean
    }
    socialAccounts: {
        youtube?: {
            accessToken: string
            refreshToken: string
            channelId: string
        }
        facebook?: {
            accessToken: string
            pageId: string
        }
    }
    oauthProviders?: {
        google?: { id: string, email: string }
        facebook?: { id: string, email: string }
    }
    resetPasswordToken?: string
    resetPasswordExpires?: Date
    preferences?: {
        aiPersona?: string
        theme?: string
        customVoiceId?: string
    }
    createdAt: Date
    updatedAt: Date
    comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        avatar: {
            type: String
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'sys-admin'],
            default: 'user'
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true
        },
        currentOrganizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        },
        subscription: {
            plan: {
                type: String,
                enum: ['free', 'starter', 'basic', 'pro'],
                default: 'free'
            },
            status: {
                type: String,
                enum: ['active', 'cancelled', 'expired'],
                default: 'active'
            },
            startDate: Date,
            endDate: Date,
            stripeCustomerId: String,
            stripeSubscriptionId: String
        },
        credits: {
            balance: { type: Number, default: 0 },
            membership: { type: Number, default: 0 },
            bonus: { type: Number, default: 0 },
            weekly: { type: Number, default: 0 }
        },
        creditLogs: [
            {
                type: { type: String, enum: ['consumed', 'obtained'] },
                amount: Number,
                description: String,
                timestamp: { type: Date, default: Date.now }
            }
        ],
        socialAccounts: {
            youtube: {
                accessToken: String,
                refreshToken: String,
                channelId: String
            },
            facebook: {
                accessToken: String,
                pageId: String
            }
        },
        oauthProviders: {
            google: {
                id: String,
                email: String
            },
            facebook: {
                id: String,
                email: String
            }
        },
        emailVerified: {
            type: Boolean,
            default: false
        },
        language: {
            type: String,
            enum: ['en', 'vi', 'zh', 'ja', 'es'],
            default: 'en'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        notificationSettings: {
            taskCompletion: { type: Boolean, default: true },
            largeTaskReminder: { type: Boolean, default: true },
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: false },
            inApp: { type: Boolean, default: true }
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        preferences: {
            aiPersona: { type: String, default: 'Default Enthusiast' },
            theme: { type: String, default: 'dark' },
            customVoiceId: String
        }
    },
    {
        timestamps: true
    }
)

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) {
        return
    }

    try {
        const salt = await bcrypt.genSalt(10)
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    } catch (error: any) {
        throw error
    }
})

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash)
}

// Indexes for performance
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ 'subscription.status': 1, 'subscription.endDate': 1 }); // For active subscription queries
UserSchema.index({ createdAt: -1 });
// currentOrganizationId is index in Schema
// UserSchema.index({ currentOrganizationId: 1 }); // For organization member lookups
UserSchema.index({ role: 1 }); // For admin/user filtering

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
