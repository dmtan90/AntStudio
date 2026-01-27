import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrganizationMember {
    userId: Types.ObjectId;
    role: 'owner' | 'producer' | 'editor' | 'synthesizer';
    joinedAt: Date;
    invitedBy?: Types.ObjectId;
}

export interface IOrganization extends Document {
    name: string;
    description?: string;
    slug: string;
    ownerId: Types.ObjectId;
    members: IOrganizationMember[];

    // Branding & Identity
    branding?: {
        logo?: string;
        primaryColor?: string;
        accentColor?: string;
    };

    // Limits & Settings
    settings: {
        maxMembers: number;
        maxProjects: number;
        allowMemberInvites: boolean;
        publicDiscovery: boolean;
    };

    // Usage Snapshot
    stats: {
        totalProjects: number;
        totalStreamingMinutes: number;
        totalCreditsConsumed: number;
    };

    tenantId?: Types.ObjectId; // Link to white-label parent if applicable
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        members: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                role: {
                    type: String,
                    enum: ['owner', 'producer', 'editor', 'synthesizer'],
                    default: 'editor'
                },
                joinedAt: { type: Date, default: Date.now },
                invitedBy: { type: Schema.Types.ObjectId, ref: 'User' }
            }
        ],
        branding: {
            logo: String,
            primaryColor: { type: String, default: '#3b82f6' },
            accentColor: { type: String, default: '#8b5cf6' }
        },
        settings: {
            maxMembers: { type: Number, default: 10 },
            maxProjects: { type: Number, default: 20 },
            allowMemberInvites: { type: Boolean, default: true },
            publicDiscovery: { type: Boolean, default: false }
        },
        stats: {
            totalProjects: { type: Number, default: 0 },
            totalStreamingMinutes: { type: Number, default: 0 },
            totalCreditsConsumed: { type: Number, default: 0 }
        },
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true }
    },
    { timestamps: true }
);

// Indexes
OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ 'members.userId': 1 });

export const Organization: Model<IOrganization> =
    mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
