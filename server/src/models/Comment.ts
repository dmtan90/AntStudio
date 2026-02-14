import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  projectId: string;
  segmentId?: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number; // Video timestamp in seconds
  replies?: Array<{
    userId: string;
    content: string;
    createdAt: Date;
  }>;
  resolved?: boolean;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  segmentId: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true }, // Video position
  replies: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

CommentSchema.index({ projectId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
