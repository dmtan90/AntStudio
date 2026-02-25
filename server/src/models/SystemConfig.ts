import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemConfig extends Document {
    key: string;
    value: string;
    description?: string;
    group?: string;
    isPublic: boolean; // Whether it can be exposed to the client
    updatedAt: Date;
    createdAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: String, required: true },
        description: { type: String },
        group: { type: String, default: 'general' },
        isPublic: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

export const SystemConfig: Model<ISystemConfig> =
    mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
