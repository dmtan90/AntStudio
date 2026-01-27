import mongoose, { Schema, Document } from 'mongoose';

export interface ICommission extends Document {
    affiliateId: mongoose.Types.ObjectId;
    paymentId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId; // The user who made the payment
    productName: string;
    saleAmount: number;
    commissionRate: number; // Percentage at time of sale
    commissionAmount: number; // Actual value earned
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    payoutId?: string;
    createdAt: Date;
}

const CommissionSchema = new Schema<ICommission>({
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    saleAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'cancelled'],
        default: 'pending',
        index: true
    },
    payoutId: String
}, { timestamps: true });

// Compound indexes for dashboard performance
CommissionSchema.index({ affiliateId: 1, createdAt: -1 });
CommissionSchema.index({ affiliateId: 1, status: 1 });

export const Commission = mongoose.model<ICommission>('Commission', CommissionSchema);
