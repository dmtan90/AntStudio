import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplate extends Document {
    id: string; // Original ID from Zocket or generated
    name: string;
    is_published: boolean;
    pages: any[]; // Storing pages as complex objects, can be refined later if needed
    createdAt: Date;
    updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
    {
        id: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true
        },
        is_published: {
            type: Boolean,
            default: false
        },
        pages: {
            type: [Schema.Types.Mixed], // storing the pages array as is
            default: []
        }
    },
    {
        timestamps: true
    }
);

// Indexes
TemplateSchema.index({ is_published: 1 });
TemplateSchema.index({ name: 'text' });

export const Template: Model<ITemplate> = mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
