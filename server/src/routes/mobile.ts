import { Router } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

// In-memory session store for pairing (Production should use Redis)
const pairingSessions = new Map<string, { userId: string, expires: number }>();

/**
 * MOBILE PAIRING ENDPOINTS
 */

// POST /api/mobile/pairing/generate - Studio requests a pairing token
router.post('/pairing/generate', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const token = `ant_mob_${crypto.randomBytes(16).toString('hex')}`;
        const expires = Date.now() + (10 * 60 * 1000); // 10 minutes

        pairingSessions.set(token, {
            userId: req.user!.userId,
            expires
        });

        res.json({
            success: true,
            data: {
                token,
                pairingUrl: `${process.env.PUBLIC_BASE_URL}/mobile/ingest?token=${token}`
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/mobile/pairing/verify - Mobile device verifies token
router.get('/pairing/verify', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const session = pairingSessions.get(token as string);

        if (!session || session.expires < Date.now()) {
            return res.status(401).json({ error: 'Invalid or expired pairing token' });
        }

        res.json({
            success: true,
            data: {
                authorized: true,
                targetUserId: session.userId
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * REMOTE COMMAND CHANNEL (WIP)
 */
router.post('/command', authMiddleware, async (req: AuthRequest, res) => {
    const { action, payload } = req.body;
    Logger.info(`[MobileBridge] Dispatching remote command: ${action} to user mobile devices`);
    // Logic to emit via Socket.io to the specific mobile session
    res.json({ success: true, message: 'Command queued' });
});

export default router;
