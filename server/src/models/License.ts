import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILicense extends Document {
    key: string;
    owner: string; // Email of the owner
    type: 'trial' | 'free' | 'enterprise';
    status: 'valid' | 'expired' | 'revoked';
    maxUsers: number;
    maxProjects: number;
    startDate: Date;
    endDate: Date;
    hwid?: string; // Hardware ID binding
    lastCheckedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
    {
        key: { type: String, required: true, unique: true },
        owner: { type: String, required: true },
        type: { type: String, enum: ['trial', 'free', 'enterprise'], required: true },
        status: { type: String, enum: ['valid', 'expired', 'revoked'], default: 'valid' },
        maxUsers: { type: Number, default: 5 }, // Default for trial/free
        maxProjects: { type: Number, default: 10 }, // Default for trial/free
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        hwid: { type: String },
        lastCheckedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

export const License: Model<ILicense> = mongoose.models.License || mongoose.model<ILicense>('License', LicenseSchema);
