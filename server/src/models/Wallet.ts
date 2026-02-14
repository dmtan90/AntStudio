import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
    userId: string;
    balance: number;
    inventory: string[];
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        userId: { type: String, required: true, unique: true },
        balance: { type: Number, default: 100 },
        inventory: [{ type: String }]
    },
    {
        timestamps: true
    }
);

// Indexes
// WalletSchema.index({ userId: 1 });

export const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
