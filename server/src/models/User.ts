import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SYS_ADMIN = 'sys-admin'
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired'
}

export enum SubscriptionPlan {
    FREE = 'free',
    BASIC = 'basic',
    PRO = 'pro',
    ENTERPRISE = 'enterprise'
}

export enum CreditType {
    MEMBERSHIP = 'membership',
    BONUS = 'bonus',
    WEEKLY = 'weekly'
}

export enum CreditTransactionType {
    CONSUMED = 'consumed',
    OBTAINED = 'obtained'
}

export enum Language {
    EN = 'en',
    VI = 'vi',
    ZH = 'zh',
    JA = 'ja',
    ES = 'es'
}

export enum Theme {
    DARK = 'dark',
    LIGHT = 'light'
}

export interface IUser extends Document {
    email: string
    passwordHash: string
    name: string
    avatar?: string
    role: UserRole | string
    tenantId?: mongoose.Types.ObjectId // Association with White-label Tenant
    currentOrganizationId?: mongoose.Types.ObjectId // Active Team Context
    subscription: {
        plan: SubscriptionPlan | string
        status: SubscriptionStatus
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
        type: CreditTransactionType | string
        amount: number
        description: string
        timestamp: Date
    }>
    emailVerified: boolean
    language: Language | string
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
    gamification: {
        xp: number
        level: number
        totalXp: number
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
            enum: Object.values(UserRole),
            default: UserRole.USER
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
                enum: Object.values(SubscriptionPlan),
                default: SubscriptionPlan.FREE
            },
            status: {
                type: String,
                enum: Object.values(SubscriptionStatus),
                default: SubscriptionStatus.ACTIVE
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
                type: { type: String, enum: Object.values(CreditTransactionType) },
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
            enum: Object.values(Language),
            default: Language.EN
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
        gamification: {
            xp: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
            totalXp: { type: Number, default: 0 }
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        preferences: {
            aiPersona: { type: String, default: 'Default Enthusiast' },
            theme: { type: String, default: Theme.DARK },
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
