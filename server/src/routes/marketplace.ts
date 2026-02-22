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
import { pptxImporter } from '../services/PptxImporter.js';
import multer from 'multer';
import axios from 'axios';

const upload = multer({ storage: multer.memoryStorage() });

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
            const affiliate = await Affiliate.findOne({ userId: creator._id.toString() });
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
const ZOCKET_API_TEMPLATES = 'https://prod.zocket.com/customer/ads/api/v1/editor/video-templates/all';

// GET /api/marketplace/templates - Browse templates
router.get('/templates', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        // 1. Check if we have templates in DB
        const count = await Template.countDocuments({ is_published: true });
        // 2. If empty, sync from Zocket
        if (count === 0) {
            console.log('Template DB empty, syncing from Zocket...');
            try {
                // Fetch all templates (or a large batch) to populate DB
                const zocketUrl = `${ZOCKET_API_TEMPLATES}?is_published=true&page=0&limit=1000`; // Initial sync limit
                const response = await fetch(zocketUrl);

                if (!response.ok) {
                    console.error(`Failed to fetch from Zocket: ${response.status}`);
                    // Don't fail the request, just return empty or what we have
                }
                else {
                    const data: any = await response.json();
                    if (data.data && Array.isArray(data.data.templates)) {
                        const templatesToSave = data.data.templates.map((t: any) => {
                            let pages = [];
                            try {
                                pages = typeof t.pages === 'string' ? JSON.parse(t.pages) : t.pages;
                                
                                // Calculate orientation for each page
                                if (pages && pages.length > 0) {
                                    pages.forEach((p: any) => {
                                        if (p.data && p.data.width && p.data.height) {
                                            const { width, height } = p.data;
                                            if (width < height) p.data.orientation = 'portrait';
                                            else if (width === height) p.data.orientation = 'square';
                                            else if (width > height) p.data.orientation = 'landscape';
                                        }
                                    });
                                }
                            } catch (e) {
                                console.warn(`Failed to parse pages for template ${t.id}`, e);
                            }
                            return {
                                id: t.id + "_zocket",
                                name: t.name,
                                category: 'ad',
                                tags: [...t.formats || [], ...t.orientations || []],
                                pricing: { type: 'free' },
                                pages: pages,
                                source: {
                                    platform: 'zocket',
                                    originalId: t.id,
                                    importedAt: new Date()
                                },
                                is_published: true,
                                author: req.user!.userId,
                                authorName: "zocket.io",
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                        });
                        await Template.insertMany(templatesToSave);
                        console.log(`Synced ${templatesToSave.length} templates from Zocket`);
                    }
                }
            } catch (error) {
                console.error('Error syncing templates from Zocket:', error);
            }
        }

        const { category, search, sort, pricing, page = 1, limit = 20, tab = 'public', platform, ratio } = req.query;

        const filter: any = {};

        if (tab === 'private') {
            filter.author = req.user!.userId;
            // For private/user templates, we show both published and unpublished
        } else if (tab === 'public') {
            filter.is_published = true;
        } else if (tab === 'canva' || tab === 'capcut') {
            filter.is_published = true;
            filter['source.platform'] = tab;
        } else {
            filter.is_published = true;
        }

        // Additional filters from Discovery UI
        if (platform) filter['source.platform'] = platform;
        if (category && category !== 'all' && category !== 'All') {
            filter.category = category;
        }

        if (pricing) filter['pricing.type'] = pricing;
        if (ratio) filter['pages.data.orientation'] = ratio;

        if (search) {
            // Using a simple regex search if text index isn't available or for partial matches
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search as string, 'i')] } }
            ];
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
        const templateData = req.body;
        
        // Ensure orientation is calculated for each page
        if (templateData.pages && Array.isArray(templateData.pages)) {
            templateData.pages.forEach((p: any) => {
                if (p.data && p.data.width && p.data.height) {
                    const { width, height } = p.data;
                    if (width < height) p.data.orientation = 'portrait';
                    else if (width === height) p.data.orientation = 'square';
                    else if (width > height) p.data.orientation = 'landscape';
                }
            });
        }

        const template = await Template.create({
            ...templateData,
            author: req.user!.userId,
            authorName: req.user!.email
        } as any);

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/import - Unified Import
router.post('/import', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

        let templateData: any;
        if (url.includes('capcut.com')) {
            templateData = await capcutImporter.importTemplate(url);
        } else if (url.includes('canva.com')) {
            templateData = await canvaImporter.importDesign(url);
        } else {
            return res.status(400).json({ success: false, error: 'Unsupported URL platform. Use CapCut or Canva links.' });
        }

        // Calculate orientation for pages
        if (templateData.pages && Array.isArray(templateData.pages)) {
            templateData.pages.forEach((p: any) => {
                if (p.data && p.data.width && p.data.height) {
                    const { width, height } = p.data;
                    if (width < height) p.data.orientation = 'portrait';
                    else if (width === height) p.data.orientation = 'square';
                    else if (width > height) p.data.orientation = 'landscape';
                }
            });
        }

        const template = await Template.create({
            ...templateData,
            author: req.user!.userId,
            authorName: req.user!.email,
            pricing: { type: 'free' },
            is_published: false
        });

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/import/pptx - Import from PPTX
router.post('/import/pptx', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const file = req.file;
        const userId = req.user!.userId;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const templateData = await pptxImporter.importPptx(file, userId);

        // Calculate orientation
        if (templateData.pages && Array.isArray(templateData.pages)) {
            templateData.pages.forEach((p: any) => {
                if (p.data && p.data.width && p.data.height) {
                    const { width, height } = p.data;
                    if (width < height) p.data.orientation = 'portrait';
                    else if (width === height) p.data.orientation = 'square';
                    else if (width > height) p.data.orientation = 'landscape';
                }
            });
        }

        const template = await Template.create({
            ...templateData,
            author: userId,
            authorName: req.user!.email,
            pricing: { type: 'free' },
            is_published: false
        });

        res.json({ success: true, data: { template } });
    } catch (e: any) {
        console.error('PPTX Import error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/marketplace/import/capcut - Import from CapCut (Legacy support)

// POST /api/marketplace/import/canva - Import from Canva
router.post('/import/canva', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const templateData = await canvaImporter.importDesign(url);

        // Calculate orientation
        if (templateData.pages && Array.isArray(templateData.pages)) {
            templateData.pages.forEach((p: any) => {
                if (p.data && p.data.width && p.data.height) {
                    const { width, height } = p.data;
                    if (width < height) p.data.orientation = 'portrait';
                    else if (width === height) p.data.orientation = 'square';
                    else if (width > height) p.data.orientation = 'landscape';
                }
            });
        }

        const template = await Template.create({
            ...templateData,
            author: req.user!.userId,
            authorName: req.user!.email,
            pricing: { type: 'free' },
            is_published: false
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
