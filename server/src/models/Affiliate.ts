import mongoose, { Schema, Document } from 'mongoose';

export interface IAffiliate extends Document {
  userId: string;
  referralCode: string;
  commissionRate: number;
  status: 'pending' | 'active' | 'suspended';
  metrics: {
    totalClicks: number;
    conversions: number;
    totalRevenueGenerated: number;
  };
  balance: {
    unpaid: number;
    totalEarned: number;
    totalPaid: number;
  };
  payoutMethod?: {
    type: 'paypal' | 'stripe' | 'bank';
    details: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  referralCode: { type: String, required: true, unique: true },
  commissionRate: { type: Number, default: 20 },
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  metrics: {
    totalClicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    totalRevenueGenerated: { type: Number, default: 0 }
  },
  balance: {
    unpaid: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 }
  },
  payoutMethod: {
    type: { type: String, enum: ['paypal', 'stripe', 'bank'] },
    details: { type: Schema.Types.Mixed }
  }
}, { timestamps: true });

// AffiliateSchema.index({ referralCode: 1 });
// AffiliateSchema.index({ userId: 1 });

export const Affiliate = mongoose.model<IAffiliate>('Affiliate', AffiliateSchema);


// Referral tracking model
export interface IReferral extends Document {
  affiliateId: string;
  referredUserId?: string;
  clickedAt: Date;
  convertedAt?: Date;
  revenue: number;
  commission: number;
  status: 'pending' | 'approved' | 'paid';
}

const ReferralSchema: Schema = new Schema({
  affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true },
  referredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  clickedAt: { type: Date, default: Date.now },
  convertedAt: { type: Date },
  revenue: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' }
});

ReferralSchema.index({ affiliateId: 1, createdAt: -1 });

export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);
