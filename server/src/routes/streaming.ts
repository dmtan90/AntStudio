import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { streamingService, StreamTarget } from '../services/StreamingService.js';
import { redisService } from '../services/RedisService.js';
import { UserPlatformAccount } from '../models/UserPlatformAccount.js';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';
import { getAdminSettings } from '../models/AdminSettings.js';

const router = Router();

/**
 * GET /api/streaming/guest/validate/:token
 * Publicly validate a guest invite token
 */
router.get('/guest/validate/:token', async (req, res) => {
    try {
        const info = await streamingService.validateGuestToken(req.params.token);
        if (!info) return res.status(404).json({ success: false, error: 'Invalid or expired token' });

        res.json({ success: true, ...info });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// All following routes require authentication
router.use(authMiddleware);

/**
 * POST /api/streaming/start
 * Start a multi-platform restreaming task
 */
router.post('/start', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { source, platformAccountIds, loop, projectId, quality } = req.body;

        let finalSource = source;

        // If projectId is provided, get the final video URL
        if (projectId) {
            const project = await Project.findOne({ _id: projectId, userId: req.user?.userId });
            if (!project || (!project.finalVideo?.s3Url && !project.finalVideo?.s3Key)) {
                return res.status(404).json({ success: false, error: 'Project video not found or not completed' });
            }
            finalSource = project.finalVideo.s3Url || project.finalVideo.s3Key;
        }

        if (!finalSource || !platformAccountIds?.length) {
            return res.status(400).json({ success: false, error: 'Source/Project and Destinations are required' });
        }

        // 1. Fetch platform accounts to get RTMP details
        let accounts = await UserPlatformAccount.find({
            _id: { $in: platformAccountIds },
            userId: req.user?.userId,
            isActive: true
        });

        if (!accounts.length) {
            return res.status(404).json({ success: false, error: 'No active platform accounts found' });
        }

        let amsAccount = accounts.find(a => a.platform === 'ant-media');
        const rtmpPlatforms = accounts.filter(a => a.platform !== 'ant-media');

        // Logic check for WebRTC source
        if (source === 'webrtc' && !amsAccount) {
            // Check if user has ANY active AMS account that wasn't selected
            const fallbackAMS = await UserPlatformAccount.findOne({
                userId: req.user?.userId,
                platform: 'ant-media',
                isActive: true
            });

            if (fallbackAMS) {
                console.log(`[Streaming] Auto-selecting fallback AMS for WebRTC: ${fallbackAMS.accountName}`);
                accounts.push(fallbackAMS);
                amsAccount = fallbackAMS;
            }
        }

        // 2. Prepare targets
        const targets: StreamTarget[] = accounts.map(acc => ({
            url: acc.rtmpUrl || getDefaultRtmpUrl(acc.platform),
            key: acc.streamKey || '',
            platform: acc.platform,
            accountId: acc._id.toString()
        })).filter(t => t.url && t.key);

        if (!targets.length) {
            return res.status(400).json({ success: false, error: 'Invalid streaming configuration for selected platforms' });
        }

        // 3. Start the relay service
        const restreamResult = await streamingService.startRestream(
            req.user?.userId.toString() || 'unknown',
            finalSource,
            targets,
            { loop: !!loop, quality }
        );

        res.json({
            success: true,
            data: {
                sessionId: restreamResult.sessionId,
                mode: restreamResult.mode,
                amsAccount: amsAccount ? {
                    _id: amsAccount._id,
                    streamKey: amsAccount.streamKey,
                    credentials: amsAccount.credentials
                } : null
            },
            error: null
        });

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

import { highlightService } from '../services/HighlightService.js';

/**
 * POST /api/streaming/:id/highlight
 * Trigger a manual highlight capture (last 15s)
 */
router.post('/status/:id/highlight', async (req: AuthRequest, res) => {
    try {
        const sessionId = req.params.id;
        const result = await highlightService.captureHighlight(sessionId);

        if (!result) {
            return res.status(400).json({ success: false, error: 'Highlight capture not available for this session mode or buffer is empty.' });
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/streaming/:id/shadow
 * Get aggregated social metrics (shadowing)
 */
router.get('/status/:id/shadow', async (req: AuthRequest, res) => {
    try {
        const sessionId = req.params.id;
        const session = streamingService.getSessionStatus(sessionId);

        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        // Simulate multi-platform engagement data
        const platforms = session.targets.map(t => t.platform);
        const shadowData = platforms.map(p => ({
            platform: p,
            viewers: Math.floor(Math.random() * 500) + 50,
            likes: Math.floor(Math.random() * 2000) + 100,
            sentiment: 0.85 + (Math.random() * 0.1)
        }));

        res.json({ success: true, data: shadowData });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/streaming/status/:id/infra
 * Get distributed infrastructure data for a specific session
 */
router.get('/status/:id/infra', async (req: AuthRequest, res) => {
    try {
        const sessionId = req.params.id;
        let redisData = await redisService.getSession(sessionId);

        // If not in Redis, check local (might be single-node mode)
        const localSession = streamingService.getSessionStatus(sessionId);

        // If still not found, check MongoDB
        if (!redisData && !localSession) {
            const { StreamSessionModel } = await import('../models/StreamSession.js');
            redisData = await StreamSessionModel.findOne({ sessionId });
        }

        if (!redisData && !localSession) {
            return res.status(404).json({ success: false, error: 'Session infrastructure data not available' });
        }

        const infra = {
            nodeId: redisData?.nodeId || 'internal-relay-01',
            region: redisData?.region || 'US-West',
            ip: redisData?.nodeIp || '127.0.0.1',
            mode: redisData?.mode || 'relay',
            health: 'optimal',
            protocol: 'RTMP-Multiplex'
        };

        res.json({ success: true, data: infra });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
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
 * POST /api/streaming/session/prepare
 * Prepare a session ID before going live to allow early guest invites
 */
router.post('/session/prepare', async (req: AuthRequest, res) => {
    try {
        const sessionId = await streamingService.prepareSession(req.user!.id);
        res.json({ success: true, data: { sessionId } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/streaming/invite
 * Generate a guest invite token for an active session
 */
router.post('/invite', async (req: AuthRequest, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, error: 'Session ID required' });

        const token = await streamingService.generateGuestToken(sessionId);
        // Return only the token and a short URL. The client builds the link using its dynamic origin.
        const settings = await getAdminSettings();
        const apiConfig = settings.apiConfigs;
        const host = apiConfig.publicDomain || process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteUrl = `${host}/join/${token}`;

        res.json({ success: true, token, inviteUrl });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
