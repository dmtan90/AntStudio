import { Router } from 'express';
import { UserPlatformAccount, SocialPlatform } from '../models/UserPlatformAccount.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/platforms
 * List all platform accounts for the current user
 */
router.get('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const accounts = await UserPlatformAccount.find({ userId: req.user?.userId })
            .select('-credentials.password -credentials.refreshToken') // Hide sensitive fields
            .sort({ createdAt: -1 });

        res.json({ success: true, data: accounts, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * POST /api/platforms
 * Manually connect a platform (AMS or custom RTMP)
 */
router.post('/', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { platform, accountName, credentials, streamKey, rtmpUrl } = req.body;

        if (!Object.values(SocialPlatform).includes(platform)) {
            return res.status(400).json({ success: false, data: null, error: 'Invalid platform type' });
        }

        const account = await UserPlatformAccount.create({
            userId: req.user?.userId,
            platform,
            accountName,
            credentials,
            streamKey,
            rtmpUrl,
            status: 'connected'
        });

        res.status(201).json({ success: true, data: account, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * PATCH /api/platforms/:id
 * Update platform account settings
 */
router.patch('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { isActive, accountName, streamKey, credentials } = req.body;

        const account = await UserPlatformAccount.findOneAndUpdate(
            { _id: req.params.id, userId: req.user?.userId },
            { $set: { isActive, accountName, streamKey, credentials } },
            { new: true }
        );

        if (!account) {
            return res.status(404).json({ success: false, data: null, error: 'Platform account not found' });
        }

        res.json({ success: true, data: account, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * DELETE /api/platforms/:id
 * Disconnect/Remove a platform account
 */
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const deleted = await UserPlatformAccount.findOneAndDelete({
            _id: req.params.id,
            userId: req.user?.userId
        });

        if (!deleted) {
            return res.status(404).json({ success: false, data: null, error: 'Platform account not found' });
        }

        res.json({ success: true, data: { message: 'Platform disconnected' }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

export default router;
