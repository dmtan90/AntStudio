import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
// import { Project } from '../models/Project.js'; // Assuming this model exists

const router = Router();

// Retrieve active collaborators for a project
router.get('/:projectId/users', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        // In a real implementation with persisted sessions, we might query the database or Redis
        // For now, the SocketServer handles the active list in memory via WebSocket
        res.json({ message: 'Use WebSocket for real-time user list' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Post a comment (Persistent storage fallback)
router.post('/comments', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId, text, timestamp } = req.body;
        const userId = (req as any).user.id;

        // In real app: Save comment to database
        const comment = {
            id: Date.now().toString(),
            userId,
            projectId,
            text,
            timestamp,
            createdAt: new Date().toISOString()
        };

        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// Get comments for a project
router.get('/:projectId/comments', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        // Mock data
        const comments = [
            {
                id: '1',
                userId: 'user_1',
                userName: 'Alice',
                text: 'Great transition here!',
                timestamp: 15.5,
                createdAt: new Date(Date.now() - 3600000).toISOString()
            }
        ];
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

export default router;
