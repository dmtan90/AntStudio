import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Media } from '../models/Media.js';
import { uploadToS3 } from '../utils/s3.js';
import { connectDB } from '../utils/db.js';
import config from '../utils/config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { Template } from '../models/Template.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';

// Define the file filter function to update the filename encoding
const fileFilter = (req: AuthRequest, file: any, callback: any) => {
    // Re-encode from latin1 (Multer's default behavior in older versions) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    callback(null, true); // Accept the file
};

const router = Router();
const upload = multer({
    fileFilter, storage: multer.memoryStorage(),
    limits: { fileSize: 2000 * 1024 * 1024 }
}); // 2GB limit

// All media routes require authentication
// router.use(authMiddleware);

// Helper function to get media API settings
async function getMediaSettings() {
    await connectDB();
    const settings = await AdminSettings.findOne();
    return settings?.apiConfigs?.media || null;
}

// ============================================================================
// INTERNAL MEDIA UPLOAD/LIST/DELETE
// ============================================================================

// POST /api/media/upload - Upload file to S3
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();

        if (!req.file) {
            return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
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
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to upload media' });
    }
});

// GET /api/media/list - List user's media files
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const purpose = req.query.purpose as string;

        const filter: any = { userId: req.user!.userId };
        if (purpose) {
            if (purpose.includes(',')) {
                filter.purpose = { $in: purpose.split(',') };
            } else {
                filter.purpose = purpose;
            }
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

        // Delete from S3 (optional - could be done in background)
        // await deleteFromS3(media.key);

        await media.deleteOne();

        res.json({ success: true, data: { message: 'Media deleted' } });
    } catch (error: any) {
        console.error('Delete media error:', error);
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
        console.error('Cloud list error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to list cloud assets' });
    }
});

// GET /api/media/proxy - Proxy external media to bypass CORS/CORP
router.get('/proxy', async (req: Request, res: Response) => {
    try {
        const url = req.query.url as string;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL parameter is required' });
        }

        // Validate URL (basic security)
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return res.status(400).json({ success: false, error: 'Invalid URL protocol' });
            }
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid URL' });
        }

        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch resource: ${response.statusText}`);
        }

        // Set Headers
        // Critical: Set CORP header to allow embedding in COEP environments
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Forward content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Stream the response body
        // @ts-ignore
        if (response.body && typeof response.body.pipe === 'function') {
            // Node-fetch style
            (response.body as any).pipe(res);
        } else if (response.body) {
            // Web streams style (native fetch in Node 18+)
            const reader = response.body.getReader();
            const stream = new ReadableStream({
                start(controller) {
                    return pump();
                    function pump(): any {
                        return reader.read().then(({ done, value }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            controller.enqueue(value);
                            // Write to express response
                            res.write(value);
                            return pump();
                        });
                    }
                }
            });
            // Wait for stream to finish
            await new Promise((resolve) => {
                const check = setInterval(() => {
                    // This is a bit hacky for native fetch streaming to express
                    // Better to use buffer for now if small, or standard readable stream conversion
                }, 100);
                // Actually, the above manual read/write loop works
                reader.closed.then(() => {
                    res.end();
                    resolve(true);
                });
            });
        } else {
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        }

    } catch (error: any) {
        console.error('Proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message || 'Proxy failed' });
        }
    }
});

// ============================================================================
// EXTERNAL APIS (GIPHY, PEXELS, UNSPLASH)
// ============================================================================

const GIPHY_API_GIF_TRENDING = 'https://api.giphy.com/v1/gifs/trending';
const GIPHY_API_GIF_SEARCH = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_API_STICKER_TRENDING = 'https://api.giphy.com/v1/stickers/trending';
const GIPHY_API_STICKER_SEARCH = 'https://api.giphy.com/v1/stickers/search';
const GIPHY_API_EMOJI = 'https://api.giphy.com/v2/emoji';

enum GiphyType {
    GIF = 'gif',
    STICKER = 'sticker',
    EMOJI = 'emoji',
}

// GET /api/media/giphy/gifs
router.get('/giphy/gifs', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.giphy?.apiKey;

        if (!apiKey || !mediaSettings?.giphy?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Giphy API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const offset = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.per_page as string) || 20;

        let url: string;
        if (query) {
            url = `${GIPHY_API_GIF_SEARCH}?api_key=${apiKey}&q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&rating=g`;
        } else {
            url = `${GIPHY_API_GIF_TRENDING}?api_key=${apiKey}&offset=${offset}&limit=${limit}&rating=g`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Giphy API error: ${response.status}`);
        }

        const data: any = await response.json();
        if (data.meta.status > 200) {
            return res.status(data.meta.status).json({
                success: false,
                error: data.meta.msg,
                status: data.meta.status,
            });
        }

        // Transform the data to match the expected format
        const transformedPhotos = data.data.map((gif: any) => ({
            type: GiphyType.GIF,
            id: `GIPHY_${gif.id}`,
            details: {
                src: gif.images.original.url,
                width: parseInt(gif.images.original.width),
                height: parseInt(gif.images.original.height),
                size: parseInt(gif.images.original.size),
                alt: gif.alt_text,
            },
            preview: gif.images.fixed_height_small.webp,
            metadata: {
                GIPHY_id: gif.id,
                title: gif.title,
                original_url: gif.images.original.url,
                source_post_url: gif.source_post_url
            },
        }));

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedPhotos,
                total_results: data.pagination?.total_count ?? 0,
                page: offset,
                per_page: limit,
                next_page: data.pagination?.count == limit,
                prev_page: offset > 0,
            }
        });
    } catch (error: any) {
        console.error('Giphy GIF API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GIFs from Giphy',
            status: 500,
        });
    }
});

// GET /api/media/giphy/stickers
router.get('/giphy/stickers', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.giphy?.apiKey;

        if (!apiKey || !mediaSettings?.giphy?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Giphy API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const offset = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.per_page as string) || 20;

        let url: string;
        if (query) {
            url = `${GIPHY_API_STICKER_SEARCH}?api_key=${apiKey}&q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&rating=g`;
        } else {
            url = `${GIPHY_API_STICKER_TRENDING}?api_key=${apiKey}&offset=${offset}&limit=${limit}&rating=g`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Giphy API error: ${response.status}`);
        }

        const data: any = await response.json();
        if (data.meta.status > 200) {
            return res.status(data.meta.status).json({
                success: false,
                error: data.meta.msg,
                status: data.meta.status,
            });
        }

        const transformedPhotos = data.data.map((gif: any) => ({
            type: GiphyType.STICKER,
            id: `GIPHY_${gif.id}`,
            details: {
                src: gif.images.original.url,
                width: parseInt(gif.images.original.width),
                height: parseInt(gif.images.original.height),
                size: parseInt(gif.images.original.size),
                alt: gif.alt_text,
            },
            preview: gif.images.fixed_height_small.webp,
            metadata: {
                GIPHY_id: gif.id,
                title: gif.title,
                original_url: gif.images.original.url,
                source_post_url: gif.source_post_url
            },
        }));

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedPhotos,
                total_results: data.pagination?.total_count ?? 0,
                page: offset,
                per_page: limit,
                next_page: data.pagination?.count == limit,
                prev_page: offset > 0,
            }
        });
    } catch (error: any) {
        console.error('Giphy Sticker API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stickers from Giphy',
            status: 500,
        });
    }
});

// GET /api/media/giphy/emoji
router.get('/giphy/emoji', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.giphy?.apiKey;

        if (!apiKey || !mediaSettings?.giphy?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Giphy API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const offset = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.per_page as string) || 20;

        let url: string;
        if (query) {
            url = `${GIPHY_API_EMOJI}?api_key=${apiKey}&q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&rating=g`;
        } else {
            url = `${GIPHY_API_EMOJI}?api_key=${apiKey}&offset=${offset}&limit=${limit}&rating=g`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Giphy API error: ${response.status}`);
        }

        const data: any = await response.json();
        if (data.meta.status > 200) {
            return res.status(data.meta.status).json({
                success: false,
                error: data.meta.msg,
                status: data.meta.status,
            });
        }

        const transformedPhotos = data.data.map((gif: any) => ({
            type: GiphyType.EMOJI,
            id: `GIPHY_${gif.id}`,
            details: {
                src: gif.images.original.url,
                width: parseInt(gif.images.original.width),
                height: parseInt(gif.images.original.height),
                size: parseInt(gif.images.original.size),
                alt: gif.alt_text,
            },
            preview: gif.images.fixed_height_small.webp,
            metadata: {
                GIPHY_id: gif.id,
                title: gif.title,
                original_url: gif.images.original.url,
                source_post_url: gif.source_post_url
            },
        }));

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedPhotos,
                total_results: data.pagination?.total_count ?? 0,
                page: offset,
                per_page: limit,
                next_page: data.pagination?.count == limit,
                prev_page: offset > 0,
            }
        });
    } catch (error: any) {
        console.error('Giphy Emoji API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch emoji from Giphy',
            status: 500,
        });
    }
});

// ============================================================================
// PEXELS APIs
// ============================================================================

const PEXELS_API_BASE_URL = 'https://api.pexels.com/v1';

// GET /api/media/pexels/images
router.get('/pexels/images', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.pexels?.apiKey;

        if (!apiKey || !mediaSettings?.pexels?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Pexels API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const page = req.query.page || '1';
        const perPage = req.query.per_page || '20';

        let url: string;
        if (query) {
            url = `${PEXELS_API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        } else {
            url = `${PEXELS_API_BASE_URL}/curated?page=${page}&per_page=${perPage}`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status}`);
        }

        const data: any = await response.json();

        const transformedPhotos = data.photos.map((photo: any) => ({
            id: `pexels_${photo.id}`,
            details: {
                src: photo.src.large2x,
                width: photo.width,
                height: photo.height,
                photographer: photo.photographer,
                photographer_url: photo.photographer_url,
                alt: photo.alt,
            },
            preview: photo.src.medium,
            type: 'image' as const,
            metadata: {
                pexels_id: photo.id,
                avg_color: photo.avg_color,
                original_url: photo.src.original,
            },
        }));

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedPhotos,
                total_results: 'total_results' in data ? data.total_results : 0,
                page: data.page,
                per_page: data.per_page,
                next_page: data.next_page,
                prev_page: data.prev_page,
            }
        });
    } catch (error: any) {
        console.error('Pexels Image API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch images from Pexels',
            status: 500,
        });
    }
});

// GET /api/media/pexels/videos
router.get('/pexels/videos', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.pexels?.apiKey;

        if (!apiKey || !mediaSettings?.pexels?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Pexels API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const page = req.query.page || '1';
        const perPage = req.query.per_page || '20';

        let url: string;
        if (query) {
            url = `${PEXELS_API_BASE_URL}/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        } else {
            url = `${PEXELS_API_BASE_URL}/videos/popular?page=${page}&per_page=${perPage}`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status}`);
        }

        const data: any = await response.json();

        const transformedVideos = data.videos.map((video: any) => ({
            id: `pexels_video_${video.id}`,
            details: {
                src: video.video_files[0]?.link || '',
                width: video.width,
                height: video.height,
                duration: video.duration,
                photographer: video.user.name,
                photographer_url: video.user.url,
            },
            preview: video.image,
            type: 'video' as const,
            metadata: {
                pexels_id: video.id,
                video_files: video.video_files,
            },
        }));

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedVideos,
                total_results: 'total_results' in data ? data.total_results : 0,
                page: data.page,
                per_page: data.per_page,
                next_page: data.next_page,
                prev_page: data.prev_page,
            }
        });
    } catch (error: any) {
        console.error('Pexels Video API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch videos from Pexels',
            status: 500,
        });
    }
});

// ============================================================================
// UNSPLASH APIs
// ============================================================================

const UNSPLASH_API_BASE_URL = 'https://api.unsplash.com';

// GET /api/media/unsplash/images
router.get('/unsplash/images', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mediaSettings = await getMediaSettings();
        const apiKey = mediaSettings?.unsplash?.apiKey;

        if (!apiKey || !mediaSettings?.unsplash?.enabled) {
            return res.status(503).json({
                success: false,
                error: 'Unsplash API is not configured or disabled',
                status: 503
            });
        }

        const query = req.query.query as string;
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.per_page as string) || 20;

        let url: string;
        if (query) {
            url = `${UNSPLASH_API_BASE_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        } else {
            url = `${UNSPLASH_API_BASE_URL}/photos?page=${page}&per_page=${perPage}`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status}`);
        }

        const data: any = await response.json();

        let transformedPhotos = [];
        if ('results' in data) {
            transformedPhotos = data.results.map((photo: any) => ({
                id: `unsplash_${photo.id}`,
                details: {
                    src: photo.urls.full,
                    width: photo.width,
                    height: photo.height,
                    photographer: photo.user.name,
                    photographer_url: photo.user.profile_image.medium,
                    alt: photo.description,
                },
                preview: photo.urls.thumb,
                type: 'image' as const,
                metadata: {
                    unsplash_id: photo.id,
                    avg_color: photo.color,
                    original_url: photo.urls.raw,
                },
            }));
        } else {
            transformedPhotos = data.map((photo: any) => ({
                id: `unsplash_${photo.id}`,
                details: {
                    src: photo.urls.full,
                    width: photo.width,
                    height: photo.height,
                    photographer: photo.user.name,
                    photographer_url: photo.user.profile_image.medium,
                    alt: photo.description,
                },
                preview: photo.urls.thumb,
                type: 'image' as const,
                metadata: {
                    unsplash_id: photo.id,
                    avg_color: photo.color,
                    original_url: photo.urls.raw,
                },
            }));
        }

        res.json({
            success: true,
            error: '',
            status: 200,
            data: {
                photos: transformedPhotos,
                total_results: 'total' in data ? data.total : 0,
                page: page,
                per_page: perPage,
                next_page: transformedPhotos.length == perPage ? true : false,
                prev_page: page > 1 ? true : false,
            }
        });
    } catch (error: any) {
        console.error('Unsplash API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch images from Unsplash',
            status: 500,
        });
    }
});

// ============================================================================
// TEMPLATE APIs
// ============================================================================

// const ZOCKET_API_TEMPLATES = 'https://prod.zocket.com/customer/ads/api/v1/editor/video-templates/all';
// move to /api/marketplace/templates
// // GET /api/media/templates
// router.get('/templates', async (req: AuthRequest, res: Response) => {
//     try {
//         await connectDB();

//         const page = parseInt(req.query.page as string) || 0;
//         const limit = parseInt(req.query.per_page as string) || 20;
//         const query = req.query.query as string;
//         const isPublic = req.query.public === 'true';

//         // 1. Check if we have templates in DB
//         const count = await Template.countDocuments();

//         // 2. If empty, sync from Zocket
//         if (count === 0) {
//             console.log('Template DB empty, syncing from Zocket...');
//             try {
//                 // Fetch all templates (or a large batch) to populate DB
//                 const zocketUrl = `${ZOCKET_API_TEMPLATES}?is_published=true&page=0&limit=100`; // Initial sync limit
//                 const response = await fetch(zocketUrl);

//                 if (!response.ok) {
//                     console.error(`Failed to fetch from Zocket: ${response.status}`);
//                     // Don't fail the request, just return empty or what we have
//                 } else {
//                     const data: any = await response.json();
//                     if (data.data && Array.isArray(data.data.templates)) {
//                         const templatesToSave = data.data.templates.map((t: any) => {
//                             let pages = [];
//                             try {
//                                 pages = typeof t.pages === 'string' ? JSON.parse(t.pages) : t.pages;
//                             } catch (e) {
//                                 console.warn(`Failed to parse pages for template ${t.id}`, e);
//                             }

//                             return {
//                                 id: t.id,
//                                 name: t.name,
//                                 is_published: true, // Assuming public sync
//                                 pages: pages,
//                                 // Map other fields if necessary
//                             };
//                         });

//                         if (templatesToSave.length > 0) {
//                             await Template.insertMany(templatesToSave);
//                             console.log(`Synced ${templatesToSave.length} templates from Zocket.`);
//                         }
//                     }
//                 }
//             } catch (syncError) {
//                 console.error('Error syncing templates from Zocket:', syncError);
//                 // Continue to serve what we have (which might be empty)
//             }
//         }

//         // 3. Query DB
//         const filter: any = {};
//         if (query) {
//             filter.name = { $regex: query, $options: 'i' };
//         }
//         if (isPublic) {
//             filter.is_published = true;
//         }

//         const templates = await Template.find(filter)
//             .sort({ createdAt: -1 }) // Or allow sorting param
//             .skip(page * limit) // Note: user's client seems to use 0-based page index for this API based on use-public-template.ts
//             .limit(limit)
//             .lean();

//         const total = await Template.countDocuments(filter);

//         res.json({
//             success: true,
//             data: {
//                 templates: templates,
//                 total_results: total,
//                 page: page,
//                 per_page: limit,
//                 next_page: (page + 1) * limit < total,
//                 prev_page: page > 0
//             }
//         });

//     } catch (error: any) {
//         console.error('Template API error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch templates',
//             status: 500
//         });
//     }
// });

export default router;
