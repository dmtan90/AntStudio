import { Router } from 'express';
import * as crypto from 'crypto';
import { aiAccountManager } from '../utils/ai/AIAccountManager.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/ai/auth/:platform
 * Get OAuth authorization URL for AI account integration
 * Supports: google
 */
router.get('/:platform', async (req: AuthRequest, res) => {
    try {
        const { platform } = req.params;
        const { redirectUri } = req.query;

        if (platform !== 'google') {
            return res.status(400).json({ success: false, error: 'Unsupported platform. Only "google" is supported.' });
        }

        if (!redirectUri) {
            return res.status(400).json({ success: false, error: 'redirectUri query parameter is required' });
        }

        Logger.info(`[AI Auth] Generating ${platform} OAuth URL with redirect_uri: ${redirectUri}`);

        // Generate state token
        const stateObj = {
            t: crypto.randomBytes(8).toString('hex'),
            type: 'ai-account'
        };
        const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

        const url = await aiAccountManager.getAuthorizationUrl(redirectUri as string, { state });

        res.json({ success: true, url, data: { url } });
    } catch (error: any) {
        Logger.error('[AI Auth] Error generating auth URL:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/ai/auth/:platform/callback
 * Handle OAuth callback for AI account integration
 */
router.post('/:platform/callback', async (req: AuthRequest, res) => {
    try {
        const { platform } = req.params;
        const { code, state, redirectUri } = req.body;

        if (platform !== 'google') {
            return res.status(400).json({ success: false, error: 'Unsupported platform' });
        }

        if (!code) {
            return res.status(400).json({ success: false, error: 'Authorization code is required' });
        }

        Logger.info(`[AI Auth] Processing ${platform} callback`);

        // Exchange code for tokens
        const account = await aiAccountManager.exchangeCodeForTokens(code, redirectUri || 'postmessage');

        // Trigger background discovery
        aiAccountManager.discoverProjectId(account).catch(err => {
            Logger.error(`[AI Auth] Deferred discovery failed for ${account.email}:`, err.message);
        });

        res.json({ success: true, data: account });
    } catch (error: any) {
        Logger.error('[AI Auth] Callback error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
