import { Router } from 'express';
import { getGoogleAuthUrl, getGoogleAuthClient } from '../utils/google.js';
import { getFacebookAuthUrl, getFacebookUserToken, getFacebookPages } from '../utils/facebook.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import { google } from 'googleapis';
import config from '../utils/config.js';

const router = Router();

// GET /api/social/connect - Get OAuth connection URL
router.get('/connect', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { provider } = req.query;

        if (provider === 'youtube') {
            res.json({ success: true, data: { url: getGoogleAuthUrl(req.user!.userId) } });
        } else if (provider === 'facebook') {
            res.json({ success: true, data: { url: getFacebookAuthUrl(req.user!.userId) } });
        } else {
            res.status(400).json({ success: false, data: null, error: 'Invalid provider' });
        }
    } catch (error: any) {
        console.error('Social connect error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to get connection URL' });
    }
});

// GET /api/social/youtube/callback - YouTube OAuth callback
router.get('/youtube/callback', async (req, res) => {
    try {
        await connectDB();
        const { code, state } = req.query; // state contains userId

        if (!code) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=youtube_failed`);
        }

        const auth = getGoogleAuthClient();
        const { tokens } = await auth.getToken(code as string);
        auth.setCredentials(tokens);

        const youtube = google.youtube({ version: 'v3', auth });
        const channelsResponse = await youtube.channels.list({
            part: ['id', 'snippet'],
            mine: true
        });

        const channel = channelsResponse.data.items?.[0];
        if (!channel) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=youtube_no_channel`);
        }

        const userId = state as string;
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=user_not_found`);
        }

        user.socialAccounts.youtube = {
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || '',
            channelId: channel.id || ''
        };

        await user.save();
        res.redirect(`${config.public.baseUrl}/settings/integrations?success=youtube`);
    } catch (error) {
        console.error('YouTube callback error:', error);
        res.redirect(`${config.public.baseUrl}/settings/integrations?error=youtube_failed`);
    }
});

// GET /api/social/facebook/callback - Facebook OAuth callback
router.get('/facebook/callback', async (req, res) => {
    try {
        await connectDB();
        const { code, state } = req.query; // state contains userId

        if (!code) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=facebook_failed`);
        }

        const userAccessToken = await getFacebookUserToken(code as string);
        const pages = await getFacebookPages(userAccessToken);

        if (!pages || pages.length === 0) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=facebook_no_pages`);
        }

        const page = pages[0]; // Take first page as default
        const userId = state as string;
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${config.public.baseUrl}/settings/integrations?error=user_not_found`);
        }

        user.socialAccounts.facebook = {
            accessToken: page.access_token,
            pageId: page.id
        };

        await user.save();
        res.redirect(`${config.public.baseUrl}/settings/integrations?success=facebook`);
    } catch (error) {
        console.error('Facebook callback error:', error);
        res.redirect(`${config.public.baseUrl}/settings/integrations?error=facebook_failed`);
    }
});

// POST /api/social/disconnect - Disconnect social account
router.post('/disconnect', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { provider } = req.body;

        if (!provider || !['youtube', 'facebook'].includes(provider)) {
            return res.status(400).json({ success: false, data: null, error: 'Invalid provider' });
        }

        const user = await User.findById(req.user!.userId);
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        if (provider === 'youtube') {
            user.socialAccounts.youtube = undefined as any;
        } else if (provider === 'facebook') {
            user.socialAccounts.facebook = undefined as any;
        }

        await user.save();
        res.json({ success: true, data: { message: `${provider} disconnected successfully` } });
    } catch (error) {
        console.error('Social disconnect error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to disconnect account' });
    }
});

export default router;
