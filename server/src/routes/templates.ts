import { Logger } from '../utils/Logger.js';
// import { Router } from 'express';
// import { Template } from '../models/Template.js';
// import { authMiddleware, AuthRequest } from '../middleware/auth.js';
// import { connectDB } from '../utils/db.js';
// import { capcutImporter } from '../services/CapCutImporter.js';
// import { canvaImporter } from '../services/CanvaImporter.js';

// const router = Router();

// // TEMPLATE API CONSTANTS
// const ZOCKET_API_TEMPLATES = 'https://prod.zocket.com/customer/ads/api/v1/editor/video-templates/all';

// // GET /api/templates - Browse templates
// router.get('/', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();

//         // 1. Check if we have templates in DB
//         const count = await Template.countDocuments({ is_published: true });

//         // 2. If empty, sync from Zocket
//         if (count === 0) {
//             Logger.info('Template DB empty, syncing from Zocket...');
//             try {
//                 // Fetch all templates (or a large batch) to populate DB
//                 const zocketUrl = `${ZOCKET_API_TEMPLATES}?is_published=true&page=0&limit=1000`; // Initial sync limit
//                 const response = await fetch(zocketUrl);

//                 if (!response.ok) {
//                     Logger.error(`Failed to fetch from Zocket: ${response.status}`);
//                 } else {
//                     const data: any = await response.json();
//                     if (data.data && Array.isArray(data.data.templates)) {
//                         const templatesToSave = data.data.templates.map((t: any) => {
//                             let pages = [];
//                             try {
//                                 pages = typeof t.pages === 'string' ? JSON.parse(t.pages) : t.pages;
//                             } catch (e) {
//                                 Logger.warn(`Failed to parse pages for template ${t.id}`, e);
//                             }
//                             return {
//                                 id: t.id + "_zocket",
//                                 name: t.name,
//                                 category: 'ad',
//                                 tags: [...t.format, ...t.orientations],
//                                 pricing: { type: 'free' },
//                                 pages: pages,
//                                 source: {
//                                     platform: 'zocket',
//                                     originalId: t.id,
//                                     importedAt: new Date()
//                                 },
//                                 is_published: true,
//                                 author: "zocket.io",
//                                 createdAt: new Date(),
//                                 updatedAt: new Date()
//                             };
//                         });
//                         await Template.insertMany(templatesToSave);
//                         Logger.info(`Synced ${templatesToSave.length} templates from Zocket`);
//                     }
//                 }
//             } catch (error) {
//                 Logger.error('Error syncing templates from Zocket:', error);
//             }
//         }

//         const { category, search, sort, pricing, page = 1, limit = 20, tab = 'public' } = req.query;

//         const filter: any = {};

//         if (tab === 'private') {
//             filter.author = req.user!.userId;
//             filter.is_published = false;
//         } else if (tab === 'public') {
//             filter.is_published = true;
//         } else {
//             // For discovery tabs (canva/capcut), we might need different logic
//             filter.is_published = true;
//             if (tab === 'canva' || tab === 'capcut') {
//                 filter['source.platform'] = tab;
//             }
//         }

//         if (category) filter.category = category;
//         if (pricing) filter['pricing.type'] = pricing;
//         if (search) {
//             filter.$text = { $search: search as string };
//         }

//         const sortOptions: any = {};
//         if (sort === 'popular') sortOptions.downloads = -1;
//         else if (sort === 'rating') sortOptions.rating = -1;
//         else if (sort === 'newest') sortOptions.createdAt = -1;
//         else sortOptions.featured = -1;

//         const templates = await Template.find(filter)
//             .sort(sortOptions)
//             .skip((Number(page) - 1) * Number(limit))
//             .limit(Number(limit))
//             .populate('author', 'name avatar')
//             .lean();

//         const total = await Template.countDocuments(filter);

//         res.json({
//             success: true,
//             data: {
//                 templates,
//                 total,
//                 page: Number(page),
//                 pages: Math.ceil(total / Number(limit))
//             }
//         });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // GET /api/templates/:id - Get template details
// router.get('/:id', async (req, res) => {
//     try {
//         await connectDB();
//         const template = await Template.findById(req.params.id)
//             .populate('author', 'name avatar')
//             .populate('reviews.userId', 'name avatar');

//         if (!template) {
//             return res.status(404).json({ success: false, error: 'Template not found' });
//         }

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // POST /api/templates - Create template
// router.post('/', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();
//         const template = await Template.create({
//             ...req.body,
//             author: req.user!.userId,
//             authorName: req.user!.email
//         } as any);

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // POST /api/templates/import - Unified Import
// router.post('/import', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();
//         const { url } = req.body;
//         if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

//         let templateData: any;
//         if (url.includes('capcut.com')) {
//             templateData = await capcutImporter.importTemplate(url);
//         } else if (url.includes('canva.com')) {
//             templateData = await canvaImporter.importDesign(url);
//         } else {
//             return res.status(400).json({ success: false, error: 'Unsupported URL platform. Use CapCut or Canva links.' });
//         }

//         const template = await Template.create({
//             ...templateData,
//             author: req.user!.userId,
//             authorName: req.user!.email,
//             pricing: { type: 'free' },
//             is_published: false
//         });

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // POST /api/templates/import/canva - Import from Canva
// router.post('/import/canva', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();
//         const { url } = req.body;

//         if (!url) {
//             return res.status(400).json({ success: false, error: 'URL is required' });
//         }

//         const templateData = await canvaImporter.importDesign(url);

//         const template = await Template.create({
//             ...templateData,
//             author: req.user!.userId,
//             authorName: req.user!.email,
//             pricing: { type: 'free' },
//             is_published: false
//         });

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // POST /api/templates/:id/use - Use template (track downloads)
// router.post('/:id/use', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();
//         const template = await Template.findByIdAndUpdate(
//             req.params.id,
//             { $inc: { downloads: 1 } },
//             { new: true }
//         );

//         if (!template) {
//             return res.status(404).json({ success: false, error: 'Template not found' });
//         }

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// // POST /api/templates/:id/review - Add review
// router.post('/:id/review', authMiddleware, async (req: AuthRequest, res) => {
//     try {
//         await connectDB();
//         const { rating, comment } = req.body;

//         const template = await Template.findByIdAndUpdate(
//             req.params.id,
//             {
//                 $push: {
//                     reviews: {
//                         userId: req.user!.userId,
//                         rating,
//                         comment,
//                         createdAt: new Date()
//                     }
//                 }
//             },
//             { new: true }
//         );

//         if (!template) {
//             return res.status(404).json({ success: false, error: 'Template not found' });
//         }

//         // Recalculate average rating
//         const avgRating = template.reviews.reduce((sum, r) => sum + r.rating, 0) / template.reviews.length;
//         template.rating = avgRating;
//         await template.save();

//         res.json({ success: true, data: { template } });
//     } catch (e: any) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

// export default router;
