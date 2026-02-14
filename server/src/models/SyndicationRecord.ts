import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISyndicationRecord extends Document {
    userId: Types.ObjectId;
    projectId: Types.ObjectId;
    assetId?: Types.ObjectId;
    platformAccountId: Types.ObjectId;
    platform: string;
    status: 'scheduled' | 'pending' | 'success' | 'failed';
    externalId?: string;
    externalUrl?: string;
    metadata: {
        title: string;
        description: string;
        thumbnail?: string;
    };
    engagement: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
    };
    error?: string;
    publishedAt?: Date;
    scheduledAt?: Date;
    lastSyncedAt?: Date;
    hookId?: string; // e.g. "uuid"
    hookType?: string; // e.g. "Controversial", "Educational"
    milestonesReached?: string[]; // e.g. ["100_views", "1000_views"]
    createdAt: Date;
    updatedAt: Date;
}

const SyndicationRecordSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    assetId: { type: Schema.Types.ObjectId },
    platformAccountId: { type: Schema.Types.ObjectId, ref: 'UserPlatformAccount', required: true },
    platform: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['scheduled', 'pending', 'success', 'failed'], 
        default: 'pending',
        index: true
    },
    externalId: { type: String },
    externalUrl: { type: String },
    metadata: {
        title: { type: String },
        description: { type: String },
        thumbnail: { type: String }
    },
    engagement: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },
    milestonesReached: [{ type: String }],
    error: { type: String },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    lastSyncedAt: { type: Date, default: Date.now },
    hookId: { type: String, index: true },
    hookType: { type: String }
}, {
    timestamps: true
});

// Indexes for common queries
SyndicationRecordSchema.index({ userId: 1, createdAt: -1 });
// SyndicationRecordSchema.index({ projectId: 1 });

export const SyndicationRecord = mongoose.model<ISyndicationRecord>('SyndicationRecord', SyndicationRecordSchema);
