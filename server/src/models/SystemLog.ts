import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemLog extends Document {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source: string; // Component or function name
    metadata?: any;
    timestamp: Date;
    expiresAt: Date; // For dynamic TTL
}

const SystemLogSchema = new Schema<ISystemLog>(
    {
        level: {
            type: String,
            enum: ['debug', 'info', 'warn', 'error'],
            index: true,
            required: true
        },
        message: { type: String, required: true },
        source: { type: String, required: true, index: true },
        metadata: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now, index: true },
        expiresAt: { type: Date, required: true, index: true }
    },
    {
        timestamps: false // We use our own timestamp for precise control
    }
);

// Dynamic TTL index: automatically remove logs when expiresAt is reached
SystemLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SystemLog: Model<ISystemLog> =
    mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
