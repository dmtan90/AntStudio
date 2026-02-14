import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';

const router = Router();

// Retrieve active collaborators for a project
router.get('/:projectId/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        
        await connectDB();
        
        // Get project to verify access
        const project = await Project.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        // Check if user has access to this project
        const userId = req.user!.userId;
        if (project.userId.toString() !== userId && !project.collaborators?.some((c: any) => c.userId.toString() === userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        // Get all users who have commented on this project
        const commentUserIds = await Comment.distinct('userId', { projectId });
        const collaboratorIds = (project.collaborators || []).map(c => c.userId);
        const collaborators = await User.find({ 
            _id: { $in: [...collaboratorIds, project.userId] } 
        }).select('_id name email avatar');
        
        res.json({ 
            success: true,
            data: {
                collaborators: collaborators.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar
                })),
                activeCommenters: commentUserIds.length
            }
        });
    } catch (error: any) {
        console.error('Failed to get collaborators:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to get users' });
    }
});

// Post a comment (Persistent storage)
router.post('/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, content, timestamp } = req.body;
        const userId = req.user!.userId;

        if (!content || timestamp === undefined) {
            return res.status(400).json({ success: false, error: 'Content and timestamp are required' });
        }

        await connectDB();
        
        // Verify project exists and user has access
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Create comment
        const comment = await Comment.create({
            projectId,
            userId,
            userName: user.name,
            content,
            timestamp
        });

        res.json({
            success: true,
            data: {
                id: comment._id,
                userId: comment.userId,
                userName: comment.userName,
                content: comment.content,
                timestamp: comment.timestamp,
                createdAt: comment.createdAt
            }
        });
    } catch (error: any) {
        console.error('Failed to post comment:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to post comment' });
    }
});

// Get comments for a project
router.get('/:projectId/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        await connectDB();
        
        // Verify project exists and user has access
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const userId = req.user!.userId;
        if (project.userId.toString() !== userId && !project.collaborators?.some((c: any) => c.userId.toString() === userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Get comments with pagination
        const comments = await Comment.find({ projectId })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));
        
        const total = await Comment.countDocuments({ projectId });

        res.json({
            success: true,
            data: comments.map(c => ({
                id: c._id,
                userId: c.userId,
                userName: c.userName,
                content: c.content,
                timestamp: c.timestamp,
                createdAt: c.createdAt
            })),
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: total > Number(offset) + Number(limit)
            }
        });
    } catch (error: any) {
        console.error('Failed to get comments:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to get comments' });
    }
});

// Delete a comment
router.delete('/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = req.user!.userId;
        
        await connectDB();
        
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        
        // Only comment owner or project owner can delete
        const project = await Project.findById(comment.projectId);
        if (comment.userId.toString() !== userId && project?.userId.toString() !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        await Comment.findByIdAndDelete(commentId);
        
        res.json({ success: true, message: 'Comment deleted' });
    } catch (error: any) {
        console.error('Failed to delete comment:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete comment' });
    }
});

export default router;
