import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemMetric extends Document {
    cpuUsage: number; // Percentage
    memory: {
        total: number; // Bytes
        used: number; // Bytes
        free: number; // Bytes
    };
    disk: {
        total: number; // Bytes
        used: number; // Bytes
    };
    network: {
        tx_bytes: number; // Transmitted
        rx_bytes: number; // Received
    };
    timestamp: Date;
}

const SystemMetricSchema = new Schema<ISystemMetric>(
    {
        cpuUsage: { type: Number, required: true },
        memory: {
            total: { type: Number, required: true },
            used: { type: Number, required: true },
            free: { type: Number, required: true }
        },
        disk: {
            total: { type: Number, required: true },
            used: { type: Number, required: true }
        },
        network: {
            tx_bytes: { type: Number, default: 0 },
            rx_bytes: { type: Number, default: 0 }
        },
        timestamp: { type: Date, default: Date.now, index: true }
    },
    {
        timestamps: false
    }
);

// TTL index to keep history for 7 days
SystemMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

export const SystemMetric: Model<ISystemMetric> =
    mongoose.models.SystemMetric || mongoose.model<ISystemMetric>('SystemMetric', SystemMetricSchema);
