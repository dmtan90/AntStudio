import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
    name: string;
    subdomain: string;
    customDomain?: string;

    // Hierarchy Support
    parentId?: mongoose.Types.ObjectId; // Pointer to Master Tenant
    tenantType: 'root' | 'master' | 'sub';

    // White-label branding
    branding: {
        logo: string;
        primaryColor: string;
        secondaryColor: string;
        favicon: string;
        companyName: string;
        supportEmail: string;
        customCSS?: string;
    };

    // License configuration
    license: {
        type: 'startup' | 'business' | 'enterprise' | 'perpetual';
        status: 'active' | 'trial' | 'suspended' | 'expired';
        startDate: Date;
        endDate?: Date;
        maxSeats: number; // -1 for unlimited
        features: string[]; // ['ai', 'analytics', 'api', 'sso', 'whitelabel']
    };

    // Usage tracking
    usage: {
        activeUsers: number;
        totalUsers: number;
        storageGB: number;
        bandwidthGB: number;
        streamingMinutes: number;
        lastReset: Date;
    };

    // Billing
    billing: {
        plan: string;
        amount: number;
        currency: string;
        billingCycle: 'monthly' | 'yearly' | 'perpetual';
        nextBillingDate?: Date;
        paymentMethod: string;
        stripeCustomerId?: string;
        revenueShare?: {
            enabled: boolean;
            percentage: number; // e.g., 20 for 20%
        };
    };

    // Configuration
    config: {
        allowUserSignup: boolean; // Public registration
        requireEmailVerification: boolean;
        emailDomainWhitelist?: string[]; // Only @acme.com can register
        ssoProvider?: {
            type: 'google' | 'microsoft' | 'okta' | 'saml';
            config: any;
        };
        customEmailTemplates?: boolean;
        apiAccess?: {
            enabled: boolean;
            apiKey: string;
            rateLimit: number; // requests per minute
        };
    };

    // Contact information
    contact: {
        adminName: string;
        adminEmail: string;
        adminPhone?: string;
        companyAddress?: string;
    };

    // Deployment & Resale Config
    deployment: {
        type: 'cloud' | 'self-hosted' | 'hybrid';
        mode: 'internal' | 'public'; // Added deployment mode
        region?: string;
        customInfrastructure?: boolean;
    };

    // Monthly Credit Refresh Config for End-Users
    resaleConfig?: {
        enabled: boolean;
        refreshDay: number; // e.g., 1 (first day of month)
        credits: {
            free: number;
            pro: number;
            enterprise: number;
        };
        integratedBilling: {
            provider: 'stripe' | 'paypal';
            isEnabled: boolean;
            publishableKey?: string;
            secretKey?: string;
        };
    };

    // Organization Credit Pool (Shared among internal sub-tenant users)
    organizationPool?: {
        total: number;
        used: number;
        monthlyAllocation: number;
        negativeLimit: number; // Allow trusted sub-tenants to go below zero
    };

    createdAt: Date;
    updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>({
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true },
    customDomain: { type: String, unique: true, sparse: true },

    parentId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    tenantType: { type: String, enum: ['root', 'master', 'sub'], default: 'master' },

    branding: {
        logo: { type: String, default: '' },
        primaryColor: { type: String, default: '#3b82f6' },
        secondaryColor: { type: String, default: '#8b5cf6' },
        favicon: { type: String, default: '' },
        companyName: { type: String, required: true },
        supportEmail: { type: String, required: true },
        customCSS: String
    },

    license: {
        type: { type: String, enum: ['startup', 'business', 'enterprise', 'perpetual'], required: true },
        status: { type: String, enum: ['active', 'trial', 'suspended', 'expired'], default: 'trial' },
        startDate: { type: Date, default: Date.now },
        endDate: Date,
        maxSeats: { type: Number, default: 50 },
        features: [String]
    },

    usage: {
        activeUsers: { type: Number, default: 0 },
        totalUsers: { type: Number, default: 0 },
        storageGB: { type: Number, default: 0 },
        bandwidthGB: { type: Number, default: 0 },
        streamingMinutes: { type: Number, default: 0 },
        lastReset: { type: Date, default: Date.now }
    },

    billing: {
        plan: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        billingCycle: { type: String, enum: ['monthly', 'yearly', 'perpetual'], required: true },
        nextBillingDate: Date,
        paymentMethod: String,
        stripeCustomerId: String,
        revenueShare: {
            enabled: { type: Boolean, default: false },
            percentage: { type: Number, default: 0 }
        }
    },

    config: {
        allowUserSignup: { type: Boolean, default: false },
        requireEmailVerification: { type: Boolean, default: true },
        emailDomainWhitelist: [String],
        ssoProvider: {
            type: { type: String, enum: ['google', 'microsoft', 'okta', 'saml'] },
            config: Schema.Types.Mixed
        },
        customEmailTemplates: { type: Boolean, default: false },
        apiAccess: {
            enabled: { type: Boolean, default: false },
            apiKey: String,
            rateLimit: { type: Number, default: 100 }
        }
    },

    contact: {
        adminName: { type: String, required: true },
        adminEmail: { type: String, required: true },
        adminPhone: String,
        companyAddress: String
    },

    deployment: {
        type: { type: String, enum: ['cloud', 'self-hosted', 'hybrid'], default: 'cloud' },
        mode: { type: String, enum: ['internal', 'public'], default: 'internal' },
        region: String,
        customInfrastructure: { type: Boolean, default: false }
    },

    resaleConfig: {
        enabled: { type: Boolean, default: false },
        refreshDay: { type: Number, default: 1 },
        credits: {
            free: { type: Number, default: 10 },
            pro: { type: Number, default: 100 },
            enterprise: { type: Number, default: 1000 }
        },
        integratedBilling: {
            provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
            isEnabled: { type: Boolean, default: false },
            publishableKey: String,
            secretKey: String
        }
    },

    organizationPool: {
        total: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        monthlyAllocation: { type: Number, default: 0 },
        negativeLimit: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Indexes
// TenantSchema.index({ subdomain: 1 });
// TenantSchema.index({ customDomain: 1 });
TenantSchema.index({ 'license.status': 1 });

// Methods
TenantSchema.methods.hasFeature = function (feature: string): boolean {
    return this.license.features.includes(feature);
};

TenantSchema.methods.canAddUser = function (): boolean {
    if (this.license.maxSeats === -1) return true;
    return this.usage.totalUsers < this.license.maxSeats;
};

TenantSchema.methods.isLicenseValid = function (): boolean {
    if (this.license.status !== 'active' && this.license.status !== 'trial') {
        return false;
    }
    if (this.license.endDate && this.license.endDate < new Date()) {
        return false;
    }
    return true;
};

TenantSchema.methods.resetMonthlyUsage = function () {
    this.usage.streamingMinutes = 0;
    this.usage.bandwidthGB = 0;
    this.usage.lastReset = new Date();
};

// Statics
TenantSchema.statics.getDefaultFeatures = function (licenseType: string) {
    const features = {
        startup: ['ai', 'analytics', 'whitelabel-basic'],
        business: ['ai', 'analytics', 'whitelabel-advanced', 'api', 'sso'],
        enterprise: ['ai', 'analytics', 'whitelabel-full', 'api', 'sso', 'custom-features', 'multi-region'],
        perpetual: ['ai', 'analytics', 'whitelabel-full', 'api', 'sso', 'source-code']
    };
    return features[licenseType as keyof typeof features] || [];
};

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
