import { Router, Response } from 'express';
import { connectDB } from '../utils/db.js';
import { Project } from '../models/Project.js';
import { VideoAssemblyService } from '../services/videoAssemblyService.js'; // Note .js extension for ESM
import { configService } from '../utils/configService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkLicenseStatus, checkProjectLimit } from '../middleware/license.js';
import { generateText, generateJSON } from '../utils/AIGenerator.js';
import { generateStoryboardIteratively } from '../services/iterativeStoryboard.js';
import { User } from '../models/User.js';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

// GET /api/projects - List user's projects with pagination
router.get('/', async (req: any, res: Response) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const search = req.query.search as string;

        // Build filter
        const filter: any = { userId: req.user!.userId };
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch projects with pagination
        const skip = (page - 1) * limit;
        const [projects, total] = await Promise.all([
            Project.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Project.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('List projects error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to list projects' });
    }
});

// POST /api/projects - Create new project
router.post('/', checkLicenseStatus, checkProjectLimit, async (req: any, res: Response) => {
    try {
        await connectDB();

        const { title, description, language, style, aspectRatio, videoStyle, targetDuration, mode } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, data: null, error: 'Title is required' });
        }

        const project = await Project.create({
            userId: req.user!.userId,
            title,
            description: description || '',
            mode: mode || 'topic',
            aspectRatio: aspectRatio || '16:9',
            videoStyle: videoStyle || 'cinematic',
            targetDuration: targetDuration || 60,
            status: 'draft',
            input: {}
        });

        res.status(201).json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to create project' });
    }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req: any, res: Response) => {
    try {
        await connectDB();

        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to get project' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: any, res: Response) => {
    try {
        await connectDB();

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user!.userId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error: any) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to update project' });
    }
});

// POST /api/projects/preview - Quick preview (topic to analysis + storyboard)
router.post('/preview', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();

        const { topic, history, targetDuration } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, data: null, error: 'Topic/Prompt content is required' });
        }

        // 1. Detect language
        const langPrompt = `Detect the language of the following text. Respond with only the language name in English (e.g. Vietnamese, English, Chinese).\n\nText: ${topic.substring(0, 500)}`;
        const detectedLanguage = await generateText(langPrompt);

        // 2. Perform detailed analysis
        const detailedAnalysisPrompt = `You are a professional Creative Director and Strategic Product Marketer. 
        Analyze the current user prompt and history to extract a comprehensive project vision. Respond in ${detectedLanguage}.
        Return in JSON format.`; // Simplified for brevity in this call, full prompt from preview.post.ts is better

        // Using a similar prompt as the original for consistency
        const analysisPrompt = `You are a professional Creative Director and Strategic Product Marketer. 
        Analyze the current user prompt and history to extract a comprehensive project vision.
        
        CRITICAL RULE: Be DECISIVE. Based on current market trends (2024-2026), automatically infer the best video title, project analysis, brief, characters, background, and storyboard segments. 
        
        STRICT RULE: All content in your JSON response (descriptions, summaries, names, titles) MUST be in ${detectedLanguage}.
        
        Current User Input:
        ${topic}
        
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

        const finalAnalysis = await generateJSON<any>(analysisPrompt, 'gemini-2.0-flash-exp');

        // 3. Generate storyboard
        const storyboard = await generateStoryboardIteratively(
            topic,
            finalAnalysis.analysis,
            targetDuration || 60,
            detectedLanguage
        );

        res.json({
            success: true,
            data: {
                language: detectedLanguage,
                isComplete: finalAnalysis.isComplete,
                followUpQuestions: finalAnalysis.followUpQuestions || [],
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
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to generate preview' });
    }
});

// POST /api/projects/:id/analyze - Deep analysis
router.post('/:id/analyze', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const prompt = `Analyze the script and provide deep visual context for the project: ${project.title}. Script: ${project.description}`;
        const analysis = await generateJSON<any>(prompt, 'gemini-2.0-flash-exp');

        project.scriptAnalysis = {
            ...analysis,
            analyzedAt: new Date()
        };
        project.status = 'analyzing';
        await project.save();

        res.json({ success: true, data: { analysis: project.scriptAnalysis } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/chat - AI Refinement
router.post('/:id/chat', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const { message } = req.body;
        // Logic for AI chat refinement goes here...
        // For now, simple echo or basic Gemini response
        const response = await generateText(`Directly respond to the user: ${message}. Context: Project ${project.title}`);

        res.json({ success: true, data: { response } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});


// POST /api/projects/:id/generate-visual-plan
router.post('/:id/generate-visual-plan', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const stylePrompt = `Create a detailed visual art direction for ${project.title}. Style: ${project.videoStyle || 'Cinematic'}`;
        const brief = await generateJSON<any>(stylePrompt, 'gemini-2.0-flash-exp');

        project.creativeBrief = {
            ...brief,
            generatedAt: new Date()
        };
        await project.save();
        res.json({ success: true, data: { creativeBrief: project.creativeBrief } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/generate-storyboard
router.post('/:id/generate-storyboard', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

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

        res.json({ success: true, data: { storyboard: project.storyboard } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/generate-character-images
router.post('/:id/generate-character-images', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        // Logic for generating character images...
        res.json({ success: true, data: { message: 'Character images generation started' } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/generate-location-images
router.post('/:id/generate-location-images', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        // Logic for generating location images...
        res.json({ success: true, data: { message: 'Location images generation started' } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/publish
router.post('/:id/publish', async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const { platform } = req.body;
        project.status = 'completed';
        project.publishing = {
            ...project.publishing,
            [platform]: { status: 'published', publishedAt: new Date() }
        };
        await project.save();

        res.json({ success: true, data: { message: `Project published to ${platform}` } });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/upload-final-video - Consolidated upload and update
router.post('/:id/upload-final-video', async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const multer = (await import('multer')).default;
        const { uploadToS3, S3KeyGenerator } = await import('../utils/s3.js');
        const upload = multer({ storage: multer.memoryStorage() });

        // Handle multipart upload
        await new Promise<void>((resolve, reject) => {
            upload.fields([
                { name: 'video', maxCount: 1 },
                { name: 'review', maxCount: 1 }
            ])(req, res, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const videoFile = files?.['video']?.[0];
        const reviewFile = files?.['review']?.[0];

        if (!videoFile) {
            return res.status(400).json({ success: false, data: null, error: 'Final video file is required' });
        }

        const { duration, resolution } = req.body;

        // 1. Upload Final Video
        const videoExt = videoFile.originalname.split('.').pop()?.toLowerCase() || 'mp4';
        const videoKey = S3KeyGenerator.finalVideo(projectId, videoExt);
        const videoUpload = await uploadToS3(videoKey, videoFile.buffer, videoFile.mimetype);

        // 2. Upload Review Clip (if provided)
        let reviewKey = '';
        let reviewUrl = '';
        if (reviewFile) {
            const reviewExt = reviewFile.originalname.split('.').pop()?.toLowerCase() || 'mp4';
            reviewKey = `projects/${projectId}/review_clip.${reviewExt}`;
            const reviewUpload = await uploadToS3(reviewKey, reviewFile.buffer, reviewFile.mimetype);
            reviewUrl = reviewUpload.url;
        }

        // 3. Update Project
        project.finalVideo = {
            s3Key: videoKey,
            s3Url: videoUpload.url,
            reviewKey,
            reviewUrl,
            duration: parseFloat(duration) || 0,
            resolution: resolution || '1080p',
            fileSize: videoFile.size,
            generatedAt: new Date()
        };
        project.status = 'completed';
        await project.save();

        res.json({ success: true, data: { finalVideo: project.finalVideo } });
    } catch (error: any) {
        console.error('Final video upload failed:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/stream - Initiate Ant Media broadcast
router.post('/:id/stream', async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        if (!project.finalVideo?.s3Key) return res.status(400).json({ success: false, data: null, error: 'Final video not found' });

        const { streamId } = req.body;
        const { antMediaService } = await import('../utils/antMedia.js');
        const { getSignedS3Url } = await import('../utils/s3.js');

        // 1. Authenticate with AMS
        const authenticated = await antMediaService.authenticate();
        if (!authenticated) throw new Error("Failed to authenticate with Ant Media Server");

        // 2. Generate signed URL for AMS to pull the video
        const videoUrl = await getSignedS3Url(project.finalVideo.s3Key);

        // 3. Create Broadcast
        const broadcast = await antMediaService.createBroadcast({
            name: project.title || 'AntFlow Stream',
            streamId: streamId || `antflow-${project._id}`,
            type: 'streamSource',
            streamUrl: videoUrl
        });

        if (!broadcast || !broadcast.streamId) throw new Error("Failed to create stream source");

        // 4. Start Ingest
        const started = await antMediaService.startStreamSource(broadcast.streamId);
        if (!started) throw new Error("Broadcast created but failed to start ingest");

        res.json({ success: true, data: { streamId: broadcast.streamId } });
    } catch (error: any) {
        console.error('Ant Media stream initiation failed:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/stream/endpoint - Add RTMP endpoint for restreaming
router.post('/:id/stream/endpoint', async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });

        const { streamId, rtmpUrl } = req.body;
        if (!streamId || !rtmpUrl) return res.status(400).json({ success: false, error: 'Stream ID and RTMP URL are required' });

        const { antMediaService } = await import('../utils/antMedia.js');

        const authenticated = await antMediaService.authenticate();
        if (!authenticated) throw new Error("Failed to authenticate with Ant Media Server");

        const success = await antMediaService.addEndpoint(streamId, rtmpUrl);
        if (!success) throw new Error("Failed to add RTMP endpoint");

        res.json({ success: true, data: { message: 'RTMP endpoint added successfully' } });
    } catch (error: any) {
        console.error('Add stream endpoint failed:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// POST /api/projects/:id/vod - Upload as VoD asset to Ant Media
router.post('/:id/vod', async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        if (!project.finalVideo?.s3Key) return res.status(400).json({ success: false, data: null, error: 'Final video not found' });

        const { antMediaService } = await import('../utils/antMedia.js');
        const { getFromS3 } = await import('../utils/s3.js');

        // 1. Authenticate
        const authenticated = await antMediaService.authenticate();
        if (!authenticated) throw new Error("Failed to authenticate with Ant Media Server");

        // 2. Fetch video from S3
        const stream = await getFromS3(project.finalVideo.s3Key);
        if (!stream) throw new Error("Failed to retrieve video from storage");

        // Convert stream to Buffer (Required for FormData in Node)
        const chunks: any[] = [];
        for await (const chunk of stream as any) {
            chunks.push(chunk);
        }
        const videoBuffer = Buffer.concat(chunks);

        // 3. Upload to AMS VoD
        const fileName = `${project.title || 'video'}_${project._id}.mp4`;
        const result = await antMediaService.uploadVoD(videoBuffer, fileName);

        if (!result || !result.vodId) throw new Error("AMS VoD upload failed");

        res.json({ success: true, data: { vodId: result.vodId, result } });
    } catch (error: any) {
        console.error('Ant Media VoD upload failed:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// DELETE /api/projects/:id - Delete project (RESTORED)
router.delete('/:id', async (req: any, res: Response) => {
    try {
        await connectDB();

        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            userId: req.user!.userId
        });

        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        res.json({
            success: true,
            data: { message: 'Project deleted successfully' }
        });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to delete project' });
    }
});


// POST /api/projects/:id/assets/generate - Generate specific asset (image/video)
router.post('/:id/assets/generate', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { assetName, description, type, characterNames, segmentId, duration: reqDuration, imageStart, imageEnd, generationType } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, data: null, error: 'Missing Project ID' });
        }

        // 1. Fetch Project
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        // 2. Resolve Segment
        let segment: any = null;
        if (segmentId) {
            segment = project.storyboard?.segments?.find((s: any) => s._id?.toString() === segmentId || s.order === parseInt(segmentId));
        } else if (assetName && (assetName.toLowerCase().startsWith('scene_') || assetName.toLowerCase().startsWith('segment_'))) {
            // Fallback: try to find segment by name pattern
            const parts = assetName.split('_');
            if (parts.length > 1) {
                const segOrder = parseInt(parts[1]);
                segment = project.storyboard?.segments?.find((s: any) => s.order === segOrder);
            }
        }

        const effectiveType = type || (segment ? 'video' : 'image');
        const effectiveDescription = description || segment?.description || '';
        const effectiveAssetName = assetName || (segment ? `segment_${segment.order}.${effectiveType === 'video' ? 'mp4' : 'img'}` : 'unnamed_asset');

        // 3. Credits Check & Deduction
        const { getCreditCost, deductCredits } = await import('../utils/credits.js');
        const baseCreditCost = await getCreditCost(effectiveType === 'video' ? 'video' : 'image');
        let creditAmount = baseCreditCost;

        if (effectiveType === 'video') {
            const duration = segment?.duration || reqDuration || 5;
            creditAmount = duration * baseCreditCost;
        }

        try {
            await deductCredits(req.user!.userId, creditAmount, `Generate ${effectiveType}: ${effectiveAssetName}`);
        } catch (error: any) {
            return res.status(402).json({ success: false, data: null, error: error.message || 'Insufficient credits' });
        }

        let s3Key = '';
        const { getSignedS3Url, S3KeyGenerator } = await import('../utils/s3.js');
        const { logProjectEvent } = await import('../utils/projectLogger.js');

        // Determine Standard S3 Key
        let targetS3Key = '';
        if (segment) {
            targetS3Key = effectiveType === 'video'
                ? S3KeyGenerator.sceneVideo(projectId, segment.order)
                : S3KeyGenerator.sceneImage(projectId, segment.order);
        } else if (effectiveAssetName.includes('char_') || effectiveAssetName.includes('character')) {
            // Try to extract character name or use asset name
            targetS3Key = S3KeyGenerator.characterImage(projectId, effectiveAssetName.replace('.png', '').replace('.jpg', ''));
        } else {
            targetS3Key = S3KeyGenerator.asset(projectId, 'asset', effectiveAssetName, effectiveType === 'video' ? 'mp4' : 'png');
        }

        // 4. Handle Video Generation
        if (effectiveType === 'video') {
            const { generateVideo } = await import('../utils/AIGenerator.js');
            const { buildVeoVideoPrompt } = await import('../utils/PromptBuilder.js');

            let videoPrompt = '';
            let characterImages: string[] = [];

            if (segment) {
                // Use standardized prompt builder
                videoPrompt = await buildVeoVideoPrompt(
                    segment,
                    project.scriptAnalysis?.characters || [],
                    project.creativeBrief?.visualStyle || project.videoStyle || 'Cinematic',
                    project.scriptAnalysis?.language
                );

                // Resolve character reference images
                const characterImagesRaw = project.scriptAnalysis?.characters
                    ?.filter((c: any) => segment.characters?.includes(c.name) && c.referenceImage)
                    .map((c: any) => c.referenceImage) || [];

                characterImages = await Promise.all(characterImagesRaw.map(async (key: string) => {
                    return key.startsWith('http') ? key : await getSignedS3Url(key);
                }));
            } else {
                videoPrompt = effectiveDescription;
            }

            // Start frame
            let imageStartUrl = undefined;
            const startImageKey = segment?.sceneImage || imageStart;
            if (startImageKey) {
                imageStartUrl = startImageKey.startsWith('http') ? startImageKey : await getSignedS3Url(startImageKey);
            }

            // End frame
            let imageEndUrl = undefined;
            const nextSegment = segment ? project.storyboard?.segments?.find((s: any) => s.order === segment.order + 1) : null;
            const endImageKey = nextSegment?.sceneImage || imageEnd;
            if (endImageKey) {
                imageEndUrl = endImageKey.startsWith('http') ? endImageKey : await getSignedS3Url(endImageKey);
            }

            const { jobId } = await generateVideo({
                prompt: videoPrompt,
                duration: segment?.duration || reqDuration || 5,
                aspectRatio: project.aspectRatio === '9:16' ? '9:16' : (project.aspectRatio === '1:1' ? '1:1' : '16:9'),
                imageStart: imageStartUrl,
                imageEnd: imageEndUrl,
                characterImages: characterImages.length > 0 ? characterImages : undefined
            });

            // Mock response or real job ID handling
            s3Key = jobId.startsWith('mock-') ? `https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4` : '';

            // Update segment video status if applicable
            if (segment) {
                segment.generatedVideo = {
                    s3Key,
                    status: jobId.startsWith('mock-') ? 'completed' : 'pending',
                    veoJobId: jobId,
                    generatedAt: new Date(),
                    duration: segment.duration || 5
                };
            }
        }
        // 5. Handle Image Generation
        else {
            const { generateImage } = await import('../utils/AIGenerator.js');

            // Prepare character context
            const characterContext: any[] = [];
            const charsToLookup = characterNames || segment?.characters || [];

            if (charsToLookup.length > 0 && project.scriptAnalysis?.characters) {
                charsToLookup.forEach((name: string) => {
                    const char = project.scriptAnalysis!.characters.find((c: any) =>
                        c.name.toLowerCase() === name.toLowerCase()
                    );
                    if (char) characterContext.push(char);
                });
            }
            console.debug("generationType", generationType);
            const imageResult = await generateImage(
                effectiveDescription,
                projectId,
                effectiveAssetName.replace(/\.(img|png|jpg|jpeg)$/i, ''),
                {
                    aspectRatio: project.aspectRatio === '9:16' ? '9:16' : (project.aspectRatio === '1:1' ? '1:1' : '16:9'),
                    characterContext: characterContext.length > 0 ? characterContext : undefined,
                    generationType: generationType
                }
            );
            s3Key = imageResult.s3Key;

            // Sync with segment if applicable
            if (segment) {
                segment.sceneImage = s3Key;
            }
        }

        // 6. Update Visual Asset Record
        const assetIndex = project.visualAssets?.findIndex((a: any) => a.name === effectiveAssetName);
        if (assetIndex !== undefined && assetIndex !== -1 && project.visualAssets) {
            project.visualAssets[assetIndex].status = 'ready';
            project.visualAssets[assetIndex].s3Key = s3Key;
            project.visualAssets[assetIndex].description = effectiveDescription;
        } else {
            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({
                name: effectiveAssetName,
                description: effectiveDescription,
                type: effectiveType,
                status: 'ready',
                s3Key: s3Key,
                createdAt: new Date()
            });
        }

        // 7. Sync Characters (Heuristic)
        if (project.scriptAnalysis?.characters) {
            const lowerAssetName = effectiveAssetName.toLowerCase();
            project.scriptAnalysis.characters.forEach((char: any) => {
                const charName = char.name.toLowerCase();
                // Matches name or name_with_underscores
                if (lowerAssetName.includes(charName) || lowerAssetName.includes(charName.replace(/\s/g, '_'))) {
                    char.referenceImage = s3Key;
                }
            });
        }

        await project.save();

        // 8. Log Event
        await logProjectEvent(projectId, {
            role: 'system',
            type: 'asset_gen',
            content: `Generated ${effectiveType} "${effectiveAssetName}"${segment ? ` for segment ${segment.order}` : ''}.`,
            metadata: { s3Key, type: effectiveType, segmentId: segment?._id }
        });

        res.json({
            success: true,
            data: {
                name: effectiveAssetName,
                s3Key,
                video: segment?.generatedVideo,
                segment: segment
            }
        });

    } catch (error: any) {
        console.error('Asset Generation failed:', error);
        // Log failure if possible, but don't fail the response if logging fails
        try {
            if (req.params.id) {
                const { logProjectEvent } = await import('../utils/projectLogger.js');
                await logProjectEvent(req.params.id, {
                    role: 'system',
                    type: 'event',
                    content: `Failed to generate asset: ${error.message}`
                });
            }
        } catch (e) { /* ignore logging error */ }

        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to generate asset' });
    }
});

// POST /api/projects/:id/segments/:segmentId/generate-voiceover
router.post('/:id/segments/:segmentId/generate-voiceover', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id, segmentId } = req.params;
        const { voiceId, providerId, modelId } = req.body;

        const project = await Project.findOne({ _id: id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s._id?.toString() === segmentId);
        if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });

        const text = segment.voiceover;
        if (!text) return res.status(400).json({ success: false, error: 'Segment has no voiceover text' });

        // Deduction
        const { getCreditCost, deductCredits } = await import('../utils/credits.js');
        const creditCost = await getCreditCost('audio');
        await deductCredits(req.user!.userId, creditCost, `Generate Voiceover for segment ${segment.order}`);

        // Update status to pending
        segment.generatedAudio = {
            s3Key: '',
            s3Url: '',
            status: 'generating',
            generatedAt: new Date()
        };
        await project.save();

        const { generateAudio } = await import('../utils/AIGenerator.js');
        const { S3KeyGenerator } = await import('../utils/s3.js');

        const filename = `seg_${segment.order}`;
        const targetS3Key = S3KeyGenerator.audio(id, 'voice', filename, 'mp3');

        const audioResult = await generateAudio(text, id, filename, {
            providerId,
            modelId,
            voice: voiceId,
            s3Key: targetS3Key
        });

        // Update status to completed
        segment.generatedAudio = {
            s3Key: audioResult.s3Key,
            s3Url: audioResult.s3Url,
            status: 'completed',
            generatedAt: new Date()
        };
        await project.save();

        const { logProjectEvent } = await import('../utils/projectLogger.js');
        await logProjectEvent(id, {
            role: 'system',
            type: 'asset_gen',
            content: `Generated voiceover for segment ${segment.order}.`,
            metadata: { s3Key: audioResult.s3Key, segmentId }
        });

        res.json({ success: true, data: { generatedAudio: segment.generatedAudio } });

    } catch (error: any) {
        console.error('Voiceover generation failed:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate voiceover' });
    }
});

// POST /api/projects/:id/assets/upload - Upload asset file directly
router.post('/:id/assets/upload', checkLicenseStatus, async (req: any, res: Response) => {
    try {
        await connectDB();
        const multer = (await import('multer')).default;
        const { uploadToS3 } = await import('../utils/s3.js');

        // Configure multer for memory storage
        const upload = multer({ storage: multer.memoryStorage() });

        // Use multer middleware
        await new Promise<void>((resolve, reject) => {
            upload.single('file')(req, res, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.file) {
            return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
        }

        const { entityType, entityId } = req.body;
        const projectId = req.params.id;

        // Fetch project
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        // Determine file type and S3 path
        const fileExt = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';
        const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(fileExt);
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);

        if (!isVideo && !isImage) {
            return res.status(400).json({ success: false, data: null, error: 'Only image and video files are supported' });
        }

        const assetType = isVideo ? 'video' : 'image';

        let s3Key = '';
        const { S3KeyGenerator } = await import('../utils/s3.js');

        if (entityType === 'character') {
            // We need character name for standard key. Fetch it.
            const charIndex = parseInt(entityId);
            const charName = project.scriptAnalysis?.characters?.[charIndex]?.name || `char_${entityId}`;
            s3Key = S3KeyGenerator.characterImage(projectId, charName);
        } else if (entityType === 'segment') {
            const segmentOrder = parseInt(entityId); // Assuming entityId is order for segment
            // We need to resolve segment object to be sure about order if entityId is ID.
            // But existing code at line 692 tries to find it.
            // Let's rely on entityId being order or resolve it if possible.
            // The existing code at 695 checks both ID and Order.
            // For standard key, we prefer Order.
            let order = parseInt(entityId);
            const segment = project.storyboard?.segments?.find((s: any) => s._id?.toString() === entityId || s.order === parseInt(entityId));
            if (segment) order = segment.order;

            if (isVideo) s3Key = S3KeyGenerator.sceneVideo(projectId, order);
            else s3Key = S3KeyGenerator.sceneImage(projectId, order);
        } else {
            s3Key = S3KeyGenerator.asset(projectId, entityType, entityId, fileExt);
        }

        // Upload to S3
        const uploadResult = await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

        // Update project based on entity type
        if (entityType === 'character') {
            // Find character by index or name
            const charIndex = parseInt(entityId);
            if (project.scriptAnalysis?.characters && project.scriptAnalysis.characters[charIndex]) {
                project.scriptAnalysis.characters[charIndex].referenceImage = s3Key;
            }
        } else if (entityType === 'segment') {
            // Find segment by ID or order
            let index = -1;
            const segment = project.storyboard?.segments?.find((s: any, i: number) => {
                if (s._id?.toString() === entityId || s.order === parseInt(entityId)) {
                    index = i;
                    return true;
                }
                return false;
            });

            if (segment) {
                if (isImage) {
                    segment.sceneImage = s3Key;
                } else if (isVideo) {
                    segment.generatedVideo = {
                        s3Key,
                        s3Url: uploadResult.url || '',
                        status: 'completed',
                        generatedAt: new Date()
                    };
                }
                // project.storyboard.segments[index] = segment;
            }
        }

        // Update visual assets
        const assetName = `${entityType}_${entityId}.${assetType}`;
        const assetIndex = project.visualAssets?.findIndex((a: any) => a.name === assetName);

        if (assetIndex !== undefined && assetIndex !== -1 && project.visualAssets) {
            project.visualAssets[assetIndex].s3Key = s3Key;
            project.visualAssets[assetIndex].status = 'ready';
        } else {
            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({
                name: assetName,
                description: `Uploaded ${assetType}`,
                type: assetType,
                status: 'ready',
                s3Key,
                createdAt: new Date()
            });
        }

        // Explicitly mark modified to ensure deep nested updates are saved
        if (entityType === 'character') {
            project.markModified('scriptAnalysis');
        } else if (entityType === 'segment') {
            project.markModified('storyboard');
        }

        await project.save();

        // console.log("project", project);

        // Log event
        const { logProjectEvent } = await import('../utils/projectLogger.js');
        await logProjectEvent(projectId, {
            role: 'system',
            type: 'asset_upload',
            content: `Uploaded ${assetType} for ${entityType} ${entityId}`,
            metadata: { s3Key, entityType, entityId }
        });

        res.json({
            success: true,
            data: {
                s3Key,
                url: uploadResult.url,
                entityType,
                entityId,
                type: assetType
            }
        });

    } catch (error: any) {
        console.error('Asset upload failed:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to upload asset' });
    }
});

export default router;
