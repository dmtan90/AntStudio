import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;

    // Usage tracking
    usage: {
        streamingMinutes: number;
        storageGB: number;
        platformDestinations: number;
        lastReset: Date;
    };

    // Feature limits based on tier
    limits: {
        maxStreamingMinutes: number; // -1 for unlimited
        maxResolution: '720p' | '1080p' | '4k';
        maxPlatforms: number;
        storageGB: number;
        hasAIFeatures: boolean;
        hasAnalytics: boolean;
        hasWhiteLabel: boolean;
        hasAPIAccess: boolean;
        maxSeats: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    usage: {
        streamingMinutes: { type: Number, default: 0 },
        storageGB: { type: Number, default: 0 },
        platformDestinations: { type: Number, default: 0 },
        lastReset: { type: Date, default: Date.now }
    },

    limits: {
        maxStreamingMinutes: { type: Number, default: 300 }, // 5 hours for free
        maxResolution: { type: String, default: '720p' },
        maxPlatforms: { type: Number, default: 1 },
        storageGB: { type: Number, default: 5 },
        hasAIFeatures: { type: Boolean, default: false },
        hasAnalytics: { type: Boolean, default: false },
        hasWhiteLabel: { type: Boolean, default: false },
        hasAPIAccess: { type: Boolean, default: false },
        maxSeats: { type: Number, default: 1 }
    }
}, { timestamps: true });

// Methods
SubscriptionSchema.methods.canStream = function (): boolean {
    if (this.limits.maxStreamingMinutes === -1) return true;
    return this.usage.streamingMinutes < this.limits.maxStreamingMinutes;
};

SubscriptionSchema.methods.canAddPlatform = function (): boolean {
    return this.usage.platformDestinations < this.limits.maxPlatforms;
};

SubscriptionSchema.methods.hasFeature = function (feature: string): boolean {
    const featureMap: Record<string, keyof ISubscription['limits']> = {
        'ai': 'hasAIFeatures',
        'analytics': 'hasAnalytics',
        'whitelabel': 'hasWhiteLabel',
        'api': 'hasAPIAccess'
    };
    const key = featureMap[feature];
    return key ? this.limits[key] as boolean : false;
};

SubscriptionSchema.methods.resetUsage = function () {
    this.usage.streamingMinutes = 0;
    this.usage.platformDestinations = 0;
    this.usage.lastReset = new Date();
};

// Statics
SubscriptionSchema.statics.getDefaultLimits = function (tier: 'free' | 'pro' | 'enterprise') {
    const limits = {
        free: {
            maxStreamingMinutes: 300, // 5 hours
            maxResolution: '720p' as const,
            maxPlatforms: 1,
            storageGB: 5,
            hasAIFeatures: false,
            hasAnalytics: false,
            hasWhiteLabel: false,
            hasAPIAccess: false,
            maxSeats: 1
        },
        pro: {
            maxStreamingMinutes: -1, // Unlimited
            maxResolution: '1080p' as const,
            maxPlatforms: 3,
            storageGB: 100,
            hasAIFeatures: true,
            hasAnalytics: true,
            hasWhiteLabel: false,
            hasAPIAccess: false,
            maxSeats: 1
        },
        enterprise: {
            maxStreamingMinutes: -1,
            maxResolution: '4k' as const,
            maxPlatforms: -1, // Unlimited
            storageGB: 1000,
            hasAIFeatures: true,
            hasAnalytics: true,
            hasWhiteLabel: true,
            hasAPIAccess: true,
            maxSeats: 10
        }
    };
    return limits[tier];
};

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
