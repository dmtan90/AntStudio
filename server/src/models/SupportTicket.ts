import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupportTicket extends Document {
    userId: mongoose.Types.ObjectId;
    instanceId?: string; // Edge server ID
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in-progress' | 'solved' | 'closed';
    attachments: Array<{
        fileName: string;
        s3Key: string;
        fileType: 'log-bundle' | 'screenshot' | 'config' | 'video';
    }>;
    dataSharingConsent: boolean;
    messages: Array<{
        senderId: mongoose.Types.ObjectId;
        text: string;
        timestamp: Date;
        isAdmin: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        instanceId: { type: String },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        status: { type: String, enum: ['open', 'in-progress', 'solved', 'closed'], default: 'open' },
        attachments: [{
            fileName: String,
            s3Key: String,
            fileType: { type: String, enum: ['log-bundle', 'screenshot', 'config', 'video'] }
        }],
        dataSharingConsent: { type: Boolean, required: true, default: false },
        messages: [{
            senderId: { type: Schema.Types.ObjectId, ref: 'User' },
            text: String,
            timestamp: { type: Date, default: Date.now },
            isAdmin: { type: Boolean, default: false }
        }]
    },
    {
        timestamps: true
    }
);

export const SupportTicket: Model<ISupportTicket> = mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
