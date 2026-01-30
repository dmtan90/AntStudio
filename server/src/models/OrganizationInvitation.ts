import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrganizationInvitation extends Document {
    organizationId: Types.ObjectId;
    inviterId: Types.ObjectId;
    email: string;
    role: 'producer' | 'editor' | 'synthesizer';
    token: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationInvitationSchema = new Schema<IOrganizationInvitation>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        role: {
            type: String,
            enum: ['producer', 'editor', 'synthesizer'],
            default: 'editor'
        },
        token: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'expired'],
            default: 'pending'
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    },
    { timestamps: true }
);

OrganizationInvitationSchema.index({ email: 1 });
// OrganizationInvitationSchema.index({ token: 1 });

export const OrganizationInvitation: Model<IOrganizationInvitation> =
    mongoose.models.OrganizationInvitation || mongoose.model<IOrganizationInvitation>('OrganizationInvitation', OrganizationInvitationSchema);
