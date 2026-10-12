import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Logger } from '../utils/Logger.js';
import { configService } from '../utils/ConfigService.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';
import axios from 'axios';
import path from 'path';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter.js';
import { authorizeStorageRequest, normalizeStorageKey } from '../utils/storageAccess.js';
import { userCanAccessProject } from '../utils/projectAccess.js';

const router = Router();

// GET /api/s3/* - Proxy stored files from the active storage provider.
// Access is checked per key prefix (see utils/storageAccess.ts); the auth cookie set at login
// lets <img>/<video> tags authenticate without headers.
router.get('/*', async (req: AuthRequest, res: Response) => {
    try {
        const rawKey = req.params[0];
        if (!rawKey) return res.status(400).json({ success: false, data: null, error: 'File key is required' });

        const decodedKey = normalizeStorageKey(rawKey);
        if (!decodedKey) return res.status(400).json({ success: false, data: null, error: 'Invalid file key' });

        const { status, decision } = await authorizeStorageRequest(req, decodedKey, 'api/s3');
        if (status) {
            return res.status(status).json({ success: false, data: null, error: status === 401 ? 'Sign in to access this file' : 'You do not have access to this file' });
        }
        // Private files must not be stored by shared caches (CDNs/proxies)
        const cacheControl = !decision || decision.isPublic ? 'public, max-age=3600' : 'private, max-age=3600';

        const adapter = await StorageFactory.getActiveAdapter();

        // Local storage: stream from disk instead of making an HTTP request back to our own /uploads
        if (adapter instanceof LocalStorageAdapter) {
            const stream = await adapter.getFileStream(decodedKey).catch(() => null);
            if (!stream) return res.status(404).json({ success: false, data: null, error: 'File not found' });
            res.type(path.extname(decodedKey) || 'application/octet-stream');
            res.setHeader('Cache-Control', cacheControl);
            stream.on('error', () => res.destroy());
            return stream.pipe(res);
        }

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
        res.setHeader('Cache-Control', cacheControl);

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
        if (typeof projectId !== 'string' || !projectId) return res.status(400).json({ success: false, error: 'projectId is required' });
        // Only people with access to the project may write into its storage folder
        if (!(await userCanAccessProject(req.user!.userId, projectId))) {
            return res.status(403).json({ success: false, error: 'You do not have access to this project' });
        }

        const storage = await StorageFactory.getActiveAdapter();
        const timestamp = Date.now();
        // Client-supplied extension is part of the key: allow only a plain alphanumeric extension
        const safeExtension = typeof extension === 'string' && /^[a-z0-9]{1,8}$/i.test(extension) ? extension : 'mp4';
        const key = `projects/${projectId}/renders/video_${timestamp}.${safeExtension}`;

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
