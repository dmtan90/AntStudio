import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplate extends Document {
    // Basic info
    name: string;
    description: string;
    category: 'intro' | 'outro' | 'transition' | 'full-video' | 'social-media' | 'ad' | 'tutorial';
    thumbnail: string;
    previewVideo?: string;

    // Template structure (AntFlow format)
    structure: {
        segments: any[];
        duration: number;
        aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
        customizableFields: string[];
        requiredAssets: {
            type: 'image' | 'video' | 'audio';
            placeholder: string;
            description: string;
        }[];
    };

    // External source tracking
    source: {
        platform?: 'capcut' | 'canva' | 'native';
        originalId?: string;
        importedAt?: Date;
        originalUrl?: string;
    };

    // Pricing & monetization
    pricing: {
        type: 'free' | 'premium' | 'pro-only';
        price?: number;
        creatorRevenue?: number;
    };

    // Creator & metadata
    author: mongoose.Types.ObjectId;
    authorName: string;
    tags: string[];
    downloads: number;
    rating: number;
    reviews: {
        userId: mongoose.Types.ObjectId;
        rating: number;
        comment: string;
        createdAt: Date;
    }[];

    // Admin flags
    featured: boolean;
    verified: boolean;
    is_published: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ['intro', 'outro', 'transition', 'full-video', 'social-media', 'ad', 'tutorial'],
            required: true,
            index: true
        },
        thumbnail: { type: String, required: true },
        previewVideo: String,

        structure: {
            segments: [Schema.Types.Mixed],
            duration: Number,
            aspectRatio: { type: String, enum: ['16:9', '9:16', '1:1', '4:5'], default: '16:9' },
            customizableFields: [String],
            requiredAssets: [{
                type: { type: String, enum: ['image', 'video', 'audio'] },
                placeholder: String,
                description: String
            }]
        },

        source: {
            platform: { type: String, enum: ['capcut', 'canva', 'native'], default: 'native' },
            originalId: String,
            importedAt: Date,
            originalUrl: String
        },

        pricing: {
            type: { type: String, enum: ['free', 'premium', 'pro-only'], default: 'free' },
            price: Number,
            creatorRevenue: { type: Number, default: 70 }
        },

        author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        authorName: String,
        tags: [{ type: String, index: true }],
        downloads: { type: Number, default: 0, index: true },
        rating: { type: Number, default: 0 },
        reviews: [{
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            rating: Number,
            comment: String,
            createdAt: { type: Date, default: Date.now }
        }],

        featured: { type: Boolean, default: false, index: true },
        verified: { type: Boolean, default: false },
        is_published: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for marketplace queries
TemplateSchema.index({ category: 1, featured: -1, downloads: -1 });
TemplateSchema.index({ tags: 1, rating: -1 });
TemplateSchema.index({ 'pricing.type': 1, downloads: -1 });
TemplateSchema.index({ createdAt: -1 });
TemplateSchema.index({ is_published: 1, featured: -1 });

// Text search
TemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Template: Model<ITemplate> = mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
