import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { socketServer } from '../services/streaming/SocketServer.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { Logger } from '../utils/Logger.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { userCanAccessProject } from '../utils/projectAccess.js';

const router = Router();

// Public widget endpoint: each init spends Gemini/TTS credits, so throttle per IP
const shopperInitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many shopper sessions, please try again later.' }
});

const SHOPPER_SESSION_ID = /^shop_[a-z0-9]{6,32}$/;

/**
 * POST /api/google-agent/action
 * Triggers real-time live studio action from Google Agent via Socket.io
 */
router.post('/action', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { action, projectId, payload } = req.body;
        Logger.info(`[GoogleAgent] Received action: ${action} for project: ${projectId}`);

        if (typeof action !== 'string' || typeof projectId !== 'string' || !/^[a-z0-9_:-]{1,64}$/i.test(action)) {
            return res.status(400).json({ success: false, error: 'Missing or invalid action/projectId' });
        }

        if (!(await userCanAccessProject(req.user!.userId, projectId))) {
            return res.status(403).json({ success: false, error: 'Not authorized for this project' });
        }

        // Find active stream session for the project
        const session = await StreamSessionModel.findOne({ projectId, status: 'live' });
        
        // Target room is either the active session ID, or fallback to the projectId room itself
        const targetRoom = session ? session.sessionId : projectId;

        const io = socketServer.getIO();
        if (io) {
            // Broadcast the specific action event to the live studio room
            io.to(targetRoom).emit(`agent:${action}`, payload);
            Logger.info(`[GoogleAgent] Broadcasted event 'agent:${action}' to room ${targetRoom}`);
            return res.json({ 
                success: true, 
                message: `Action ${action} dispatched successfully to room ${targetRoom}` 
            });
        } else {
            return res.status(500).json({ success: false, error: 'Socket server not initialized' });
        }
    } catch (error: any) {
        Logger.error('[GoogleAgent] Action dispatch failed:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/google-agent/sync-all
 * Mock sync-all for agent store sync
 */
router.post('/sync-all', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.body;
        Logger.info(`[GoogleAgent] Sync all requested for project: ${projectId}`);
        return res.json({ 
            success: true, 
            message: 'Store synchronization successfully completed' 
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/google-agent/shopper/init
 * Initializes localized virtual personal shopper sessions for widgets
 */
router.post('/shopper/init', shopperInitLimiter, async (req: Request, res: Response) => {
    try {
        const { productId, langCode, sessionId } = req.body;
        if (typeof productId !== 'string' || !productId) {
            return res.status(400).json({ success: false, error: 'Missing productId' });
        }
        // Only accept widget-style shopper IDs so a caller can't overwrite a live sales session's context
        const shopperSessionId = typeof sessionId === 'string' && SHOPPER_SESSION_ID.test(sessionId)
            ? sessionId
            : 'shop_' + Math.random().toString(36).substring(2, 12);
        const { liveSalesServiceV3 } = await import('../services/ai/LiveSalesServiceV3.js');
        const sessionInfo = await liveSalesServiceV3.initShopperSession(
            shopperSessionId,
            productId,
            typeof langCode === 'string' ? langCode : 'en'
        );
        return res.json({
            success: true,
            ...sessionInfo
        });
    } catch (error: any) {
        Logger.error('[GoogleAgent] Shopper init failed:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
