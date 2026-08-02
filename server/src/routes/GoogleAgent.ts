import { Router, Request, Response } from 'express';
import { socketServer } from '../services/streaming/SocketServer.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { Logger } from '../utils/Logger.js';

const router = Router();

/**
 * POST /api/google-agent/action
 * Triggers real-time live studio action from Google Agent via Socket.io
 */
router.post('/action', async (req: Request, res: Response) => {
    try {
        const { action, projectId, payload } = req.body;
        Logger.info(`[GoogleAgent] Received action: ${action} for project: ${projectId}`);

        if (!action || !projectId) {
            return res.status(400).json({ success: false, error: 'Missing action or projectId' });
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
router.post('/sync-all', async (req: Request, res: Response) => {
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
router.post('/shopper/init', async (req: Request, res: Response) => {
    try {
        const { productId, langCode, sessionId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, error: 'Missing productId' });
        }
        const { liveSalesServiceV3 } = await import('../services/ai/LiveSalesServiceV3.js');
        const sessionInfo = await liveSalesServiceV3.initShopperSession(
            sessionId || 'shop_' + Math.random().toString(36).substring(2, 12),
            productId,
            langCode || 'en'
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
