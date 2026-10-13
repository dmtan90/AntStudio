// User media library (upload, list, delete, cloud) (moved verbatim from routes/media.ts).
// Mounted by media.ts.
import { Router } from 'express';
import { Media } from '../../models/Media.js';
import { uploadFileFromPath, deleteFromS3 } from '../../utils/s3.js';
import { connectDB } from '../../utils/db.js';
import { configService } from '../../utils/ConfigService.js';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { StorageFactory } from '../../services/storage/StorageFactory.js';
import { Logger } from '../../utils/Logger.js';
import { upload, removeTempUploads, safeKeyFileName } from './shared.js';
import { escapeRegExp } from '../../utils/escapeRegExp.js';

const router = Router();

// All media routes require authentication
// router.use(authMiddleware);

// Helper function to get media API settings
// async function getMediaSettings() {
//     await connectDB();
//     return configService.mediaAPI;
// }

// ============================================================================
// INTERNAL MEDIA UPLOAD/LIST/DELETE
// ============================================================================

// POST /api/media/upload - Upload file to active storage
router.post('/upload', authMiddleware, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req: AuthRequest, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const mainFile = files?.['file']?.[0];
    const thumbnailFile = files?.['thumbnail']?.[0];
    try {
        await connectDB();

        if (!mainFile) {
            return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
        }

        const purpose = req.body.purpose || 'general';
        const size = mainFile.size;
        const fileName = mainFile.originalname;
        const contentType = mainFile.mimetype;

        // Stream the temp file to active storage (the client file name is sanitized for the key)
        const key = `${purpose === 'avatar' ? 'avatars' : 'media'}/${req.user!.userId}/${Date.now()}-${safeKeyFileName(fileName)}`;
        const uploadResult = await uploadFileFromPath(key, mainFile.path, contentType);

        const metadata: Record<string, any> = {};

        // Upload thumbnail if present
        if (thumbnailFile) {
            const thumbKey = `thumbnails/${req.user!.userId}/${Date.now()}-${safeKeyFileName(thumbnailFile.originalname || 'thumb.jpg')}`;
            const thumbUploadResult = await uploadFileFromPath(thumbKey, thumbnailFile.path, thumbnailFile.mimetype);
            metadata.thumbnail = thumbUploadResult.key;
        }

        // Create Media record
        const media = await Media.create({
            userId: req.user!.userId,
            key: uploadResult.key,
            fileName,
            contentType,
            size,
            bucket: configService.aws?.bucketName,
            purpose,
            metadata
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
        Logger.error('Upload error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to upload media' });
    } finally {
        await removeTempUploads([mainFile, thumbnailFile]);
    }
});

// GET /api/media/list - List user's media files
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const purpose = req.query.purpose as string;
        const search = req.query.search as string;
        const contentType = req.query.contentType as string;

        const filter: any = { userId: req.user!.userId };
        if (purpose) {
            if (purpose.includes(',')) {
                filter.purpose = { $in: purpose.split(',') };
            } else {
                filter.purpose = purpose;
            }
        }

        if (search) {
            filter.fileName = { $regex: new RegExp(escapeRegExp(search), 'i') };
        }

        if (contentType) {
            filter.contentType = { $regex: new RegExp(`^${escapeRegExp(contentType)}`, 'i') };
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
        Logger.error('List media error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to list media' });
    }
});

// DELETE /api/media/:id - Delete media file
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const media = await Media.findOne({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!media) {
            return res.status(404).json({ success: false, data: null, error: 'Media not found' });
        }

        // Delete main file from active cloud storage
        if (media.key) {
            await deleteFromS3(media.key).catch((err: any) => {
                Logger.error(`Failed to delete file ${media.key} from cloud storage:`, err);
            });
        }

        // Delete thumbnail from active cloud storage if it exists
        if (media.metadata?.thumbnail) {
            await deleteFromS3(media.metadata.thumbnail).catch((err: any) => {
                Logger.error(`Failed to delete thumbnail ${media.metadata.thumbnail} from cloud storage:`, err);
            });
        }

        await media.deleteOne();

        res.json({ success: true, data: { message: 'Media deleted' } });
    } catch (error: any) {
        Logger.error('Delete media error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to delete media' });
    }
});

// GET /api/media/cloud/list - List files from the active cloud storage provider
router.get('/cloud/list', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const prefix = req.query.prefix as string;
        const adapter = await StorageFactory.getActiveAdapter();
        const files = await adapter.listFiles(prefix);

        res.json({
            success: true,
            data: {
                files
            }
        });
    } catch (error: any) {
        Logger.error('Cloud list error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to list cloud assets' });
    }
});

export default router;
