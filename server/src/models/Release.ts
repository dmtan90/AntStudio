import mongoose, { Schema, Document, Model } from 'mongoose';
import { LicenseType } from './License.js';

export enum ReleaseChannel {
    STABLE = 'stable',
    BETA = 'beta',
    NIGHTLY = 'nightly'
}

export interface IRelease extends Document {
    version: string; // e.g., "1.4.2"
    channel: ReleaseChannel | string;
    releaseNotes: string;
    downloadUrl: string;
    checksum?: string;
    isActive: boolean;
    minLicenseTier: LicenseType | string; // Force-gating updates
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReleaseSchema = new Schema<IRelease>(
    {
        version: { type: String, required: true, unique: true },
        channel: { type: String, enum: Object.values(ReleaseChannel), default: ReleaseChannel.STABLE },
        releaseNotes: { type: String, required: true },
        downloadUrl: { type: String, required: true },
        checksum: { type: String },
        isActive: { type: Boolean, default: true },
        minLicenseTier: { type: String, enum: Object.values(LicenseType), default: LicenseType.BASIC },
        publishedAt: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

export const Release: Model<IRelease> = mongoose.models.Release || mongoose.model<IRelease>('Release', ReleaseSchema);
