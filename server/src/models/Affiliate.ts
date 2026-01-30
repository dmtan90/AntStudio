import mongoose, { Schema, Document } from 'mongoose';

export interface IAffiliate extends Document {
    userId: mongoose.Types.ObjectId;
    referralCode: string; // Unique slug (e.g. 'creator20')
    commissionRate: number; // e.g. 20 for 20%
    metrics: {
        totalClicks: number;
        conversions: number;
        totalRevenueGenerated: number;
    };
    balance: {
        unpaid: number;
        totalEarned: number;
    };
    payoutDetails?: {
        method: 'paypal' | 'bank' | 'stripe';
        address: string;
    };
    status: 'active' | 'pending' | 'suspended';
    createdAt: Date;
}

const AffiliateSchema = new Schema<IAffiliate>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode: { type: String, required: true, unique: true, lowercase: true, trim: true },
    commissionRate: { type: Number, default: 20 },
    metrics: {
        totalClicks: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        totalRevenueGenerated: { type: Number, default: 0 }
    },
    balance: {
        unpaid: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 }
    },
    payoutDetails: {
        method: { type: String, enum: ['paypal', 'bank', 'stripe'] },
        address: String
    },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active' }
}, { timestamps: true });

// Index for fast lookup via URL slug
// AffiliateSchema.index({ referralCode: 1 });

export const Affiliate = mongoose.model<IAffiliate>('Affiliate', AffiliateSchema);
