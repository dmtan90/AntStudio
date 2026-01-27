import mongoose, { Schema, Document } from 'mongoose';

export enum SocialPlatform {
    YOUTUBE = 'youtube',
    FACEBOOK = 'facebook',
    TIKTOK = 'tiktok',
    ANT_MEDIA = 'ant-media',
    CUSTOM_RTMP = 'custom-rtmp'
}

export interface IUserPlatformAccount extends Document {
    userId: mongoose.Types.ObjectId;
    platform: SocialPlatform;
    accountName: string; // e.g., "My Gaming Channel"
    accountId?: string; // Platform-specific ID
    avatarUrl?: string;

    // Encrypted credentials or OAuth tokens
    credentials: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: Date;
        email?: string;
        password?: string; // For manual login types
        serverUrl?: string; // For AMS
    };

    streamKey?: string;
    rtmpUrl?: string;

    isActive: boolean;
    status: 'connected' | 'expired' | 'error';
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserPlatformAccountSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: {
        type: String,
        enum: Object.values(SocialPlatform),
        required: true
    },
    accountName: { type: String, required: true },
    accountId: { type: String },
    avatarUrl: { type: String },

    credentials: {
        accessToken: { type: String },
        refreshToken: { type: String },
        expiresAt: { type: Date },
        email: { type: String },
        password: { type: String },
        serverUrl: { type: String }
    },

    streamKey: { type: String },
    rtmpUrl: { type: String },

    isActive: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['connected', 'expired', 'error'],
        default: 'connected'
    },
    lastSyncedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound index to prevent duplicate platform accounts for same channel ID for a user
UserPlatformAccountSchema.index({ userId: 1, platform: 1, accountId: 1 }, { unique: true, sparse: true });

export const UserPlatformAccount = mongoose.model<IUserPlatformAccount>('UserPlatformAccount', UserPlatformAccountSchema);
