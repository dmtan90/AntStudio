import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRelease extends Document {
    version: string; // e.g., "1.4.2"
    channel: 'stable' | 'beta' | 'nightly';
    releaseNotes: string;
    downloadUrl: string;
    checksum?: string;
    isActive: boolean;
    minLicenseTier: 'basic' | 'pro' | 'enterprise'; // Force-gating updates
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReleaseSchema = new Schema<IRelease>(
    {
        version: { type: String, required: true, unique: true },
        channel: { type: String, enum: ['stable', 'beta', 'nightly'], default: 'stable' },
        releaseNotes: { type: String, required: true },
        downloadUrl: { type: String, required: true },
        checksum: { type: String },
        isActive: { type: Boolean, default: true },
        minLicenseTier: { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
        publishedAt: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

export const Release: Model<IRelease> = mongoose.models.Release || mongoose.model<IRelease>('Release', ReleaseSchema);
