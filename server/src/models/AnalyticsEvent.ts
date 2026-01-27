import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnalyticsEvent extends Document {
    userId?: mongoose.Types.ObjectId;
    sessionId: string;
    event: string;
    properties: any;
    timestamp: Date;
    userAgent?: string;
    ip?: string;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        sessionId: { type: String, required: true },
        event: { type: String, required: true, index: true },
        properties: { type: Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, default: Date.now, index: true },
        userAgent: String,
        ip: String
    },
    {
        timestamps: false // We use timestamp field instead
    }
);

// Indexes for analytics queries
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ event: 1, timestamp: -1 });
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });

export const AnalyticsEvent: Model<IAnalyticsEvent> = mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
