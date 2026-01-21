import { Router } from 'express';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/videos/list - List user's exported videos
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 12;
        const projectId = req.query.projectId as string;

        const filter: any = {
            userId: req.user!.userId,
            'finalVideo.s3Key': { $exists: true }
        };

        if (projectId) {
            filter._id = projectId;
        }

        const total = await Project.countDocuments(filter);
        const projects = await Project.find(filter)
            .sort({ 'finalVideo.generatedAt': -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('title finalVideo createdAt')
            .lean();

        const videos = projects.map(project => ({
            _id: project._id,
            projectTitle: project.title,
            s3Key: project.finalVideo?.s3Key,
            s3Url: project.finalVideo?.s3Url,
            reviewKey: project.finalVideo?.reviewKey,
            reviewUrl: project.finalVideo?.reviewUrl,
            duration: project.finalVideo?.duration,
            resolution: project.finalVideo?.resolution,
            fileSize: project.finalVideo?.fileSize,
            generatedAt: project.finalVideo?.generatedAt,
            createdAt: project.createdAt
        }));

        res.json({
            success: true,
            data: {
                videos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('Fetch videos error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to fetch videos' });
    }
});

export default router;
