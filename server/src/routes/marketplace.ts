import { Router } from 'express';
import { deductCredits } from '../utils/credits.js';
import { MarketplaceAsset } from '../models/MarketplaceAsset.js';
import { Template } from '../models/Template.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { connectDB } from '../utils/db.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';
import { capcutImporter } from '../services/CapCutImporter.js';
import { canvaImporter } from '../services/CanvaImporter.js';

const router = Router();

/**
 * PUBLIC/AUTH BROWSE ENDPOINTS
 */

// GET /api/marketplace/assets - Browse products
router.get('/assets', async (req, res) => {
    try {
        await connectDB();
        const { type, search, sort } = req.query;

        let query: any = { status: 'published' };
        if (type) query.type = type;
        if (search) query.$text = { $search: search as string };

        const sortOption: any = {};
        if (sort === 'newest') sortOption.createdAt = -1;
        else if (sort === 'popular') sortOption['metrics.salesCount'] = -1;
        else sortOption.createdAt = -1;

        const assets = await MarketplaceAsset.find(query)
            .sort(sortOption)
            .limit(40)
            .populate('authorId', 'name avatar');

        res.json({ success: true, data: assets });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/marketplace/assets/:id - Asset details
router.get('/assets/:id', async (req, res) => {
    try {
        await connectDB();
        const asset = await MarketplaceAsset.findById(req.params.id).populate('authorId', 'name avatar');
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json({ success: true, data: asset });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PROTECTED COMMERCE ENDPOINTS
 */

// POST /api/marketplace/purchase/:id - Buy an asset
router.post('/purchase/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const buyerId = req.user!.userId;
        const asset = await MarketplaceAsset.findById(req.params.id);

        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        if (asset.authorId.toString() === buyerId) return res.status(400).json({ error: 'You cannot buy your own asset' });

        // 1. Deduct Credits from Buyer
        const success = await deductCredits(
            buyerId,
            'marketplace',
            asset.priceCredits,
            `Purchase Asset: ${asset.title}`
        );

        if (!success) {
            return res.status(402).json({ success: false, error: 'Insufficient credits in wallet or organization pool' });
        }

        // 2. Revenue Share (Creator Payout)
        // Creator gets 70% of credits
        const creatorEarning = Math.floor(asset.priceCredits * 0.7);
        const { User } = await import('../models/User.js');
        const creator = await User.findById(asset.authorId);

        if (creator) {
            creator.credits.balance += creatorEarning;
            creator.creditLogs.push({
                type: 'obtained',
                amount: creatorEarning,
                description: `Sale: ${asset.title} (70% Share)`,
                timestamp: new Date()
            });
            await creator.save();

            // Also check if creator is an affiliate to track "Total Lifetime Earnings"
            const { Affiliate } = await import('../models/Affiliate.js');
            const affiliate = await Affiliate.findOne({ userId: creator._id });
            if (affiliate) {
                affiliate.balance.totalEarned += creatorEarning;
                affiliate.balance.unpaid += creatorEarning;
                affiliate.metrics.conversions += 1;
                await affiliate.save();
            }
        }

        // 3. Update Asset Metrics
        asset.metrics.salesCount += 1;
        asset.metrics.totalRevenue += asset.priceCredits;
        await asset.save();

        res.json({
            success: true,
            message: `Purchase successful! ${asset.title} added to your library.`,
            data: { fileUrl: asset.fileUrl }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * CREATOR ENDPOINTS
 */

// POST /api/marketplace/publish - List a new product
router.post('/publish', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { title, description, type, priceCredits, fileUrl, previewUrl, tags } = req.body;

        const asset = await MarketplaceAsset.create({
            title,
            description,
            type,
            authorId: req.user!.userId,
            priceCredits: priceCredits || 0,
            fileUrl,
            previewUrl,
            tags: tags || [],
            status: 'published' // Auto-approve for POC
        });

        res.json({ success: true, data: asset });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * TEMPLATE MARKETPLACE ENDPOINTS
 */

// GET /api/marketplace/templates - Browse templates
router.get('/templates', async (req, res) => {
    try {
        await connectDB();
        const { category, search, sort, pricing, page = 1, limit = 20 } = req.query;

        const filter: any = { is_published: true };
        if (category) filter.category = category;
        if (pricing) filter['pricing.type'] = pricing;
        if (search) {
            filter.$text = { $search: search as string };
        }

        const sortOptions: any = {};
        if (sort === 'popular') sortOptions.downloads = -1;
        else if (sort === 'rating') sortOptions.rating = -1;
        else if (sort === 'newest') sortOptions.createdAt = -1;
        else sortOptions.featured = -1;

        const templates = await Template.find(filter)
            .sort(sortOptions)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('author', 'name avatar')
            .lean();

        const total = await Template.countDocuments(filter);

        res.json({
            success: true,
            data: {
                templates,
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/marketplace/templates/:id - Get template details
router.get('/templates/:id', async (req, res) => {
    try {
        await connectDB();
        const template = await Template.findById(req.params.id)
            .populate('author', 'name avatar')
            .populate('reviews.userId', 'name avatar');

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/templates - Create template
router.post('/templates', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const template = await Template.create({
            ...req.body,
            author: req.user!.userId,
            authorName: req.user!.email
        } as any);

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/import/capcut - Import from CapCut
router.post('/import/capcut', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const templateData = await capcutImporter.importTemplate(url);

        const template = await Template.create({
            ...templateData,
            author: req.user!.userId,
            authorName: req.user!.email,
            pricing: { type: 'free' }
        });

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/import/canva - Import from Canva
router.post('/import/canva', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const templateData = await canvaImporter.importDesign(url);

        const template = await Template.create({
            ...templateData,
            author: req.user!.userId,
            authorName: req.user!.email,
            pricing: { type: 'free' }
        });

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/templates/:id/use - Use template (track downloads)
router.post('/templates/:id/use', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const template = await Template.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloads: 1 } },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/templates/:id/review - Add review
router.post('/templates/:id/review', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { rating, comment } = req.body;

        const template = await Template.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    reviews: {
                        userId: req.user!.userId,
                        rating,
                        comment,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        // Recalculate average rating
        const avgRating = template.reviews.reduce((sum, r) => sum + r.rating, 0) / template.reviews.length;
        template.rating = avgRating;
        await template.save();

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
