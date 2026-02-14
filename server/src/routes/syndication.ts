import { Router, Response } from 'express';
import { connectDB } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { socialSyndicationService } from '../services/SocialSyndicationService.js';
import { Project } from '../models/Project.js';
import { SyndicationRecord } from '../models/SyndicationRecord.js';

const router = Router();

// All syndication routes require authentication
router.use(authMiddleware);

// GET /api/syndication - List syndication history
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            SyndicationRecord.find({ userId: req.user!.userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('projectId', 'title') // Mini project info
                .lean(),
            SyndicationRecord.countDocuments({ userId: req.user!.userId })
        ]);

        res.json({
            success: true,
            data: {
                records,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            }
        });
    } catch (error: any) {
        console.error('[Syndication] List error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/publish-video - Publish existing project asset to social platforms
router.post('/publish-video', rbacMiddleware(Permission.PROJECT_PUBLISH), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { projectId, s3Key, platformAccountIds, metadata } = req.body;

        if (!projectId || !s3Key || !platformAccountIds || !platformAccountIds.length) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: projectId, s3Key, platformAccountIds' });
        }

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const result = await socialSyndicationService.publishVideo(
            projectId,
            s3Key,
            platformAccountIds,
            {
                title: metadata?.title || project.title,
                description: metadata?.description || project.description
            },
            req.body.hookInfo
        );

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Syndication] Publish error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/sync - Trigger manual sync for engagement metrics
router.post('/sync', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        await socialSyndicationService.syncEngagementMetrics(req.user!.userId);
        res.json({ success: true, message: 'Engagement sync started' });
    } catch (error: any) {
        console.error('[Syndication] Sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/retry/:recordId - Retry a failed syndication
router.post('/retry/:recordId', rbacMiddleware(Permission.PROJECT_PUBLISH), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { recordId } = req.params;
        const result = await socialSyndicationService.retrySyndication(recordId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Syndication] Retry error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/syndication/:recordId/comments - Get analyzed comments
router.get('/:recordId/comments', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { recordId } = req.params;
        const comments = await socialSyndicationService.getVideoComments(recordId);
        res.json({ success: true, data: comments });
    } catch (error: any) {
        console.error('[Syndication] Comments fetch error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/:recordId/reply - Post a reply to a comment
router.post('/:recordId/reply', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { recordId } = req.params;
        const { text, parentId } = req.body;
        const result = await socialSyndicationService.replyToComment(recordId, text, parentId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Syndication] Reply error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/ai-suggestion - Suggest an AI reply
router.post('/ai-suggestion', async (req: AuthRequest, res: Response) => {
    try {
        const { commentText, context } = req.body;
        const suggestion = await socialSyndicationService.generateAiReply(commentText, context || 'A viral video clip.');
        res.json({ success: true, data: suggestion });
    } catch (error: any) {
        console.error('[Syndication] AI Suggestion error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/schedule - Schedule a video for future distribution
router.post('/schedule', rbacMiddleware(Permission.PROJECT_PUBLISH), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { projectId, s3Key, platformAccountIds, metadata, scheduledAt } = req.body;

        if (!projectId || !s3Key || !platformAccountIds || !platformAccountIds.length || !scheduledAt) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const result = await socialSyndicationService.scheduleVideo(
            projectId,
            s3Key,
            platformAccountIds,
            metadata,
            new Date(scheduledAt),
            req.body.hookInfo
        );

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Syndication] Schedule error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/syndication/best-time - Get AI optimized posting time
router.get('/best-time', async (req: AuthRequest, res: Response) => {
    try {
        const platform = req.query.platform as string || 'youtube';
        const time = await socialSyndicationService.getBestPostingTime(platform);
        res.json({ success: true, data: time });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/syndication/schedule/:recordId - Cancel a scheduled post
router.delete('/schedule/:recordId', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { recordId } = req.params;
        const record = await SyndicationRecord.findOne({ _id: recordId, userId: req.user!.userId, status: 'scheduled' });
        if (!record) return res.status(404).json({ success: false, error: 'Scheduled record not found' });

        await SyndicationRecord.findByIdAndDelete(recordId);
        res.json({ success: true, message: 'Scheduled post cancelled' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/syndication/generate-hooks - Generate 3 viral hook variations
router.post('/generate-hooks', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, context } = req.body;
        if (!context) return res.status(400).json({ success: false, error: 'Context is required' });
        
        const hooks = await socialSyndicationService.generateHookVariations(projectId, context);
        res.json({ success: true, data: hooks });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/syndication/projects/:projectId/hook-stats - Get A/B test results
router.get('/projects/:projectId/hook-stats', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const stats = await socialSyndicationService.getHookComparisonStats(projectId);
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
