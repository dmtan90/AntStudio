import mongoose from 'mongoose';

export interface IStreamSession {
    sessionId: string;
    userId: string;
    status: 'starting' | 'live' | 'error' | 'stopped';
    mode: 'ams' | 'internal';
    source: string;
    nodeId: string;
    targets: Array<{
        url: string;
        key: string;
        platform: string;
        accountId?: string;
    }>;
    startTime?: Date;
    endTime?: Date;
    error?: string;
}

const streamSessionSchema = new mongoose.Schema<IStreamSession>({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: ['starting', 'live', 'error', 'stopped'], default: 'starting' },
    mode: { type: String, enum: ['ams', 'internal'], required: true },
    source: { type: String },
    nodeId: { type: String, required: true }, // The server node currently handling the native stream
    targets: [{
        url: String,
        key: String,
        platform: String,
        accountId: String
    }],
    startTime: { type: Date },
    endTime: { type: Date },
    error: { type: String }
}, {
    timestamps: true
});

export const StreamSessionModel = mongoose.model<IStreamSession>('StreamSession', streamSessionSchema);
