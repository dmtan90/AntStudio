import { Router } from 'express';
import path from 'path';
import { UserPlatformAccount, SocialPlatform } from '../models/UserPlatformAccount.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { connectDB } from '../utils/db.js';
import { PlatformAuthService } from '../services/PlatformAuthService.js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../utils/s3.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../utils/config.js';
// Configure Multer for temp storage (Disk is better for large videos than memory)
import multer from 'multer';
import os from 'os';
import fs from 'fs';

const router = Router();

// Define the file filter function to update the filename encoding
const fileFilter = (req: AuthRequest, file: any, callback: any) => {
    // Re-encode from latin1 (Multer's default behavior in older versions) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    callback(null, true); // Accept the file
};

const upload = multer({
    fileFilter,
    dest: os.tmpdir(), // Save to temp dir
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// Public OAuth callback routes (must be before authMiddleware if they don't carry token, 
// but usually we need state to link to user. For simplicity, we might assume the state carries the token 
// or the user re-authenticates. 
// However, a better pattern for SPA is:
// 1. Frontend calls GET /auth/:platform -> gets URL
// 2. Frontend redirects
// 3. Platform redirects back to Frontend /callback?code=...
// 4. Frontend calls POST /api/platforms/callback/:platform { code } -> Backend exchanges token & saves
// We will use this pattern as it keeps backend stateless regarding auth redirects.
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
 * GET /api/platforms/auth/:platform
 * Get OAuth Authorization URL
 */
router.get('/auth/:platform', async (req: AuthRequest, res) => {
    try {
        const { platform } = req.params;
        const url = await PlatformAuthService.getAuthUrl(platform as SocialPlatform);
        res.json({ success: true, data: { url } });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/platforms/callback/:platform
 * Exchange auth code for tokens and save account
 */
router.post('/callback/:platform', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { platform } = req.params;
        const { code } = req.body;

        if (!code) throw new Error('Authorization code required');

        // 1. Exchange code for tokens
        const tokens = await PlatformAuthService.exchangeCode(platform as SocialPlatform, code);
        console.log(`[OAuth Callback] Received tokens for ${platform}:`, {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresIn: tokens.expires_in
        });

        // 2. Get User Profile info (name, id, avatar, email)
        const profile = await PlatformAuthService.getUserProfile(platform as SocialPlatform, tokens.access_token);
        console.log(`[OAuth Callback] Profile loaded: ${profile.name} (${profile.id}) email: ${profile.email}`);

        // 3. Upsert Account
        const account = await UserPlatformAccount.findOneAndUpdate(
            {
                userId: req.user?.userId,
                platform: platform,
                accountId: profile.id
            },
            {
                $set: {
                    accountName: profile.name,
                    avatarUrl: profile.avatar,
                    credentials: {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
                        scope: tokens.scope,
                        email: profile.email
                    },
                    status: 'connected',
                    isActive: true,
                    lastSyncedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        console.log(`[OAuth Callback] Account persisted: ${account.accountName}, ID: ${account._id}`);
        res.json({ success: true, data: account });

    } catch (error: any) {
        console.error('[OAuth Callback] Error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
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

        // Special handling for Ant Media Server to verify credentials
        if (platform === SocialPlatform.ANT_MEDIA) {
            console.log('Verifying Ant Media Server credentials', credentials.serverUrl, credentials.email, credentials.password);
            const isValid = await PlatformAuthService.verifyAMS(credentials.serverUrl, credentials.email, credentials.password);
            if (!isValid) {
                console.log('Invalid Ant Media Server credentials');
                return res.status(401).json({ success: false, error: 'Invalid Ant Media Server credentials' });
            }
        }

        // and satisfy the unique index { userId: 1, platform: 1, accountId: 1 }
        const { randomUUID } = await import('crypto');

        const account = await UserPlatformAccount.create({
            userId: req.user?.userId,
            platform,
            accountName,
            accountId: randomUUID(), // Generate unique ID
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
        const { isActive, accountName, streamKey, credentials, platform } = req.body;

        // Find existing account first
        const existingAccount = await UserPlatformAccount.findOne({ _id: req.params.id, userId: req.user?.userId });
        if (!existingAccount) {
            return res.status(404).json({ success: false, data: null, error: 'Platform account not found' });
        }

        // If AMS and password/credentials changed, verify again
        if (existingAccount.platform === SocialPlatform.ANT_MEDIA && credentials) {
            // Only verify if password is provided (meaning it changed)
            if (credentials.password && credentials.password.length > 0) {
                console.log('Verifying Ant Media Server credentials on update', credentials.serverUrl, credentials.email);

                // If password isn't hashed, rely on verifyAMS to hash it if we were passing raw, but here we invoke verifyAMS which expects raw.
                // NOTE: verifyAMS internally hashes now. 
                const isValid = await PlatformAuthService.verifyAMS(
                    credentials.serverUrl || existingAccount.credentials.serverUrl,
                    credentials.email || existingAccount.credentials.email,
                    credentials.password
                );

                if (!isValid) {
                    return res.status(401).json({ success: false, error: 'Invalid Ant Media Server credentials' });
                }

                // Now we need to manually hash the password for storage because verifyAMS doesn't return the hash, it just returns bool.
                // And we want to store the hash.
                // Actually, verifyAMS logic was: const hashedPassword = crypto.createHash('md5').update(pass).digest('hex');
                // So we should do the same here before saving.
                // Wait, PlatformAuthService.verifyAMS takes raw.
                // We should probably export a hash helper or just duplicate the hash one-liner.

                // Reuse service for consistency would be better but let's just use crypto here or update service to return hash.
                // For now, let's assume getVideos uses the stored pwd.

                // Let's rely on the fact that we verified it. Now we need to hash it for storage.
                // Importing crypto to hash before save
                const crypto = await import('crypto');
                credentials.password = crypto.default.createHash('md5').update(credentials.password).digest('hex');
            } else {
                // If password is empty string/undefined in update payload, keep old password
                delete credentials.password;
                // We might want to merge other fields
                credentials.password = existingAccount.credentials.password;
            }
        }

        // Merge credentials
        const updatedCredentials = { ...existingAccount.credentials, ...credentials };

        const account = await UserPlatformAccount.findOneAndUpdate(
            { _id: req.params.id, userId: req.user?.userId },
            { $set: { isActive, accountName, streamKey, credentials: updatedCredentials } },
            { new: true }
        );

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

/**
 * GET /api/platforms/:id/videos
 * Proxy to fetch videos from the platform
 */
router.get('/:id/videos', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await UserPlatformAccount.findOne({
            _id: req.params.id,
            userId: req.user?.userId
        });

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        console.log(`[API] Loading videos for account: ${account.accountName} (${account.platform}), ID: ${account._id}`);

        const { page, limit, search, sort } = req.query;

        const options = {
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 12,
            search: search as string,
            sort: sort as string
        };

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            const result = await PlatformAuthService.getVideos(account.platform, credentials, options);
            res.json({ success: true, data: result });
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.log(`[API] 401 error for ${account.platform} (${account.accountName}), forcing token refresh...`);
                try {
                    // Reload account from database to get the latest credentials
                    const freshAccount = await UserPlatformAccount.findOne({
                        _id: req.params.id,
                        userId: req.user?.userId
                    });

                    if (!freshAccount) {
                        return res.status(404).json({ success: false, error: 'Account not found' });
                    }

                    console.log(`[API] Reloaded account from DB: ${freshAccount.accountName}`);
                    const credentials = await PlatformAuthService.getValidCredentials(freshAccount, true);
                    const result = await PlatformAuthService.getVideos(freshAccount.platform, credentials, options);
                    res.json({ success: true, data: result });
                } catch (retryError: any) {
                    console.error(`[API] Retry failed for ${account.platform}:`, retryError.message);
                    throw retryError;
                }
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        console.error('Proxy Error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * GET /api/platforms/:id/videos/:videoId/comments
 * Get comments for a video
 */
router.get('/:id/videos/:videoId/comments', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { id, videoId } = req.params;
        const account = await UserPlatformAccount.findOne({
            _id: id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            const comments = await PlatformAuthService.getComments(account.platform, credentials, videoId);
            res.json({ success: true, data: comments });
        } catch (error: any) {
            if (error.response?.status === 401) {
                const credentials = await PlatformAuthService.getValidCredentials(account, true);
                const comments = await PlatformAuthService.getComments(account.platform, credentials, videoId);
                res.json({ success: true, data: comments });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * GET /api/platforms/:id/stats
 * Get Channel Statistics
 */
router.get('/:id/stats', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await UserPlatformAccount.findOne({
            _id: req.params.id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            const stats = await PlatformAuthService.getStats(account.platform, credentials);
            res.json({ success: true, data: stats });
        } catch (error: any) {
            if (error.response?.status === 401) {
                const credentials = await PlatformAuthService.getValidCredentials(account, true);
                const stats = await PlatformAuthService.getStats(account.platform, credentials);
                res.json({ success: true, data: stats });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * DELETE /api/platforms/:id/videos/:videoId
 * Delete a video from the platform
 */
router.delete('/:id/videos/:videoId', async (req: AuthRequest, res) => {
    try {
        const { id, videoId } = req.params;
        await connectDB();
        const account = await UserPlatformAccount.findOne({
            _id: id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            await PlatformAuthService.deleteVideo(account.platform, credentials, videoId);
            res.json({ success: true, data: { message: 'Video deleted' } });
        } catch (error: any) {
            if (error.response?.status === 401) {
                const credentials = await PlatformAuthService.getValidCredentials(account, true);
                await PlatformAuthService.deleteVideo(account.platform, credentials, videoId);
                res.json({ success: true, data: { message: 'Video deleted' } });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * POST /api/platforms/:id/videos/upload
 * Upload a video to the platform
 * Supports multipart/form-data (file) or JSON (s3Key/url for warehouse)
 */
router.post('/:id/videos/upload', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { title, description, s3Key } = req.body; // s3Key if coming from warehouse

        const account = await UserPlatformAccount.findOne({
            _id: id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        let videoStream: any;
        let cleanup = () => { };

        if (req.file) {
            // File upload
            videoStream = fs.createReadStream(req.file.path);
            cleanup = () => fs.unlinkSync(req.file!.path); // Delete temp file after
        } else if (s3Key) {
            // Warehouse upload (stream from S3)
            try {
                if (s3Key) {
                    const client = getS3Client();
                    const command = new GetObjectCommand({
                        Bucket: config.awsS3Bucket,
                        Key: decodeURIComponent(s3Key)
                    });
                    const response = await client.send(command).catch(err => {
                        console.error('S3 GetObject failed directly, will try signed URL fallback if possible');
                        return null;
                    });
                    if (response?.Body) {
                        videoStream = response.Body;
                    }
                }

                if (!videoStream) {
                    const axios = (await import('axios')).default;
                    const { getSignedS3Url } = await import('../utils/s3.js');
                    const videoUrl = s3Key ? await getSignedS3Url(s3Key) : null;
                    
                    if (!videoUrl) throw new Error('No valid video URL or S3 key provided');
                    
                    const videoRes = await axios.get(videoUrl, { responseType: 'stream' });
                    videoStream = videoRes.data;
                }
            } catch (err: any) {
                console.error('Failed to resolve video stream from warehouse:', err);
                return res.status(400).json({ success: false, error: 'Failed to retrieve video source' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'No video source provided' });
        }

        const metadata = { title: title || 'Uploaded Video', description };
        const filename = req.file ? req.file.originalname : (s3Key ? path.basename(decodeURIComponent(s3Key)) : `video_${Date.now()}.mp4`);
        const contentType = req.file ? req.file.mimetype : (s3Key ? (s3Key.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime') : 'video/mp4');

        try {
            console.log("Uploading video to platform...", account.platform, metadata, filename, contentType);
            const credentials = await PlatformAuthService.getValidCredentials(account);
            const result = await PlatformAuthService.uploadVideo(account.platform, credentials, videoStream, metadata, filename, contentType);
            cleanup();
            if (result.success) {
                res.json({ success: true, data: result.data });
            }
            else {
                res.status(500).json({ success: false, error: result.message });
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                try {
                    const credentials = await PlatformAuthService.getValidCredentials(account, true);
                    if (req.file) {
                        videoStream = fs.createReadStream(req.file.path);
                    }
                    const result = await PlatformAuthService.uploadVideo(account.platform, credentials, videoStream, metadata, filename, contentType);
                    cleanup();
                    if (result.success) {
                        res.json({ success: true, data: result.data });
                    }
                    else {
                        res.status(500).json({ success: false, error: result.message });
                    }
                } catch (retryError) {
                    cleanup();
                    throw retryError;
                }
            } else {
                cleanup();
                throw error;
            }
        }
    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * PATCH /api/platforms/:id/live-info
 * Update Live Stream Metadata (Title, Description)
 */
router.patch('/:id/live-info', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await UserPlatformAccount.findOne({
            _id: req.params.id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        const { title, description } = req.body;

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            await PlatformAuthService.updateLiveStreamMetadata(account.platform, credentials, {
                title,
                description
            });

            res.json({ success: true, message: 'Live stream metadata updated' });
        } catch (error: any) {
            if (error.response?.status === 401) {
                const credentials = await PlatformAuthService.getValidCredentials(account, true);
                await PlatformAuthService.updateLiveStreamMetadata(account.platform, credentials, {
                    title,
                    description
                });
                res.json({ success: true, message: 'Live stream metadata updated' });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        console.error('Live Metadata Update Error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * GET /api/platforms/:id/live-info
 * Create or Fetch Live Stream Info (RTMP URL, Stream Key)
 */
router.get('/:id/live-info', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const account = await UserPlatformAccount.findOne({
            _id: req.params.id,
            userId: req.user?.userId
        });

        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

        const { title, description } = req.query;

        try {
            const credentials = await PlatformAuthService.getValidCredentials(account);
            const liveInfo = await PlatformAuthService.getLiveStreamInfo(account.platform, credentials, {
                title: title as string,
                description: description as string
            });

            // Update account with the latest stream info
            account.rtmpUrl = liveInfo.rtmpUrl;
            account.streamKey = liveInfo.streamKey;
            await account.save();

            res.json({ success: true, data: liveInfo });
        } catch (error: any) {
            if (error.response?.status === 401) {
                const credentials = await PlatformAuthService.getValidCredentials(account, true);
                const liveInfo = await PlatformAuthService.getLiveStreamInfo(account.platform, credentials, {
                    title: title as string,
                    description: description as string
                });

                account.rtmpUrl = liveInfo.rtmpUrl;
                account.streamKey = liveInfo.streamKey;
                await account.save();

                res.json({ success: true, data: liveInfo });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        console.error('Live Info Error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ success: false, error: error.message, requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

export default router;
