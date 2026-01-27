import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'license_purchase' | 'license_renewal' | 'credits' | 'enterprise_contract';
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    gateway: 'stripe' | 'paypal' | 'manual';
    gatewayTransactionId?: string;
    metadata: {
        licenseKey?: string;
        packageId?: string;
        durationDays?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['license_purchase', 'license_renewal', 'credits', 'enterprise_contract'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
        gateway: { type: String, enum: ['stripe', 'paypal', 'manual'], required: true },
        gatewayTransactionId: { type: String },
        metadata: {
            licenseKey: String,
            packageId: String,
            durationDays: Number
        }
    },
    {
        timestamps: true
    }
);

// Indexes for performance
TransactionSchema.index({ userId: 1, createdAt: -1 }); // User transaction history
TransactionSchema.index({ status: 1, createdAt: -1 }); // Admin dashboard queries
TransactionSchema.index({ gatewayTransactionId: 1 }, { unique: true, sparse: true }); // Payment gateway lookups

export const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
