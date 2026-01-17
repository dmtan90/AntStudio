import { Router } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../utils/s3.js';
import config from '../utils/config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/s3/* - Proxy S3 files with authentication
router.get('/*', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const key = req.params[0]; // Get the full path after /api/s3/

        if (!key) {
            return res.status(400).json({ error: 'File key is required' });
        }

        const client = getS3Client();
        const command = new GetObjectCommand({
            Bucket: config.awsS3Bucket,
            Key: decodeURIComponent(key)
        });

        const response = await client.send(command);

        // Set appropriate headers
        if (response.ContentType) {
            res.setHeader('Content-Type', response.ContentType);
        }
        if (response.ContentLength) {
            res.setHeader('Content-Length', response.ContentLength.toString());
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Stream the response body
        if (response.Body) {
            // @ts-ignore - AWS SDK body is a stream
            response.Body.pipe(res);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error: any) {
        console.error('S3 Proxy Error:', error);
        res.status(404).json({ error: 'File not found' });
    }
});

export default router;
