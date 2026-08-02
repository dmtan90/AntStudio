import mongoose, { Schema, Document } from 'mongoose';

export enum AssetType {
    OVERLAY = 'overlay',
    PERSONA = 'persona',
    TEMPLATE = 'template',
    MUSIC = 'music',
    SFX = 'sfx',
}

export enum AssetStatus {
    PENDING = 'pending',
    PUBLISHED = 'published',
    HIDDEN = 'hidden',
    DELETED = 'deleted',
}

export interface IMarketplaceAsset extends Document {
    title: string;
    description: string;
    type: AssetType | string;
    authorId: mongoose.Types.ObjectId; // User or Tenant
    priceCredits: number;
    fileUrl: string; // S3 Key/URL for the actual asset
    previewUrl?: string; // S3 Key/URL for thumbnail/video preview
    tags: string[];
    metrics: {
        salesCount: number;
        totalRevenue: number;
        rating: number;
        reviewsCount: number;
    };
    status: AssetStatus | string;
    isOfficial: boolean; // Verified by AntStudio
    createdAt: Date;
    updatedAt: Date;
}

const MarketplaceAssetSchema = new Schema<IMarketplaceAsset>({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(AssetType),
        required: true,
        index: true
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    priceCredits: { type: Number, default: 0, index: true },
    fileUrl: { type: String, required: true },
    previewUrl: { type: String },
    tags: [String],
    metrics: {
        salesCount: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        rating: { type: Number, default: 5 },
        reviewsCount: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: Object.values(AssetStatus),
        default: AssetStatus.PENDING,
        index: true
    },
    isOfficial: { type: Boolean, default: false }
}, { timestamps: true });

// Text index for search
MarketplaceAssetSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const MarketplaceAsset = mongoose.model<IMarketplaceAsset>('MarketplaceAsset', MarketplaceAssetSchema);
