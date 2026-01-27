import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProjectVersion extends Document {
    projectId: mongoose.Types.ObjectId;
    version: number;
    snapshot: any; // Full project state
    changes: {
        field: string;
        oldValue: any;
        newValue: any;
        userId?: mongoose.Types.ObjectId;
    }[];
    createdBy: mongoose.Types.ObjectId;
    message: string;
    createdAt: Date;
}

const ProjectVersionSchema = new Schema<IProjectVersion>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        version: { type: Number, required: true },
        snapshot: { type: Schema.Types.Mixed, required: true },
        changes: [{
            field: String,
            oldValue: Schema.Types.Mixed,
            newValue: Schema.Types.Mixed,
            userId: { type: Schema.Types.ObjectId, ref: 'User' }
        }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, default: 'Auto-save' }
    },
    { timestamps: true }
);

// Indexes for version queries
ProjectVersionSchema.index({ projectId: 1, version: -1 });
ProjectVersionSchema.index({ createdBy: 1, createdAt: -1 });

export const ProjectVersion: Model<IProjectVersion> = mongoose.models.ProjectVersion || mongoose.model<IProjectVersion>('ProjectVersion', ProjectVersionSchema);
