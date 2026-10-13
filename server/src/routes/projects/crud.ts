// Project CRUD (moved verbatim from routes/projects.ts).
// Mounted by routes/projects.ts after authMiddleware.
import { Router } from 'express';
import { Response } from 'express';
import { connectDB } from '../../utils/db.js';
import { Project } from '../../models/Project.js';
import { Logger } from '../../utils/Logger.js';
import { cacheMiddleware } from '../../middleware/cache.js';
import { User } from '../../models/User.js';
import { rbacMiddleware } from '../../middleware/rbac.js';
import { Permission } from '../../utils/permissions.js';
import { checkProjectLimit, licenseGating } from '../../middleware/LicenseGating.js';
import { AnalyticsService } from '../../services/streaming/ProjectAnalyticsService.js';
import { LicenseType } from '~/models/License.js';
import { escapeRegExp } from '../../utils/escapeRegExp.js';

const router = Router();

// GET /api/projects - List user's projects with multi-tenant scoping
router.get('/',
    cacheMiddleware({ ttl: 30, keyPrefix: 'projects:list' }),
    async (req: any, res: Response) => {
        try {
            await connectDB();
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const status = req.query.status as string;
            const search = req.query.search as string;

            const user = await User.findById(req.user!.userId);
            const filter: any = {};

            if (user?.currentOrganizationId) {
                filter.organizationId = user.currentOrganizationId;
            } else {
                filter.userId = req.user!.userId;
                filter.organizationId = { $exists: false }; // Private projects
            }

            if (status) filter.status = status;
            if (search) {
                filter.$or = [
                    { title: { $regex: escapeRegExp(search), $options: 'i' } },
                    { description: { $regex: escapeRegExp(search), $options: 'i' } }
                ];
            }

            const skip = (page - 1) * limit;
            const [projects, total] = await Promise.all([
                Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                Project.countDocuments(filter)
            ]);

            res.json({
                success: true,
                data: {
                    projects,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
                }
            });
        } catch (error: any) {
            Logger.error('List projects error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to list projects' });
        }
    });

// POST /api/projects - Create new project (scoped to organization)
router.post('/', licenseGating(LicenseType.TRIAL), checkProjectLimit, rbacMiddleware(Permission.PROJECT_CREATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { title, description, mode, aspectRatio, videoStyle, targetDuration, metadata, pages, scriptAnalysis, storyboard } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

        const user = await User.findById(req.user!.userId);
        const project = await Project.create({
            userId: req.user!.userId,
            organizationId: user?.currentOrganizationId || undefined,
            title,
            description: description || scriptAnalysis?.summary || '',
            mode: mode || 'topic',
            aspectRatio: aspectRatio || '16:9',
            videoStyle: videoStyle || 'cinematic',
            targetDuration: targetDuration || 60,
            status: 'draft',
            input: {},
            metadata: metadata || {},
            pages: pages || null,
            scriptAnalysis: scriptAnalysis || null,
            storyboard: storyboard || null,
            scripts: req.body.scripts || null,
            creativeBrief: req.body.creativeBrief || null
        });

        res.status(201).json({ success: true, data: { project } });
    } catch (error: any) {
        Logger.error('Create project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create project' });
    }
});

// GET /api/projects/:id - Get single project (scoped)
router.get('/:id', async (req: any, res: Response) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId);
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const isOwner = project.userId.toString() === req.user!.userId.toString();
        const isOrgProject = project.organizationId && user?.currentOrganizationId &&
            project.organizationId.toString() === user.currentOrganizationId.toString();

        if (!isOwner && !isOrgProject) {
            return res.status(403).json({ success: false, error: 'Access denied: project is outside active context' });
        }

        // Track view asynchronously
        void AnalyticsService.trackView(req.params.id);

        res.json({ success: true, data: { project } });
    } catch (error: any) {
        Logger.error('Get project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to get project' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        // Ownership/sharing fields can't be changed through a generic update
        const PROTECTED_FIELDS = ['_id', 'userId', 'organizationId', 'collaborators', 'createdAt', 'updatedAt', '__v'];
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(req.body || {})) {
            if (key.startsWith('$') || PROTECTED_FIELDS.includes(key.split('.')[0])) continue;
            updates[key] = value;
        }
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user!.userId },
            { $set: updates },
            { new: true, runValidators: true }
        );
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        res.json({ success: true, data: { project } });
    } catch (error: any) {
        Logger.error('Update project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', rbacMiddleware(Permission.PROJECT_DELETE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        res.json({ success: true, data: { message: 'Project deleted successfully' } });
    } catch (error: any) {
        Logger.error('Delete project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete project' });
    }
});

export default router;
