import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
    userId: Types.ObjectId;
    organizationId?: Types.ObjectId;
    name: string;
    description: string;
    price: number;
    currency: string;
    image: string;
    images: string[];
    stock: number;
    inventoryUrl?: string;
    views: number;
    clicks: number;
    sales: number;
    isActive: boolean;
    features: string[];
    brand_name?: string;
    brand_logo?: string;
    brand_slogan?: string;
    primary_colors: string[];
    secondary_colors: string[];
    video?: string;
    metadata: any;
    // Phase 11: Product Knowledge Base
    knowledgeBase?: string;          // Distilled text from inventoryUrl scraping
    knowledgeStatus?: 'pending' | 'processing' | 'ready' | 'error';
    knowledgeUpdatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    inventoryUrl: { type: String },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    features: { type: [String], default: [] },
    brand_name: { type: String, default: '' },
    brand_logo: { type: String, default: '' },
    brand_slogan: { type: String, default: '' },
    primary_colors: { type: [String], default: [] },
    secondary_colors: { type: [String], default: [] },
    video: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    // Phase 11: Product Knowledge Base
    knowledgeBase: { type: String, default: null },
    knowledgeStatus: { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: null },
    knowledgeUpdatedAt: { type: Date, default: null }
}, {
    timestamps: true
});

// Index for faster searches
ProductSchema.index({ userId: 1 });
ProductSchema.index({ organizationId: 1 });
ProductSchema.index({ name: 'text' });

export const Product = model<IProduct>('Product', ProductSchema);
