import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Template } from '../models/Template.js';
import { connectDB } from '../utils/db.js';

const router = Router();

router.use(authMiddleware);

// GET /api/templates
router.get('/', async (req, res) => {
    try {
        await connectDB();
        const { category, tag, limit = 50 } = req.query;

        const query: any = { is_published: true };

        if (category) {
            query.category = category;
        }

        if (tag) {
            query.tags = tag;
        }

        const templates = await Template.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json({ success: true, data: templates });
    } catch (error: any) {
        console.error('Get templates error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
});

// GET /api/templates/:id
router.get('/:id', async (req, res) => {
    try {
        await connectDB();
        const template = await Template.findOne({ id: req.params.id });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        res.json({ success: true, data: template });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch template' });
    }
});

// POST /api/templates (Admin/Creator only - but enabling for testing)
router.post('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { id, name, category, thumbnail, pages, data, tags } = req.body;

        // Check if exists
        let template = await Template.findOne({ id });

        if (template) {
            template.name = name || template.name;
            // Handle legacy structure if needed, or just standard fields
            if (thumbnail) (template as any).thumbnail = thumbnail;
            if (category) (template as any).category = category;
            if (tags) (template as any).tags = tags;

            await template.save();
        } else {
            template = await Template.create({
                ...(req.body as any), // Cast req.body to any and spread its properties
                author: (req.user as any)!.userId,
                authorName: (req.user as any)!.name || (req.user as any)!.email,
                is_published: true, // Auto publish for now
            } as any);
        }

        res.json({ success: true, data: template });
    } catch (error: any) {
        console.error('Save template error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to save template' });
    }
});

export default router;
