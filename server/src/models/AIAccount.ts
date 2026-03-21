import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuota {
    used: number;
    limit: number;
    resetAt?: Date;
}

export interface IAIAccount extends Document {
    email: string;
    name?: string; // Display name from provider
    providerId: string; // e.g., 'google', 'anthropic'
    accountType: 'standard' | 'antigravity' | 'google-flow'; // Distinction for OAuth credentials

    // OAuth Tokens
    refreshToken?: string;
    accessToken?: string;
    accessTokenExpiresAt?: Date;

    // Google Cloud specific
    projectId?: string;
    licenseKey?: string; // Legacy/Global license key
    serviceKeys?: Map<string, string>; // task specific keys for 11labs-direct (voice, image, video)
    avatarUrl?: string;

    // Google Flow specific
    flowST?: string; // __Secure-next-auth.session-token
    flowAT?: string; // Access Token
    flowATExpiresAt?: Date;
    lastFingerprint?: Map<string, any>;

    // Usage Tracking
    quotas: Map<string, IQuota>; // key: modelId (e.g., 'gemini-1.5-pro')

    // Status
    status: 'ready' | 'error' | 'rate-limited' | 'unauthorized';
    errorMessage?: string;
    isActive: boolean;
    isPaid: boolean;

    lastUsedAt?: Date;
    credits?: number; // Available generation credits (e.g., Google Flow)
    createdAt: Date;
    updatedAt: Date;
}

const AIAccountSchema = new Schema<IAIAccount>(
    {
        email: { type: String, required: true },
        name: String,
        providerId: { type: String, required: true, default: 'google' },
        accountType: {
            type: String,
            enum: ['standard', 'antigravity', 'google-flow'],
            default: 'standard',
            required: true
        },

        refreshToken: String,
        accessToken: String,
        accessTokenExpiresAt: Date,

        projectId: String,
        licenseKey: String,
        serviceKeys: {
            type: Map,
            of: String,
            default: {}
        },
        avatarUrl: String,

        // Google Flow specific
        flowST: String,
        flowAT: String,
        flowATExpiresAt: Date,
        lastFingerprint: {
            type: Map,
            of: Schema.Types.Mixed,
            default: {}
        },

        quotas: {
            type: Map,
            of: new Schema({
                used: { type: Number, default: 0 },
                limit: { type: Number, default: 0 },
                resetAt: Date
            }, { _id: false }),
            default: {}
        },

        status: {
            type: String,
            enum: ['ready', 'error', 'rate-limited', 'unauthorized'],
            default: 'ready'
        },
        errorMessage: String,
        isActive: { type: Boolean, default: true },
        isPaid: { type: Boolean, default: false },

        lastUsedAt: Date,
        credits: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

// Indexes
AIAccountSchema.index({ email: 1, accountType: 1 });
AIAccountSchema.index({ providerId: 1, status: 1 });
AIAccountSchema.index({ isActive: 1 });

export const AIAccount: Model<IAIAccount> =
    mongoose.models.AIAccount || mongoose.model<IAIAccount>('AIAccount', AIAccountSchema);
