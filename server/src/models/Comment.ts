import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
    projectId: mongoose.Types.ObjectId;
    segmentId?: string;
    timestamp?: number; // For timeline comments
    author: mongoose.Types.ObjectId;
    content: string;
    resolved: boolean;
    replies: {
        author: mongoose.Types.ObjectId;
        content: string;
        createdAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        segmentId: { type: String, index: true },
        timestamp: { type: Number },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        resolved: { type: Boolean, default: false, index: true },
        replies: [{
            author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            content: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    { timestamps: true }
);

// Indexes for comment queries
CommentSchema.index({ projectId: 1, resolved: 1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ projectId: 1, segmentId: 1 });

export const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
