import mongoose from 'mongoose';

export interface INodeHeartbeat {
    nodeId: string;
    status: string;
    ip: string;
    region?: string;
    lastSeen: Date;
}

const nodeHeartbeatSchema = new mongoose.Schema<INodeHeartbeat>({
    nodeId: { type: String, required: true, unique: true },
    status: { type: String, default: 'healthy' },
    ip: { type: String, required: true },
    region: { type: String },
    lastSeen: { type: Date, required: true, index: { expires: 60 } } // Auto-remove after 60s of inactivity
});

export const NodeHeartbeat = mongoose.model<INodeHeartbeat>('NodeHeartbeat', nodeHeartbeatSchema);
