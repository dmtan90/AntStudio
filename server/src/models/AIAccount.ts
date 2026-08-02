import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuota {
    used: number;
    limit: number;
    resetAt?: Date;
}

export enum AIAccountProvider {
    GOOGLE = 'google',
    GOOGLE_VERTEX = 'vertex',
    ANTHROPIC = 'anthropic',
    DEEPSEEK = 'deepseek',
    OPENROUTER = 'openrouter',
    ELEVENLABS = 'elevenlabs',
    OPENAI = 'openai',
    CUSTOM = 'custom',
    PRIVATE = 'private',
    GOOGLE_FLOW = 'google-flow',
    GEMINI = 'gemini',
    AISTUDIO = 'aistudio'
};

export enum AIAccountType {
    STANDARD = 'standard',
    ANTIGRAVITY = 'antigravity',
    GOOGLE_FLOW = 'google-flow',
    GOOGLE_CLOUD = 'google-cloud',
    API_KEY = 'apikey',
    GOOGLE_VERTEX = 'vertex',
    OPENAI = 'openai',
    CUSTOM = 'custom',
};

export enum AIAccountStatus {
    READY = 'ready',
    ERROR = 'error',
    RATE_LIMITED = 'rate-limited',
    UNAUTHORIZED = 'unauthorized'
};

export interface IAIAccount extends Document {
    email: string;
    name?: string; // Display name from provider
    providerId: AIAccountProvider | string; // e.g., 'google', 'anthropic'
    accountType: AIAccountType | string; // 'standard' | 'antigravity' | 'google-flow' | 'google-cloud'; // Distinction for OAuth credentials

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
    status: AIAccountStatus | string;
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
        providerId: { type: String, required: true, default: AIAccountProvider.GOOGLE },
        accountType: { type: String, enum: Object.values(AIAccountType), default: AIAccountType.STANDARD, required: true },

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
            enum: Object.values(AIAccountStatus),
            default: AIAccountStatus.READY
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
