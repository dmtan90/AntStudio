import mongoose, { Schema, Document } from 'mongoose';

export interface IModerationAudit extends Document {
    userId: mongoose.Types.ObjectId;
    tenantId?: mongoose.Types.ObjectId;
    projectId?: mongoose.Types.ObjectId;
    type: 'text' | 'image' | 'video';
    content: string; // Prompt text or Media URL
    scores: {
        toxicity?: number;
        nsfw?: number;
        harassment?: number;
        hateSpeech?: number;
        brandRisk?: number;
    };
    status: 'flagged' | 'blocked' | 'approved';
    decisionBy?: mongoose.Types.ObjectId; // Admin user
    decisionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ModerationAuditSchema = new Schema<IModerationAudit>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    type: { type: String, enum: ['text', 'image', 'video'], required: true, index: true },
    content: { type: String, required: true },
    scores: {
        toxicity: Number,
        nsfw: Number,
        harassment: Number,
        hateSpeech: Number,
        brandRisk: Number
    },
    status: { type: String, enum: ['flagged', 'blocked', 'approved'], default: 'flagged', index: true },
    decisionBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionNotes: String
}, { timestamps: true });

export const ModerationAudit = mongoose.model<IModerationAudit>('ModerationAudit', ModerationAuditSchema);
