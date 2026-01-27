import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { streamingService, StreamTarget } from '../services/StreamingService.js';
import { UserPlatformAccount } from '../models/UserPlatformAccount.js';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/streaming/start
 * Start a multi-platform restreaming task
 */
router.post('/start', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { source, platformAccountIds, loop, projectId } = req.body;

        let finalSource = source;

        // If projectId is provided, get the final video URL
        if (projectId) {
            const project = await Project.findOne({ _id: projectId, userId: req.user?.userId });
            if (!project || !project.finalVideo?.s3Url) {
                return res.status(404).json({ success: false, error: 'Project video not found or not completed' });
            }
            finalSource = project.finalVideo.s3Url;
        }

        if (!finalSource || !platformAccountIds?.length) {
            return res.status(400).json({ success: false, error: 'Source/Project and Destinations are required' });
        }

        // 1. Fetch platform accounts to get RTMP details
        const accounts = await UserPlatformAccount.find({
            _id: { $in: platformAccountIds },
            userId: req.user?.userId,
            isActive: true
        });

        if (!accounts.length) {
            return res.status(404).json({ success: false, error: 'No active platform accounts found' });
        }

        // 2. Prepare targets
        const targets: StreamTarget[] = accounts.map(acc => ({
            url: acc.rtmpUrl || getDefaultRtmpUrl(acc.platform),
            key: acc.streamKey || '',
            platform: acc.platform
        })).filter(t => t.url && t.key);

        if (!targets.length) {
            return res.status(400).json({ success: false, error: 'Invalid streaming configuration for selected platforms' });
        }

        // 3. Start the relay service
        const sessionId = await streamingService.startRestream(
            req.user?.userId.toString() || 'unknown',
            finalSource,
            targets,
            { loop: !!loop }
        );

        res.json({ success: true, data: { sessionId }, error: null });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/streaming/stop
 */
router.post('/stop', async (req: AuthRequest, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, error: 'Session ID required' });

        streamingService.stopRestream(sessionId);
        res.json({ success: true, data: { status: 'stopped' }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/streaming/status/:id
 */
router.get('/status/:id', (req: AuthRequest, res) => {
    const session = streamingService.getSessionStatus(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    // Safety check: ensure user owns this session
    if (session.userId !== req.user?.userId.toString()) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    res.json({ success: true, data: { status: session.status, startTime: session.startTime } });
});

// Helper for default RTMP urls if not provided
function getDefaultRtmpUrl(platform: string): string {
    switch (platform) {
        case 'youtube': return 'rtmp://a.rtmp.youtube.com/live2';
        case 'facebook': return 'rtmps://live-api-s.facebook.com:443/rtmp/';
        case 'tiktok': return 'rtmps://open-api.tiktok.com/live/stream/';
        default: return '';
    }
}

/**
 * POST /api/streaming/invite
 * Generate a guest invite token for an active session
 */
router.post('/invite', async (req: AuthRequest, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, error: 'Session ID required' });

        const token = streamingService.generateGuestToken(sessionId);
        const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/live/join?token=${token}`;

        res.json({ success: true, data: { token, inviteUrl } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/streaming/guest/validate/:token
 * Publicly validate a guest invite token
 */
router.get('/guest/validate/:token', async (req, res) => {
    try {
        const info = streamingService.validateGuestToken(req.params.token);
        if (!info) return res.status(404).json({ success: false, error: 'Invalid or expired token' });

        res.json({ success: true, data: info });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
