import { Router } from 'express';
import { Comment } from '../models/Comment.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

const router = Router();
router.use(authMiddleware);

// GET /api/comments?projectId=xxx&segmentId=xxx&resolved=false
router.get('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { projectId, segmentId, resolved } = req.query;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        const filter: any = { projectId };
        if (segmentId) filter.segmentId = segmentId;
        if (resolved !== undefined) filter.resolved = resolved === 'true';

        const comments = await Comment.find(filter)
            .populate('author', 'name email avatar')
            .populate('replies.author', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: { comments } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/comments
router.post('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { projectId, segmentId, timestamp, content } = req.body;

        if (!projectId || !content) {
            return res.status(400).json({ success: false, error: 'projectId and content are required' });
        }

        const comment = await Comment.create({
            projectId,
            segmentId,
            timestamp,
            author: req.user!.userId,
            content
        });

        await comment.populate('author', 'name email avatar');

        res.json({ success: true, data: { comment } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/comments/:id/reply
router.post('/:id/reply', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'content is required' });
        }

        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    replies: {
                        author: req.user!.userId,
                        content,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        ).populate('author', 'name email avatar')
            .populate('replies.author', 'name email avatar');

        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }

        res.json({ success: true, data: { comment } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PATCH /api/comments/:id/resolve
router.patch('/:id/resolve', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { resolved } = req.body;

        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { resolved: resolved !== undefined ? resolved : true },
            { new: true }
        ).populate('author', 'name email avatar')
            .populate('replies.author', 'name email avatar');

        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }

        res.json({ success: true, data: { comment } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/comments/:id
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }

        // Only author can delete
        if (comment.author.toString() !== req.user!.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        await comment.deleteOne();
        res.json({ success: true, message: 'Comment deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
