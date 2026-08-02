import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Logger } from '../utils/Logger.js';
import { configService } from '../utils/ConfigService.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';
import axios from 'axios';

const router = Router();

// GET /api/s3/* - Proxy files with authentication based on active storage provider
router.get('/*', async (req: AuthRequest, res: Response) => {
    try {
        const key = req.params[0];
        if (!key) return res.status(400).json({ success: false, data: null, error: 'File key is required' });

        const decodedKey = decodeURIComponent(key);
        // const activeProvider = configService.storage.activeProvider;
        const adapter = await StorageFactory.getActiveAdapter();
        const url = await adapter.getFileUrl(decodedKey);

        const response = await axios.get(url, { responseType: 'stream' }).catch(err => {
            Logger.error(`Storage proxy fetch error from active provider for key ${decodedKey}:`, err.message);
            return null;
        });

        if (!response) return res.status(404).json({ success: false, data: null, error: 'File not found' });

        const contentType = response.headers['content-type'];
        const contentLength = response.headers['content-length'];

        if (contentType) res.setHeader('Content-Type', String(contentType));
        if (contentLength) res.setHeader('Content-Length', String(contentLength));
        res.setHeader('Cache-Control', 'public, max-age=3600');

        response.data.pipe(res);
    } catch (error: any) {
        Logger.error('Storage Proxy Error:', error);
        res.status(404).json({ success: false, data: null, error: 'File not found' });
    }
});

// POST /api/s3/presigned-upload - Get a signed URL for direct upload
router.post('/presigned-upload', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, contentType, extension } = req.body;
        if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

        const storage = await StorageFactory.getActiveAdapter();
        const timestamp = Date.now();
        const key = `projects/${projectId}/renders/video_${timestamp}.${extension || 'mp4'}`;

        const uploadUrl = await storage.getUploadUrl(key, contentType || 'video/mp4', 3600);

        res.json({
            success: true,
            data: {
                uploadUrl,
                key,
                expiresIn: 3600
            }
        });
    } catch (error: any) {
        Logger.error('Presigned Upload Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
