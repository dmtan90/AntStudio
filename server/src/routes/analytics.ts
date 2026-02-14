import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';
import { Project } from '../models/Project.js';
import { monitoringService } from '../services/monitoringService.js';

const router = Router();

router.use(authMiddleware);

// GET /api/analytics/overview - Overall stats
router.get('/overview', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;

        // Real Project Stats
        const attempts = await Project.find({ userId });
        const totalProjects = attempts.length;
        const publishedProjects = attempts.filter(p => p.status === 'completed').length;

        // Fetch Real Viral Clips from Projects
        const recentClips = attempts.flatMap(p => 
            (p.visualAssets || [])
                .filter(a => a.metadata?.isViralClip)
                .map((a: any) => ({
                    id: a._id,
                    reason: a.description || 'AI Highlight',
                    time: new Date(a.createdAt || Date.now()).toLocaleTimeString(),
                    duration: '0:30', // Placeholder if not stored, but ideally comes from metadata
                    score: a.metadata?.viralScore || 85,
                    thumb: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300', // Placeholder thumb until we have real storage URL
                    url: a.url
                }))
        ).slice(0, 5); // Top 5

        // Mock data for demo ( Views/Likes still mocked as we don't have an event stream yet)
        const stats = {
            totalViews: Math.floor(Math.random() * 50000) + 1000,
            totalLikes: Math.floor(Math.random() * 2000) + 50,
            watchTimeHours: Math.floor(Math.random() * 1000) + 10,
            projects: {
                total: totalProjects,
                published: publishedProjects,
                drafts: totalProjects - publishedProjects
            },
            // Mix of mock activity and real clips
            recentActivity: [
                ...recentClips.map(c => ({ type: 'clip', project: c.reason, time: 'Just now' })),
                { type: 'view', project: 'Project A', time: '2 mins ago' },
                { type: 'like', project: 'Project B', time: '15 mins ago' }
            ],
            recentClips: recentClips
        };

        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/stream-health - Real-time stream metrics
router.get('/stream-health', async (req: AuthRequest, res) => {
    try {
        // Connect to AMS or fetch from monitoring service if applicable
        // For now, return simulated health metrics
        const health = {
            status: 'excellent', // excellent, good, fair, poor
            bitrate: 4500 + Math.floor(Math.random() * 500), // kbps
            fps: 60,
            latency: 1.2, // seconds
            viewers: Math.floor(Math.random() * 100) + 10,
            cpuUsage: (await monitoringService.getRealtimeStats())?.cpuUsage || 15
        };

        res.json({ success: true, data: health });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/audience - Audience demographics (mock)
router.get('/audience', async (req: AuthRequest, res) => {
    try {
        const data = {
            locations: [
                { country: 'USA', percent: 45 },
                { country: 'UK', percent: 15 },
                { country: 'India', percent: 10 },
                { country: 'Germany', percent: 8 },
                { country: 'Other', percent: 22 }
            ],
            devices: [
                { type: 'Mobile', percent: 65 },
                { type: 'Desktop', percent: 30 },
                { type: 'Tablet', percent: 5 }
            ]
        };
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
