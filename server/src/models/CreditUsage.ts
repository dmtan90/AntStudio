import mongoose, { Schema, Document } from 'mongoose';
import { ServiceType } from '~/utils/CreditManager.js';

export interface ICreditUsage extends Document {
    tenantId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    serviceType: ServiceType | string;
    creditsConsumed: number;
    description: string;
    metadata: any; // e.g. { videoId: '...', duration: 60 }
    timestamp: Date;
}

const CreditUsageSchema = new Schema<ICreditUsage>({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceType: {
        type: String,
        enum: Object.values(ServiceType),
        required: true,
        index: true
    },
    creditsConsumed: { type: Number, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Compound indexes for rapid tenant-level analytics
CreditUsageSchema.index({ tenantId: 1, timestamp: -1 });
CreditUsageSchema.index({ tenantId: 1, serviceType: 1 });

export const CreditUsage = mongoose.model<ICreditUsage>('CreditUsage', CreditUsageSchema);
