import mongoose, { Schema, Document } from 'mongoose';

export interface IClientLog extends Document {
    type: 'javascript' | 'http' | 'promise' | 'network';
    details: any;
    url: string;
    userAgent: string;
    timestamp: Date;
    userId?: mongoose.Types.ObjectId;
}

const ClientLogSchema = new Schema<IClientLog>({
    type: { type: String, required: true },
    details: { type: Schema.Types.Mixed, required: true },
    url: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    // Automatically delete old logs after 30 days
    timestamps: true
});

// Index for faster queries in Monitoring dashboard
ClientLogSchema.index({ type: 1, timestamp: -1 });

export const ClientLog = mongoose.models.ClientLog || mongoose.model<IClientLog>('ClientLog', ClientLogSchema);
