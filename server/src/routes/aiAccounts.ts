import { Router } from 'express';
import * as crypto from 'crypto';
import { AIAccount } from '../models/AIAccount.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { aiAccountManager } from '../utils/ai/AIAccountManager.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/ai/accounts
 * List all AI accounts with current status
 */
router.get('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const accounts = await AIAccount.find().sort({ createdAt: -1 });
        res.json({ success: true, data: accounts, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * Helper to get the redirect URI
 */
const getRedirectUri = async (req: any) => {
    // Check for manual override in settings first
    const settings = await AdminSettings.findOne();
    const override = settings?.apiConfigs?.oauth?.google?.redirectUriOverride;

    if (override && override.startsWith('http')) {
        return override;
    }

    const config = (await import('../utils/config.js')).default;
    return `${config.public.baseUrl}/api/admin/ai/accounts/callback`;
};

/**
 * GET /api/admin/ai/accounts/redirect-uri
 * Returns the exact URI expected for Google OAuth configuration
 */
router.get('/redirect-uri', async (req: AuthRequest, res) => {
    res.json({ success: true, data: { redirectUri: await getRedirectUri(req) }, error: null });
});

/**
 * GET /api/admin/ai/accounts/auth-url
 * Get Google OAuth authorization URL (Standard or Antigravity)
 */
router.get('/auth-url', async (req: AuthRequest, res) => {
    try {
        const redirectUri = (req.query.redirectUri as string) || await getRedirectUri(req);
        const isAntigravity = req.query.isAntigravity === 'true';

        Logger.info(`[AIAccount API] Generating Auth URL (Antigravity: ${isAntigravity}) with redirect_uri: ${redirectUri}`);

        // Encode state to pass through OAuth flow
        const stateObj = {
            t: crypto.randomBytes(8).toString('hex'),
            ag: isAntigravity
        };
        const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

        const url = await aiAccountManager.getAuthorizationUrl(redirectUri, { state, isAntigravity });
        res.json({ success: true, data: { url }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/ai/accounts/callback
 * Handles Google OAuth redirect
 */
router.get('/callback', async (req: any, res) => {
    const { code, state } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code is missing');
    }

    try {
        await connectDB();
        const redirectUri = await getRedirectUri(req);

        // Decode state to check for Antigravity flag
        let isAntigravity = false;
        if (state) {
            try {
                const decoded = JSON.parse(Buffer.from(state as string, 'base64').toString('utf8'));
                isAntigravity = !!decoded.ag;
            } catch (e) {
                Logger.warn('[AIAccount API] State decoding failed:', e);
            }
        }

        Logger.info(`[AIAccount API] Callback received (Antigravity: ${isAntigravity}). Exchanging code with redirect_uri: ${redirectUri}`);

        const account = await aiAccountManager.exchangeCodeForTokens(code as string, redirectUri, { isAntigravity });

        // Trigger background discovery of Project ID
        aiAccountManager.discoverProjectId(account).catch(async err => {
            Logger.error(`[AIAccount API] Deferred discovery failed for ${account.email}:`, err.message);
            account.errorMessage = err.message;
            await account.save();
        });

        // Redirect back to frontend admin panel
        const config = (await import('../utils/config.js')).default;
        res.redirect(`${config.public.baseUrl}/admin/ai-accounts?success=true`);
    } catch (error: any) {
        Logger.error('OAuth Callback Error:', error.message);
        // res.status(500).send(`Authentication failed: ${error.message}`);
        // Redirect back to frontend admin panel
        const config = (await import('../utils/config.js')).default;
        res.redirect(`${config.public.baseUrl}/admin/ai-accounts?success=false&message=${error.message}`);
    }
});

/**
 * POST /api/admin/ai/accounts/auth-callback
 * Legacy/Popup flow: Exchange authorization code for tokens and save account
 */
router.post('/auth-callback', async (req: AuthRequest, res) => {
    const { code, redirectUri } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, data: null, error: 'Authorization code is required' });
    }

    try {
        await connectDB();
        const account = await aiAccountManager.exchangeCodeForTokens(code, redirectUri || 'postmessage');

        // Trigger background discovery of Project ID
        aiAccountManager.discoverProjectId(account).catch(err => {
            Logger.error(`[AIAccount API] Deferred discovery failed for ${account.email}:`, err.message);
        });

        res.json({ success: true, data: account, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * POST /api/admin/ai/accounts/:id/sync
 * Manually trigger project and quota synchronization
 */
router.post('/:id/sync', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await AIAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, data: null, error: 'Account not found' });
        }

        await aiAccountManager.discoverProjectId(account);
        await aiAccountManager.syncQuotas(account);

        res.json({ success: true, data: account, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * PATCH /api/admin/ai/accounts/:id
 * Update account settings (projectId, isActive)
 */
router.patch('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { projectId, isActive } = req.body;
        const updateData: any = {};

        if (projectId !== undefined) updateData.projectId = projectId;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await AIAccount.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, data: null, error: 'Account not found' });
        }

        res.json({ success: true, data: updated, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * POST /api/admin/ai/accounts/:id/create-project
 * Create a new Google Cloud Project for the account
 */
router.post('/:id/create-project', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await AIAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, data: null, error: 'Account not found' });
        }

        const projectId = await aiAccountManager.createProject(account);
        res.json({ success: true, data: { projectId }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * DELETE /api/admin/ai/accounts/:id
 * Remove an AI account
 */
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const deleted = await AIAccount.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, data: null, error: 'Account not found' });
        }
        res.json({ success: true, data: { message: 'Account deleted successfully' }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * POST /api/admin/ai/accounts/direct
 * Manually add an account (for 11labs-direct types which bypass OAuth)
 */
router.post('/direct', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { email, licenseKey, accessToken, accountType, providerId } = req.body;
        const finalAccountType = accountType || '11labs-direct';

        if (!email) {
            return res.status(400).json({ success: false, data: null, error: 'Email is required' });
        }

        // Automatic onboarding if it's 11labs-direct and license key is missing
        if (finalAccountType === '11labs-direct' && !licenseKey) {
            const account = await aiAccountManager.onboard11LabsDirectAccount(email);
            return res.json({ success: true, data: account, error: null });
        }

        // Standard manual entry (fallback or for other account types)
        if (!licenseKey && finalAccountType !== '11labs-direct') {
            return res.status(400).json({ success: false, data: null, error: 'License Key is required for this account type' });
        }

        let account = await AIAccount.findOne({ email, accountType: finalAccountType });

        if (account) {
            account.licenseKey = licenseKey || account.licenseKey;
            account.accessToken = accessToken || account.accessToken;
            account.providerId = providerId || account.providerId;
            account.status = 'ready';
            await account.save();
        } else {
            account = await AIAccount.create({
                email,
                licenseKey,
                accessToken,
                accountType: finalAccountType,
                providerId: providerId || '11labs',
                status: 'ready'
            });
        }

        // Initialize unlimited quotas for this type
        await aiAccountManager.syncQuotas(account);

        res.json({ success: true, data: account, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

export default router;
