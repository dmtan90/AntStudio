import { Router } from 'express';
import multer from 'multer';
import { Media } from '../models/Media.js';
import { uploadToS3 } from '../utils/s3.js';
import { connectDB } from '../utils/db.js';
import config from '../utils/config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// All media routes require authentication
router.use(authMiddleware);

// POST /api/media/upload - Upload file to S3
router.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const purpose = req.body.purpose || 'general';
        const size = req.file.size;
        const fileName = req.file.originalname;
        const contentType = req.file.mimetype;

        // Upload to S3
        const key = `${purpose === 'avatar' ? 'avatars' : 'media'}/${req.user!.userId}/${Date.now()}-${fileName}`;
        const uploadResult = await uploadToS3(key, req.file.buffer, contentType);

        // Create Media record
        const media = await Media.create({
            userId: req.user!.userId,
            key: uploadResult.key,
            fileName,
            contentType,
            size,
            bucket: config.awsS3Bucket,
            purpose
        });

        res.json({
            success: true,
            data: {
                key: uploadResult.key,
                url: uploadResult.key,
                media
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload media' });
    }
});

// GET /api/media/list - List user's media files
router.get('/list', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const purpose = req.query.purpose as string;

        const filter: any = { userId: req.user!.userId };
        if (purpose) {
            filter.purpose = purpose;
        }

        const skip = (page - 1) * limit;
        const [media, total] = await Promise.all([
            Media.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Media.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                media,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('List media error:', error);
        res.status(500).json({ error: error.message || 'Failed to list media' });
    }
});

// DELETE /api/media/:id - Delete media file
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const media = await Media.findOne({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Delete from S3 (optional - could be done in background)
        // await deleteFromS3(media.key);

        await media.deleteOne();

        res.json({ success: true, message: 'Media deleted' });
    } catch (error: any) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete media' });
    }
});

export default router;
