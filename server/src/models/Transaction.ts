import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TransactionType {
    LICENSE_PURCHASE = 'license_purchase',
    LICENSE_RENEWAL = 'license_renewal',
    CREDITS = 'credits',
    CREDIT_PURCHASE = 'credit_purchase',
    ENTERPRISE_CONTRACT = 'enterprise_contract',
    ECONOMY_PURCHASE = 'economy_purchase',
    CREDIT_ADD = 'credit_add'
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

export enum TransactionGateway {
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    MANUAL = 'manual',
    ECONOMY = 'economy'
}

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: TransactionType | string;
    amount: number;
    currency: string;
    status: TransactionStatus | string;
    gateway: TransactionGateway | string;
    gatewayTransactionId?: string;
    metadata: {
        licenseKey?: string;
        packageId?: string;
        durationDays?: number;
        credits?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: Object.values(TransactionType), required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
        gateway: { type: String, enum: Object.values(TransactionGateway), required: true },
        gatewayTransactionId: { type: String },
        metadata: {
            licenseKey: String,
            packageId: String,
            durationDays: Number,
            credits: Number
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
