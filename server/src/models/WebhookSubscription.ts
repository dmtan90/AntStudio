import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookSubscription extends Document {
    userId: mongoose.Types.ObjectId;
    tenantId?: mongoose.Types.ObjectId;
    url: string; // Destination for POST payloads
    events: string[]; // ['ai.job.completed', 'stream.started', etc.]
    secret: string; // HMAC signing secret for verification
    isActive: boolean;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WebhookSubscriptionSchema = new Schema<IWebhookSubscription>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    url: { type: String, required: true },
    events: [{ type: String, required: true }],
    secret: { type: String, required: true }, // Ideally generated on delivery creation
    isActive: { type: Boolean, default: true, index: true },
    description: String
}, { timestamps: true });

// Compound index for efficient event routing
WebhookSubscriptionSchema.index({ events: 1, isActive: 1 });

export const WebhookSubscription = mongoose.model<IWebhookSubscription>('WebhookSubscription', WebhookSubscriptionSchema);
