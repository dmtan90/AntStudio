import mongoose, { Schema, Document, Model } from 'mongoose';

export enum LicenseType {
    TRIAL = 'trial',
    BASIC = 'basic',
    PRO = 'pro',
    ENTERPRISE = 'enterprise'
};

export enum LicenseStatus {
    VALID = 'valid',
    EXPIRED = 'expired',
    INVALID = 'invalid',
    REVOKED = 'revoked',
    ACTIVE = 'active',
    TRIAL = 'trial',
    SUSPENDED = 'suspended'
};

export interface ILicense extends Document {
    key: string;
    owner: string; // Email of the owner on Master
    tier: LicenseType | string;
    status: LicenseStatus | string;
    instancesLimit: number; // Max Edge servers for this key
    activeInstances: number;
    maxUsersPerInstance: number;
    maxProjectsPerInstance: number;
    startDate: Date;
    endDate: Date;
    lastCheckedAt?: Date;
    fleetTelemetry: Array<{
        instanceId: string;
        lastIp: string;
        lastHeartbeat: Date;
        version: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
    {
        key: { type: String, required: true, unique: true },
        owner: { type: String, required: true },
        tier: { type: String, enum: Object.values(LicenseType), default: LicenseType.TRIAL },
        status: { type: String, enum: Object.values(LicenseStatus), default: LicenseStatus.VALID },
        instancesLimit: { type: Number, default: 1 },
        activeInstances: { type: Number, default: 0 },
        maxUsersPerInstance: { type: Number, default: 10 },
        maxProjectsPerInstance: { type: Number, default: 50 },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        lastCheckedAt: { type: Date },
        fleetTelemetry: [{
            instanceId: String,
            lastIp: String,
            lastHeartbeat: Date,
            version: String
        }]
    },
    {
        timestamps: true
    }
);

// Indexes for performance
// LicenseSchema.index({ key: 1 }, { unique: true }); // License key lookup
LicenseSchema.index({ owner: 1, status: 1 }); // Owner's active licenses
LicenseSchema.index({ status: 1, endDate: 1 }); // Active/expiring license queries
LicenseSchema.index({ tier: 1, status: 1, endDate: 1 }); // Tier-based analytics (for MRR calculation)

export const License: Model<ILicense> = mongoose.models.License || mongoose.model<ILicense>('License', LicenseSchema);
