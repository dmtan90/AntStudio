import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILicensePackage extends Document {
    name: string;
    tier: 'basic' | 'pro' | 'enterprise';
    description: string;
    price: number;
    currency: string;
    billingPeriod: 'monthly' | 'yearly' | 'lifetime';
    limits: {
        instances: number;
        usersPerInstance: number;
        projectsPerInstance: number;
    };
    stripePriceId?: string;
    paypalPlanId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LicensePackageSchema = new Schema<ILicensePackage>(
    {
        name: { type: String, required: true },
        tier: { type: String, enum: ['basic', 'pro', 'enterprise'], required: true },
        description: { type: String },
        price: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        billingPeriod: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
        limits: {
            instances: { type: Number, default: 1 },
            usersPerInstance: { type: Number, default: 10 },
            projectsPerInstance: { type: Number, default: 50 }
        },
        stripePriceId: { type: String },
        paypalPlanId: { type: String },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

export const LicensePackage: Model<ILicensePackage> = mongoose.models.LicensePackage || mongoose.model<ILicensePackage>('LicensePackage', LicensePackageSchema);
