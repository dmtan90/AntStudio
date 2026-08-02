import mongoose, { Schema, Document, Model } from 'mongoose';
import { LicenseType } from './License.js';
import { TenantBillingCycle } from './Tenant.js';

export interface ILicensePackage extends Document {
    name: string;
    tier: LicenseType | string;
    description: string;
    price: number;
    currency: string;
    billingPeriod: TenantBillingCycle | string;
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
        tier: { type: String, enum: Object.values(LicenseType), required: true },
        description: { type: String },
        price: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        billingPeriod: { type: String, enum: Object.values(TenantBillingCycle), default: TenantBillingCycle.MONTHLY },
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
