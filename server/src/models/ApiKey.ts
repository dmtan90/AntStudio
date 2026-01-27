import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
    userId: mongoose.Types.ObjectId;
    tenantId?: mongoose.Types.ObjectId;
    name: string; // e.g. "Production API Key"
    keyHash: string; // Hashed version of the key
    keyPreview: string; // e.g. "ant_...1234"
    status: 'active' | 'revoked';
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    keyPreview: { type: String, required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    lastUsedAt: Date
}, { timestamps: true });

// Index for fast lookup during authentication
ApiKeySchema.index({ keyHash: 1, status: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
