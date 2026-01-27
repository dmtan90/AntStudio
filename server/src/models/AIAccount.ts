import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuota {
    used: number;
    limit: number;
    resetAt?: Date;
}

export interface IAIAccount extends Document {
    email: string;
    providerId: string; // e.g., 'google', 'anthropic'
    accountType: 'standard' | 'antigravity' | '11labs-direct'; // Distinction for OAuth credentials

    // OAuth Tokens
    refreshToken?: string;
    accessToken?: string;
    accessTokenExpiresAt?: Date;

    // Google Cloud specific
    projectId?: string;
    licenseKey?: string; // For 11labs-direct accounts
    avatarUrl?: string;

    // Usage Tracking
    quotas: Map<string, IQuota>; // key: modelId (e.g., 'gemini-1.5-pro')

    // Status
    status: 'ready' | 'error' | 'rate-limited' | 'unauthorized';
    errorMessage?: string;
    isActive: boolean;
    isPaid: boolean;

    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AIAccountSchema = new Schema<IAIAccount>(
    {
        email: { type: String, required: true },
        providerId: { type: String, required: true, default: 'google' },
        accountType: {
            type: String,
            enum: ['standard', 'antigravity', '11labs-direct'],
            default: 'standard',
            required: true
        },

        refreshToken: String,
        accessToken: String,
        accessTokenExpiresAt: Date,

        projectId: String,
        licenseKey: String,
        avatarUrl: String,

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

        lastUsedAt: Date
    },
    {
        timestamps: true
    }
);

// Indexes
AIAccountSchema.index({ email: 1, accountType: 1 }, { unique: true });
AIAccountSchema.index({ providerId: 1, status: 1 });
AIAccountSchema.index({ isActive: 1 });

export const AIAccount: Model<IAIAccount> =
    mongoose.models.AIAccount || mongoose.model<IAIAccount>('AIAccount', AIAccountSchema);
