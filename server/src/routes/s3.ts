import { Router, Response } from 'express';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../utils/s3.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../utils/config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/s3/* - Proxy S3 files with authentication
router.get('/*', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const key = req.params[0];
        if (!key) return res.status(400).json({ success: false, data: null, error: 'File key is required' });

        const client = getS3Client();
        const command = new GetObjectCommand({
            Bucket: config.awsS3Bucket,
            Key: decodeURIComponent(key)
        });

        const response = await client.send(command).catch(err => {
            console.error('S3 Client error:', err);
            return null;
        });

        if (!response) return res.status(404).json({ success: false, data: null, error: 'File not found' });

        if (response.ContentType) res.setHeader('Content-Type', response.ContentType);
        if (response.ContentLength) res.setHeader('Content-Length', response.ContentLength.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');

        if (response.Body) {
            // @ts-ignore
            response.Body.pipe(res);
        } else {
            res.status(404).json({ success: false, data: null, error: 'File not found' });
        }
    } catch (error: any) {
        console.error('S3 Proxy Error:', error);
        res.status(404).json({ success: false, data: null, error: 'File not found' });
    }
});

// POST /api/s3/presigned-upload - Get a signed URL for direct upload
router.post('/presigned-upload', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, contentType, extension } = req.body;
        if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

        const client = getS3Client();
        const timestamp = Date.now();
        const key = `projects/${projectId}/renders/video_${timestamp}.${extension || 'mp4'}`;

        const command = new PutObjectCommand({
            Bucket: config.awsS3Bucket,
            Key: key,
            ContentType: contentType || 'video/mp4'
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

        res.json({
            success: true,
            data: {
                uploadUrl,
                key,
                expiresIn: 3600
            }
        });
    } catch (error: any) {
        console.error('Presigned Upload Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
