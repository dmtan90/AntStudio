import { Router, Response } from 'express';
import multer from 'multer';
import { connectDB } from '../utils/db.js';
import { Project } from '../models/Project.js';
import { monitoringService } from '../services/monitoringService.js';
import { systemLogger } from '../utils/systemLogger.js';
import { WebhookService } from '../services/WebhookService.js';
import { moderationService } from '../services/ModerationService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { checkLicenseStatus, checkProjectLimit } from '../middleware/license.js';
import { generateText, generateJSON, generateImage } from '../utils/AIGenerator.js';
import { generateStoryboardIteratively } from '../services/iterativeStoryboard.js';
import { User } from '../models/User.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { licenseGating } from '../middleware/licenseGating.js';
import { hasSufficientCredits, deductCredits, getCreditCost } from '../utils/credits.js';
import { uploadToS3, S3KeyGenerator, getS3Client } from '../utils/s3.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { AnalyticsService } from '../services/AnalyticsService.js';

// Define the file filter function to update the filename encoding
const fileFilter = (req: AuthRequest, file: any, callback: any) => {
    // Re-encode from latin1 (Multer's default behavior in older versions) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    callback(null, true); // Accept the file
};

const router = Router();
const upload = multer({ fileFilter, storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// All project routes require authentication
router.use(authMiddleware);

// GET /api/projects - List user's projects with multi-tenant scoping
router.get('/',
    cacheMiddleware({ ttl: 30, keyPrefix: 'projects:list' }),
    async (req: any, res: Response) => {
        try {
            await connectDB();
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const status = req.query.status as string;
            const search = req.query.search as string;

            const user = await User.findById(req.user!.userId);
            const filter: any = {};

            if (user?.currentOrganizationId) {
                filter.organizationId = user.currentOrganizationId;
            } else {
                filter.userId = req.user!.userId;
                filter.organizationId = { $exists: false }; // Private projects
            }

            if (status) filter.status = status;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (page - 1) * limit;
            const [projects, total] = await Promise.all([
                Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                Project.countDocuments(filter)
            ]);

            res.json({
                success: true,
                data: {
                    projects,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
                }
            });
        } catch (error: any) {
            console.error('List projects error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to list projects' });
        }
    });

// POST /api/projects - Create new project (scoped to organization)
router.post('/', checkLicenseStatus, checkProjectLimit, licenseGating('trial'), rbacMiddleware(Permission.PROJECT_CREATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { title, description, mode, aspectRatio, videoStyle, targetDuration, metadata, advancedEditorState } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

        const user = await User.findById(req.user!.userId);
        const project = await Project.create({
            userId: req.user!.userId,
            organizationId: user?.currentOrganizationId || undefined,
            title,
            description: description || '',
            mode: mode || 'topic',
            aspectRatio: aspectRatio || '16:9',
            videoStyle: videoStyle || 'cinematic',
            targetDuration: targetDuration || 60,
            status: 'draft',
            input: {},
            metadata: metadata || {},
            advancedEditorState: advancedEditorState || null,
        });

        res.status(201).json({ success: true, data: { project } });
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create project' });
    }
});

// GET /api/projects/:id - Get single project (scoped)
router.get('/:id', async (req: any, res: Response) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId);
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const isOwner = project.userId.toString() === req.user!.userId.toString();
        const isOrgProject = project.organizationId && user?.currentOrganizationId &&
            project.organizationId.toString() === user.currentOrganizationId.toString();

        if (!isOwner && !isOrgProject) {
            return res.status(403).json({ success: false, error: 'Access denied: project is outside active context' });
        }

        // Track view asynchronously
        AnalyticsService.trackView(req.params.id);

        res.json({ success: true, data: { project } });
    } catch (error: any) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to get project' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user!.userId },
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        res.json({ success: true, data: { project } });
    } catch (error: any) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update project' });
    }
});

// POST /api/projects/preview - Quick preview
router.post('/preview', checkLicenseStatus, licenseGating('trial'), upload.array('files'), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { topic, history, targetDuration } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: 'Topic is required' });

        // Credit Check
        const cost = await getCreditCost('text');
        const hasCredits = await hasSufficientCredits(req.user!.userId, cost);
        if (!hasCredits) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        // 1. Detect language
        const langPrompt = `Detect the language of the following text. Respond with only the language name in English.\n\nText: ${topic.substring(0, 500)}`;
        const detectedLanguage = await generateText(langPrompt);

        // 2. Perform detailed analysis
        const analysisPrompt = `You are a professional Creative Director and Strategic Product Marketer. 
        Analyze the current user prompt to extract a comprehensive project vision. Respond in ${detectedLanguage}.
        Return in JSON format:
        {
          "isComplete": true,
          "analysis": {
            "overview": { "genre": "", "duration": "", "setting": "", "themes": "" },
            "characters": [ { "char_id": "", "name": "", "description": "" } ],
            "structure": { "act1": "", "act2": "", "act3": "" },
            "visuals": { "palette": "", "characteristics": "", "camera": "" },
            "audio": { "sfx": "", "music": "" }
          },
          "creativeBrief": { "title": "", "videoType": "", "visualStyle": "" },
          "summary": "",
          "closingMessage": ""
        }`;

        const finalAnalysis = await generateJSON<any>(analysisPrompt, 'gemini-2.5-flash');

        // 3. Generate storyboard
        const storyboard = await generateStoryboardIteratively(
            topic,
            finalAnalysis.analysis,
            targetDuration ? parseInt(targetDuration as string) : 60,
            detectedLanguage
        );

        // Deduct Credits (Success)
        await deductCredits(req.user!.userId, 'text' as any, cost, 'Project Preview Generation');

        res.json({
            success: true,
            data: {
                language: detectedLanguage,
                isComplete: finalAnalysis.isComplete,
                analysis: finalAnalysis.analysis,
                creativeBrief: finalAnalysis.creativeBrief,
                summary: finalAnalysis.summary,
                closingMessage: finalAnalysis.closingMessage,
                storyboard: storyboard.segments,
                totalDuration: storyboard.totalDuration
            }
        });
    } catch (error: any) {
        console.error('Preview error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate preview' });
    }
});

// POST /api/projects/:id/analyze - Deep analysis
router.post('/:id/analyze', checkLicenseStatus, rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost('text');
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const prompt = `Analyze the script and provide deep visual context for the project: ${project.title}. Script: ${project.description}`;
        const analysis = await generateJSON<any>(prompt, 'gemini-2.5-flash');

        project.scriptAnalysis = { ...analysis, analyzedAt: new Date() };
        project.status = 'analyzing';
        await project.save();

        await deductCredits(req.user!.userId, 'text' as any, cost, `Project Analysis: ${project.title}`);

        res.json({ success: true, data: { analysis: project.scriptAnalysis } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/chat - AI Refinement
router.post('/:id/chat', checkLicenseStatus, rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost('text');
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const { message } = req.body;
        const response = await generateText(`Directly respond to the user: ${message}. Context: Project ${project.title}`);

        await deductCredits(req.user!.userId, 'text' as any, cost, 'AI Chat Assistance');

        res.json({ success: true, data: { response } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/generate-visual-plan
router.post('/:id/generate-visual-plan', checkLicenseStatus, rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost('text');
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const stylePrompt = `Create a detailed visual art direction for ${project.title}. Style: ${project.videoStyle || 'Cinematic'}`;
        const brief = await generateJSON<any>(stylePrompt, 'gemini-2.5-flash');

        project.creativeBrief = { ...brief, generatedAt: new Date() };
        await project.save();

        await deductCredits(req.user!.userId, 'text' as any, cost, `Visual Plan: ${project.title}`);

        res.json({ success: true, data: { creativeBrief: project.creativeBrief } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/generate-storyboard
router.post('/:id/generate-storyboard', checkLicenseStatus, rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost('text'); // Storyboard is complex but text-based
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const storyboard = await generateStoryboardIteratively(
            project.description,
            project.scriptAnalysis,
            project.targetDuration,
            project.scriptAnalysis?.language || 'English'
        );

        project.storyboard = {
            segments: storyboard.segments as any,
            totalDuration: storyboard.totalDuration,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        project.status = 'storyboard';
        await project.save();

        await deductCredits(req.user!.userId, 'text' as any, cost, `Storyboard Generation: ${project.title}`);

        res.json({ success: true, data: { storyboard: project.storyboard } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/publish
router.post('/:id/publish', rbacMiddleware(Permission.PROJECT_PUBLISH), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const { platform } = req.body;
        project.status = 'completed';
        project.publishing = { ...project.publishing, [platform]: { status: 'published', publishedAt: new Date() } };
        await project.save();

        res.json({ success: true, data: { message: `Project published to ${platform}` } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/stream - Initiate Ant Media broadcast
router.post('/:id/stream', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.finalVideo?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { streamId } = req.body;
        const { antMediaService } = await import('../utils/antMedia.js');
        const { getSignedS3Url } = await import('../utils/s3.js');

        const authenticated = await antMediaService.authenticate();
        if (!authenticated) throw new Error("Failed to authenticate with AMS");

        const videoUrl = await getSignedS3Url(project.finalVideo.s3Key);
        const broadcast = await antMediaService.createBroadcast({
            name: project.title || 'AntFlow Stream',
            streamId: streamId || `antflow-${project._id}`,
            type: 'streamSource',
            streamUrl: videoUrl
        });

        if (!broadcast || !broadcast.streamId) throw new Error("Failed to create stream source");
        await antMediaService.startStreamSource(broadcast.streamId);

        WebhookService.dispatch(req.user!.userId, 'stream.started', {
            projectId: project._id,
            streamId: broadcast.streamId,
            name: project.title
        });

        res.json({ success: true, data: { streamId: broadcast.streamId } });
    } catch (error: any) {
        console.error('Ant Media stream initiation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/upload-final-video - Receive client-side rendered video
router.post('/:id/upload-final-video', rbacMiddleware(Permission.PROJECT_EDIT), upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'review', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const videoFile = files['video']?.[0];
        const reviewFile = files['review']?.[0];

        if (!videoFile) return res.status(400).json({ success: false, error: 'Video file is required' });

        // 1. Upload Full Video to S3
        const finalKey = S3KeyGenerator.finalVideo(projectId);
        await uploadToS3(finalKey, videoFile.buffer, videoFile.mimetype);

        // 2. Upload Review Clip if present
        let reviewKey = '';
        if (reviewFile) {
            reviewKey = S3KeyGenerator.timelapse(projectId); // Using timelapse key for review clips
            await uploadToS3(reviewKey, reviewFile.buffer, reviewFile.mimetype);
        }

        // 3. Update Project State
        project.status = 'completed';
        project.finalVideo = {
            ...project.finalVideo,
            s3Key: finalKey,
            reviewKey: reviewKey,
            duration: parseFloat(req.body.duration) || project.finalVideo?.duration || 0,
            resolution: req.body.resolution || project.finalVideo?.resolution || '1080p',
            fileSize: videoFile.size,
            generatedAt: new Date()
        };
        project.status = 'completed'; // Moved this line to be consistent with the instruction's implied context

        await project.save();

        // Notify other clients that the montage is ready
        const { socketService } = await import('../services/SocketService.js');
        socketService.emitProjectUpdate(req.user!.userId, projectId, {
            type: 'montage_ready',
            result: {
                finalVideoKey: finalKey,
                duration: parseFloat(req.body.duration)
            }
        });

        res.json({
            success: true,
            data: {
                message: 'Final video uploaded and project finalized',
                finalVideo: project.finalVideo
            }
        });

    } catch (error: any) {
        console.error('[UploadFinal] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/syndicate-final - Syndicate final montage to social media
router.post('/:id/syndicate-final', rbacMiddleware(Permission.PROJECT_EDIT), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { caption, hashtags } = req.body;

        const { socialSyndicationService } = await import('../services/SocialSyndicationService.js');
        const result = await socialSyndicationService.syndicateFinalVideo(projectId, { caption, hashtags });

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[SyndicateFinal] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', rbacMiddleware(Permission.PROJECT_DELETE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        res.json({ success: true, data: { message: 'Project deleted successfully' } });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete project' });
    }
});

// POST /api/projects/:id/segments/:segmentId/captions - Generate captions for segment
router.post('/:id/segments/:segmentId/captions', checkLicenseStatus, rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId, segmentId } = req.params;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s._id.toString() === segmentId) as any;
        if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });

        // Determine source media (Video > Audio)
        let s3Key = segment.generatedVideo?.s3Key;
        let mimeType = 'video/mp4';

        if (!s3Key && segment.generatedAudio?.s3Key) {
            s3Key = segment.generatedAudio.s3Key;
            mimeType = 'audio/mp3'; // or waiver
        }

        if (!s3Key) return res.status(400).json({ success: false, error: 'No media found to caption' });

        const cost = await getCreditCost('audio'); // Assume captioning maps to audio minutes cost
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        // Download from S3
        // We need a helper to get Buffer from S3. Assuming one exists or we import S3 client.
        const s3Client = getS3Client();
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key
        };

        // Get Stream and convert to Buffer
        const { Body } = await s3Client.send(new GetObjectCommand(s3Params));
        const chunks = [];
        for await (const chunk of (Body as any)) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Generate Captions
        const { autoCaptionService } = await import('../services/ai/AutoCaptionService.js');
        const captions = await autoCaptionService.generateCaptions(buffer, mimeType);

        // Update Project
        segment.captions = captions;
        segment.markModified('captions'); // Mongoose requires this for mixed types sometimes
        await project.save();

        await deductCredits(req.user!.userId, 'audio' as any, cost, `Caption Generation: ${segment.title}`);

        res.json({ success: true, data: { captions } });

    } catch (error: any) {
        console.error('Caption generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/assets/generate - Generate specific asset
router.post('/:id/assets/generate', checkLicenseStatus, rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { assetName, description, type, segmentId } = req.body;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        if (type === 'image') {
            const result = await generateImage(description, projectId, assetName || `generated-${Date.now()}`, {
                generationType: segmentId ? 'scene' : 'character'
            });

            // Check and update project structure if segmentId provided (Scene Image)
            if (segmentId && project.storyboard && project.storyboard.segments) {
                const segment = project.storyboard.segments.find((s: any) => s._id.toString() === segmentId);
                if (segment) {
                    segment.sceneImage = result.s3Key; // Save key
                }
            }

            // Add main visual assets list if not exists
            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({
                name: assetName || `Generated Asset ${Date.now()}`,
                description: description || '',
                type: 'image',
                status: 'ready',
                s3Key: result.s3Key,
                createdAt: new Date()
            });

            await project.save();
            return res.json({ success: true, data: { s3Key: result.s3Key, url: result.s3Key } });
        }

        res.json({ success: true, message: 'Asset generation initiated (Simulation for non-image types)' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/assets/upload - Upload asset
router.post('/:id/assets/upload',
    checkLicenseStatus,
    rbacMiddleware(Permission.PROJECT_EDIT),
    upload.single('file'),
    async (req: any, res: Response) => {
        try {
            await connectDB();
            const projectId = req.params.id;

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No files uploaded' });
            }

            const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
            if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

            const file = req.file;
            const s3Key = `projects/${projectId}/assets/${Date.now()}_${file.originalname}`;
            const uploadResult = await uploadToS3(s3Key, file.buffer, file.mimetype);

            // Update Project Assets
            const entityType = req.body.entityType; // 'character', 'segment'
            const entityId = req.body.entityId;

            if (entityType && entityId) {
                if (entityType === 'segment' && project.storyboard && project.storyboard.segments) {
                    const segment = project.storyboard.segments.find((s: any) => s._id.toString() === entityId);
                    if (segment) {
                        segment.sceneImage = uploadResult.key;
                    }
                } else if (entityType === 'character' && project.scriptAnalysis && project.scriptAnalysis.characters) {
                    const character = project.scriptAnalysis.characters.find((c: any) => c.name === entityId || c._id === entityId); // assuming entityId matches name or ID
                    if (character) {
                        character.referenceImage = uploadResult.key;
                    }
                }
            } else {
                // Generic Asset Upload (e.g. Recordings)
                if (!project.visualAssets) project.visualAssets = [];
                project.visualAssets.push({
                    name: file.originalname,
                    description: req.body.description || 'Uploaded asset',
                    type: file.mimetype.startsWith('video/') ? 'video' : file.mimetype.startsWith('audio/') ? 'audio' : 'image',
                    status: 'ready',
                    s3Key: uploadResult.key,
                    metadata: {
                        originalName: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype
                    },
                    createdAt: new Date()
                });
            }
            await project.save();

            res.json({ success: true, data: { s3Key: uploadResult.key, url: uploadResult.key } });
        } catch (error: any) {
            console.error('Asset upload error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

// GET /api/projects/:id/analytics - Get project analytics
router.get('/:id/analytics', async (req: any, res: Response) => {
    try {
        await connectDB();
        const analytics = await AnalyticsService.getProjectAnalytics(req.params.id);
        if (!analytics) return res.status(404).json({ success: false, error: 'Analytics not found' });
        res.json({ success: true, data: analytics });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/track - Track engagement
router.post('/:id/track', async (req: any, res: Response) => {
    try {
        await connectDB();
        const { type } = req.body;
        if (!['like', 'dislike', 'share'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid tracking type' });
        }
        await AnalyticsService.trackEngagement(req.params.id, type as any);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
