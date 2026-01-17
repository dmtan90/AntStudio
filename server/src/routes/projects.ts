import { Router } from 'express';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

// GET /api/projects - List user's projects with pagination
router.get('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const search = req.query.search as string;

        // Build filter
        const filter: any = { userId: req.user!.userId };
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch projects with pagination
        const skip = (page - 1) * limit;
        const [projects, total] = await Promise.all([
            Project.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Project.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('List projects error:', error);
        res.status(500).json({ error: error.message || 'Failed to list projects' });
    }
});

// POST /api/projects - Create new project
router.post('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const { title, description, language, style } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const project = await Project.create({
            userId: req.user!.userId,
            title,
            description,
            language: language || 'en',
            style: style || {},
            status: 'draft'
        });

        res.status(201).json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ error: error.message || 'Failed to create project' });
    }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Get project error:', error);
        res.status(500).json({ error: error.message || 'Failed to get project' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user!.userId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Update project error:', error);
        res.status(500).json({ error: error.message || 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete project' });
    }
});

export default router;
