import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplate extends Document {
    // Legacy/Migration ID
    id: string;

    // Basic info
    name: string;
    description: string;
    category: 'intro' | 'outro' | 'transition' | 'full-video' | 'social-media' | 'ad' | 'tutorial';
    thumbnail: string;
    previewVideo?: string;

    // Template structure (User's specific format)
    pages: {
        id: string;
        name: string;
        thumbnail: string;
        preview: string;
        duration: number;
        data: {
            fill: string;
            height: number;
            width: number;
            format: string;
            orientation: string;
            audios: {
                id: string;
                url: string;
                name: string;
                trim: number;
                muted: boolean;
                offset: number;
                volume: number;
                playing: boolean;
                duration: number;
                timeline: number;
            }[];
            scene: string; // Fabric.js JSON string
        };
        blocks: {
            id: string;
            start: number;
            end: number;
        }[];
    }[];

    // External source tracking
    source: {
        platform?: 'capcut' | 'canva' | 'zocket' | 'private';
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
        id: { type: String, index: true },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        category: {
            type: String,
            enum: ['intro', 'outro', 'transition', 'full-video', 'social-media', 'ad', 'tutorial'],
            default: 'full-video',
            index: true
        },
        thumbnail: { type: String },
        previewVideo: String,

        pages: [{
            id: String,
            name: String,
            thumbnail: String,
            preview: String,
            duration: Number,
            data: {
                fill: String,
                height: Number,
                width: Number,
                format: String,
                orientation: String,
                audios: [{
                    id: String,
                    url: String,
                    name: String,
                    trim: { type: Number, default: 0 },
                    muted: { type: Boolean, default: false },
                    offset: { type: Number, default: 0 },
                    volume: { type: Number, default: 1 },
                    playing: { type: Boolean, default: false },
                    duration: Number,
                    timeline: Number
                }],
                scene: String
            },
            blocks: [{
                id: String,
                start: Number,
                end: Number
            }]
        }],

        source: {
            platform: { type: String, enum: ['capcut', 'canva', 'zocket', 'private'], default: 'zocket' },
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
