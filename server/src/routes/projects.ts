import { Router, Response } from 'express';
import multer from 'multer';
import { connectDB } from '../utils/db.js';
import { Project } from '../models/Project.js';
import { Media } from '../models/Media.js';
import { monitoringService } from '../services/system/MonitoringService.js';
import { Logger } from '../utils/Logger.js';
import { WebhookService } from '../services/system/WebhookService.js';
import { moderationService } from '../services/streaming/ModerationService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
// import { checkLicenseStatus, checkProjectLimit } from '../middleware/license.js';
import { generateText, generateJSON, generateImage } from '../utils/AIGenerator.js';
import { generateStoryboardIteratively } from '../services/streaming/IterativeStoryboard.js';
import { User } from '../models/User.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { checkProjectLimit, licenseGating } from '../middleware/LicenseGating.js';
import { hasSufficientCredits, deductCredits, getCreditCost } from '../utils/credits.js';
import { uploadToS3, S3KeyGenerator } from '../utils/s3.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';
import { AnalyticsService } from '../services/streaming/ProjectAnalyticsService.js';
import ffmpeg from 'fluent-ffmpeg';
import { EnvConfig, configService } from '../utils/ConfigService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { AIModelType, getAdminSettings } from '../models/AdminSettings.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';
import { projectContext } from '../utils/ProjectContext.js';
import { buildCharacterSheetPrompt } from '../utils/PromptBuilder.js';
import { promptService } from '../services/ai/PromptService.js';
import { videoWorkflow } from '../services/ai/VideoWorkflow.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import { ServiceType } from '~/models/CreditUsage.js';
import { LicenseType } from '~/models/License.js';
import { socketServer } from '../services/streaming/SocketServer.js';
import { buildVeoVideoPrompt } from '../utils/PromptBuilder.js';
import { getFileBuffer } from '../utils/AIGenerator.js';
import { autoCaptionService } from '../services/ai/AutoCaptionService.js';
import { socialSyndicationService } from '../services/streaming/SocialSyndicationService.js';
import { antMediaService } from '../utils/AntMedia.js';
import { getSignedS3Url } from '../utils/s3.js';
import { UserPlatformAccount } from '../models/UserPlatformAccount.js';

ffmpeg.setFfmpegPath(EnvConfig.ffmpegPath);
ffmpeg.setFfprobePath(EnvConfig.ffprobePath);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Helper for metadata extraction and preview generation
async function processVideo(videoPath: string, projectId: string) {
    const tempDir = path.join(os.tmpdir(), `antflow_${projectId}_${Date.now()}`);
    if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

    const thumbnailPath = path.join(tempDir, 'thumb.jpg');
    const previewPath = path.join(tempDir, 'preview.mp4');

    // 1. Get Metadata with timeout
    const metadata: any = await new Promise((resolve) => {
        const timer = setTimeout(() => {
            Logger.warn('[ProcessVideo] FFprobe timeout, using default metadata');
            resolve({ streams: [], format: { duration: 15 } });
        }, 8000);

        ffmpeg.ffprobe(videoPath, (err: any, data: any) => {
            clearTimeout(timer);
            if (err || !data) {
                Logger.warn('[ProcessVideo] FFprobe error/warning:', err);
                resolve({ streams: [], format: { duration: 15 } });
            } else {
                resolve(data);
            }
        });
    });

    const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
    const rawDuration = parseFloat(metadata.format?.duration);
    const duration = (!isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 15;
    const previewDuration = Math.max(1, Math.min(5, duration));
    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : '1920x1080';

    // 2. Generate Thumbnail safely if not exists
    if (!fs.existsSync(thumbnailPath)) {
        await new Promise<void>((resolve) => {
            let cmd: any = null;
            const timer = setTimeout(() => {
                Logger.warn('[ProcessVideo] Thumbnail generation timeout');
                try { cmd?.kill('SIGKILL'); } catch (e) {}
                resolve();
            }, 10000);

            cmd = ffmpeg(videoPath)
                .inputOptions(['-fflags', '+genpts+igndts', '-analyzeduration', '10000000', '-probesize', '10000000'])
                .outputOptions(['-y', '-vframes 1', '-vf scale=1280:-2'])
                .on('end', () => { clearTimeout(timer); resolve(); })
                .on('error', (err: any) => {
                    clearTimeout(timer);
                    Logger.warn('[ProcessVideo] Thumbnail generation warning:', err?.message || err);
                    resolve();
                });
            cmd.save(thumbnailPath);
        });
    }

    // 3. Generate Preview (MP4 H.264 / AAC) safely if not exists
    if (!fs.existsSync(previewPath)) {
        await new Promise<void>((resolve) => {
            let cmd: any = null;
            const timer = setTimeout(() => {
                Logger.warn('[ProcessVideo] Preview generation timeout');
                try { cmd?.kill('SIGKILL'); } catch (e) {}
                resolve();
            }, 35000);

            cmd = ffmpeg(videoPath)
                .inputOptions(['-fflags', '+genpts+igndts', '-analyzeduration', '10000000', '-probesize', '10000000'])
                .setStartTime(0)
                .setDuration(previewDuration)
                .outputOptions([
                    '-y',
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-preset ultrafast',
                    '-c:a aac',
                    '-vf scale=640:-2'
                ])
                .on('end', () => { clearTimeout(timer); resolve(); })
                .on('error', (err: any) => {
                    clearTimeout(timer);
                    Logger.warn('[ProcessVideo] Preview generation warning:', err?.message || err);
                    resolve();
                });
            cmd.save(previewPath);
        });
    }

    // Fallbacks if files don't exist
    if (!fs.existsSync(thumbnailPath)) {
        try {
            // Write minimalist 1x1 solid dark JPEG
            const dummyJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            fs.writeFileSync(thumbnailPath, Buffer.from(dummyJpgBase64, 'base64'));
        } catch (e) {}
    }
    if (!fs.existsSync(previewPath)) {
        try {
            if (fs.existsSync(videoPath)) {
                fs.copyFileSync(videoPath, previewPath);
            }
        } catch (e) {}
    }

    return {
        duration,
        resolution,
        thumbnailPath,
        previewPath,
        tempDir
    };
}

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
            Logger.error('List projects error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to list projects' });
        }
    });

// POST /api/projects - Create new project (scoped to organization)
router.post('/', licenseGating(LicenseType.TRIAL), checkProjectLimit, rbacMiddleware(Permission.PROJECT_CREATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { title, description, mode, aspectRatio, videoStyle, targetDuration, metadata, pages, scriptAnalysis, storyboard } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

        const user = await User.findById(req.user!.userId);
        const project = await Project.create({
            userId: req.user!.userId,
            organizationId: user?.currentOrganizationId || undefined,
            title,
            description: description || scriptAnalysis?.summary || '',
            mode: mode || 'topic',
            aspectRatio: aspectRatio || '16:9',
            videoStyle: videoStyle || 'cinematic',
            targetDuration: targetDuration || 60,
            status: 'draft',
            input: {},
            metadata: metadata || {},
            pages: pages || null,
            scriptAnalysis: scriptAnalysis || null,
            storyboard: storyboard || null,
            scripts: req.body.scripts || null,
            creativeBrief: req.body.creativeBrief || null
        });

        res.status(201).json({ success: true, data: { project } });
    } catch (error: any) {
        Logger.error('Create project error:', error);
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
        Logger.error('Get project error:', error);
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
        Logger.error('Update project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update project' });
    }
});

// POST /api/projects/preview - Quick preview (Granular Stages)
router.post('/preview', licenseGating(LicenseType.TRIAL), upload.array('files'), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { topic, targetDuration, stage, script, analysis, language, videoStyle, storyboard } = req.body;
        
        if (!topic && !script && !analysis) return res.status(400).json({ success: false, error: 'Topic, script, or analysis is required' });

        const cost = await getCreditCost(AIModelType.TEXT);
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        let currentLanguage = language || 'English';
        if (!language && topic) {
            const langPrompt = `Detect the language of the following text. Respond with only the language name in English.\n\nText: ${topic.substring(0, 500)}`;
            const rawLang = await generateText(langPrompt);
            console.log(">>> DETECTED LANGUAGE RAW:", JSON.stringify(rawLang));
            currentLanguage = rawLang.trim().replace(/[.\n\r]/g, '');
            console.log(">>> DETECTED LANGUAGE CLEANED:", JSON.stringify(currentLanguage));
        }

        // --- STAGE 1: SCRIPT GENERATION ---
        if (stage === 'script' || (!stage && topic && !script)) {
            const workflowResult = await videoWorkflow.run({
                topic,
                videoStyle: videoStyle || 'Cinematic',
                targetDuration: targetDuration || 60,
                language: currentLanguage
            }, 'script');

            await deductCredits(req.user!.userId, ServiceType.TEXT, cost, 'Project Script Generation');

            return res.json({
                success: true,
                data: {
                    stage: 'script',
                    script: workflowResult.script,
                    language: currentLanguage,
                    logs: workflowResult.logs
                }
            });
        }

        // --- STAGE 2: ANALYSIS & CHARACTER GENERATION ---
        if (stage === 'analysis' || stage === 'character' || (!stage && script && !analysis)) {
            const analysisLanguage = language || currentLanguage;
            try {
                const workflowResult = await videoWorkflow.run({
                    topic,
                    videoStyle: videoStyle || 'Cinematic',
                    targetDuration: targetDuration || 60,
                    language: analysisLanguage,
                    script,
                    analysis // Pass existing analysis if we are just re-running character stage
                }, stage === 'character' ? 'character' : 'analysis');

                await deductCredits(req.user!.userId, ServiceType.TEXT, cost, 'Project Vision & Actor Design');

                return res.json({
                    success: true,
                    data: {
                        stage: "analysis",
                        language: analysisLanguage,
                        analysis: workflowResult.analysis?.analysis || workflowResult.analysis,
                        characters: workflowResult.analysis?.analysis?.characters || workflowResult.analysis?.characters,
                        creativeBrief: workflowResult.analysis?.creativeBrief,
                        expertFeedback: workflowResult.analysis?.expertFeedback,
                        summary: workflowResult.analysis?.summary,
                        closingMessage: workflowResult.analysis?.closingMessage,
                        isComplete: workflowResult.analysis?.isComplete || true,
                        logs: workflowResult.logs
                    }
                });
            } catch (error: any) {
                Logger.error('Analysis generation error:', error);
                return res.status(500).json({ success: false, error: 'Failed to generate analysis' });
            }
        }

        // --- STAGE 3: STORYBOARD GENERATION ---
        if (stage === 'storyboard' || (script && analysis && !storyboard)) {
            try {
                const workflowResult = await videoWorkflow.run({
                    topic,
                    videoStyle: videoStyle || 'Cinematic',
                    targetDuration: targetDuration || 60,
                    language: currentLanguage,
                    script,
                    analysis
                }, 'storyboard');

                await deductCredits(req.user!.userId, ServiceType.TEXT, cost, 'Project Storyboard Generation');

                return res.json({
                    success: true,
                    data: {
                        stage: 'storyboard',
                        language: currentLanguage,
                        storyboard: workflowResult.storyboard?.segments || workflowResult.storyboard || [],
                        logs: workflowResult.logs
                    }
                });
            } catch (error: any) {
                Logger.error('Storyboard generation error:', error);
                return res.status(500).json({ success: false, error: 'Failed to generate storyboard' });
            }
        }

        return res.status(400).json({ success: false, error: 'Invalid stage or missing data' });

    } catch (error: any) {
        Logger.error('Preview error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate preview' });
    }
});

// POST /projects/:id/convert-to-script  (Phase 7: Storyboard-to-Live Bridge)
router.post('/:id/convert-to-script', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project: any = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const storyboard: any[] = project.storyboard || [];
        if (!storyboard.length) {
            return res.status(400).json({ success: false, error: 'Project has no storyboard to convert' });
        }

        // Map storyboard segments → ScriptStep[]
        const SCENE_ACTION_MAP: Record<string, string> = {
            wide: 'switch_scene', close: 'switch_scene', medium: 'switch_scene',
            product: 'show_product', action: 'trigger_visual_fx',
        };

        const steps = storyboard.map((seg: any, i: number) => {
            // Derive smart action from visual keywords
            const kw = (seg.visualKeywords || []).join(' ').toLowerCase();
            let action: string | undefined;
            let actionParams: any;

            if (kw.includes('product') || kw.includes('showcase')) {
                action = 'switch_scene';
                actionParams = { actionPayload: 'showcase_pinned' };
            } else if (kw.includes('wide') || kw.includes('panorama')) {
                action = 'switch_scene';
                actionParams = { actionPayload: 'stage_wide' };
            } else if (kw.includes('close') || kw.includes('face')) {
                action = 'switch_scene';
                actionParams = { actionPayload: 'cinematic_focus' };
            }

            // First segment always sets initial layout
            if (i === 0) {
                action = 'switch_scene';
                actionParams = { actionPayload: 'stage_wide' };
            }

            return {
                id: seg.uuid || `seg_${seg.order}`,
                timestamp: Date.now(),
                description: `[Scene ${seg.order}] ${seg.title}`,
                agentId: 'host',
                dialogue: seg.voiceover || seg.description || '',
                action,
                actionParams,
                durationSeconds: seg.duration || 10,
                status: 'pending' as const
            };
        });

        const liveScript = {
            id: `proj_${project._id}_${Date.now()}`,
            profileId: 'custom_import',
            title: project.title || 'Imported Show',
            steps,
            currentIndex: -1,
            isRunning: false,
            createdAt: Date.now()
        };

        return res.json({ success: true, data: { script: liveScript } });
    } catch (error: any) {
        Logger.error('Convert-to-script error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Conversion failed' });
    }
});

// POST /api/projects/:id/storyboard/respin-segment
router.post('/:id/storyboard/respin-segment', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project: any = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost(AIModelType.TEXT);
        if (!await hasSufficientCredits(req.user!.userId, cost)) {
            return res.status(402).json({ success: false, error: 'Insufficient credits' });
        }

        const { segment } = req.body;
        if (!segment) return res.status(400).json({ success: false, error: 'Segment data required' });

        const prompt = await promptService.get('video_creation/segment_respin', {
            order: segment.order,
            title: segment.title,
            description: segment.description,
            duration: segment.duration,
            script: project.description || project.script || '',
            videoStyle: project.videoStyle || 'Cinematic',
            language: project.language || 'English'
        });

        const newSegment = await generateJSON<any>(prompt, undefined);
        await deductCredits(req.user!.userId, ServiceType.TEXT, cost, 'Segment Re-spin');

        return res.json({ success: true, data: { segment: newSegment } });
    } catch (error: any) {
        Logger.error('Re-spin error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to re-spin segment' });
    }
});

// PATCH /api/projects/:id/storyboard/update-segment
router.patch('/:id/storyboard/update-segment', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project: any = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const { segment } = req.body;
        if (!segment?.order) return res.status(400).json({ success: false, error: 'Segment with order required' });

        const storyboard = project.storyboard || [];
        const idx = storyboard.findIndex((s: any) => s.order === segment.order);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Segment not found' });

        storyboard[idx] = { ...storyboard[idx], ...segment };
        project.storyboard = storyboard;
        project.markModified('storyboard');
        await project.save();

        return res.json({ success: true, data: { segment: storyboard[idx] } });
    } catch (error: any) {
        Logger.error('Update segment error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update segment' });
    }
});

router.post(['/:id/analyze', '/:id/analysis'], licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost(AIModelType.TEXT);
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

        const videoStyle = project.videoStyle || 'Cinematic';

        const googleProvider: any = await aiManager.getProvider('google') as GeminiClient;
        const voices = await googleProvider.listVoices();
        const voiceList = voices.map((v: any) => `- ${v.id}: ${v.description} (${v.gender})`).join('\n');

        const prompt = `Perform a deep cinematic analysis and audio direction of the script for the project: ${project.title}.
        Script Content: ${project.description}
        Requested Video Style: ${videoStyle} (STRICTLY ADHERE TO THIS STYLE)
        
        ${technicalGrounding}
        
        INSTRUCTIONS:
        - MANDATORY AESTHETIC ALIGNMENT: Ensure all character descriptions, visual world rules (lighting, physics), and palette STRICTLY align with the ${videoStyle} style.
        - Physical Consistency: Provide EXTREMELY detailed physical traits (eyes, hair, costume, species, body_build) for later image generation.
        - Casting & TTS: Assign a Gemini TTS Voice ID for each character based on their personality.
        - TTS Configuration: Specify "pitch" (-5.0 to 5.0) and "rate" (0.5 to 2.0) to further refine the character's voice.
        - Audio Direction: Extract detailed music moods, sound effects, and ambience cues.

        ${voiceList}
        
        Extract:
        1. A comprehensive list of characters with "char_id", "name", description, and detailed traits.
        2. A structured breakdown of visuals (palette, characteristics, camera style, lighting, physics).
        3. Detailed audio requirements (ambience, sfx, music themes).
        4. A summary of key dialogue sequences with delivery cues.
        
        Return in JSON format:
        {
          "genre": "",
          "mood": "",
          "summary": "",
          "characters": [ 
            { 
              "char_id": "STRICTLY UNIQUE snake_case ID (e.g., CHAR_KAI)", 
              "name": "", 
              "description": "",
              "species": "",
              "gender": "male|female|neutral",
              "age": "",
              "body_build": "",
              "face_shape": "",
              "hair": "color and style",
              "eyes": "color and shape",
              "skin_or_fur_color": "",
              "signature_feature": "",
              "outfit_top": "",
              "outfit_bottom": "",
              "props": "",
              "voice_personality": "Describe voice tone and accent",
              "tts_config": {
                "voice_id": "Zephyr|Puck|...",
                "pitch": 0.0,
                "rate": 1.0
              }
            } 
          ],
          "visuals": { 
            "palette": "", 
            "characteristics": "", 
            "camera": "", 
            "lighting": "Detailed lighting model compatible with ${videoStyle}",
            "physics": "World physics model compatible with ${videoStyle}" 
          },
          "audio": { 
            "sfx": "Specific sound cues", 
            "music": "Mood and theme descriptions", 
            "ambience": "Environmental background" 
          },
          "detailedDialogue": [ { "characterName": "", "line": "", "delivery": "how they say it", "context": "" } ]
        }`;
        const analysis = await generateJSON<any>(prompt, undefined);

        // Enhance Mapping: Sync AI results back to project root fields
        if (analysis.summary || (analysis.analysis && analysis.analysis.summary)) {
            project.description = analysis.summary || analysis.analysis.summary;
        }
        
        // Populate Creative Brief if AI generated it
        if (analysis.creativeBrief) {
            project.creativeBrief = analysis.creativeBrief;
        } else if (analysis.analysis?.creativeBrief) {
            project.creativeBrief = analysis.analysis.creativeBrief;
        } else if (analysis.visuals) {
            // Mapping visuals to creativeBrief structure
            project.creativeBrief = {
                visualStyle: videoStyle,
                artDirection: analysis.visuals.characteristics || '',
                colorPalette: analysis.visuals.palette ? [analysis.visuals.palette] : [],
                lightingValues: analysis.visuals.lighting || '',
                generatedAt: new Date()
            };
        }

        project.scriptAnalysis = { 
            ...analysis, 
            analyzedAt: new Date() 
        };
        
        project.status = 'storyboard';
        await project.save();

        await deductCredits(req.user!.userId, ServiceType.TEXT, cost, `Project Analysis: ${project.title}`);

        res.json({ success: true, data: { analysis: project.scriptAnalysis, creativeBrief: project.creativeBrief, description: project.description } });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/chat - AI Refinement
router.post('/:id/chat', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost(AIModelType.TEXT);
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const { message } = req.body;
        const response = await generateText(`Directly respond to the user: ${message}. Context: Project ${project.title}`);

        await deductCredits(req.user!.userId, ServiceType.TEXT, cost, 'AI Chat Assistance');

        res.json({ success: true, data: { response } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/generate-visual-plan
router.post('/:id/generate-visual-plan', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost(AIModelType.TEXT);
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const stylePrompt = `Create a detailed visual art direction for ${project.title}. Style: ${project.videoStyle || 'Cinematic'}`;
        const brief = await generateJSON<any>(stylePrompt, undefined);

        project.creativeBrief = { ...brief, generatedAt: new Date() };
        await project.save();

        await deductCredits(req.user!.userId, ServiceType.TEXT, cost, `Visual Plan: ${project.title}`);

        res.json({ success: true, data: { creativeBrief: project.creativeBrief } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/generate-storyboard
router.post('/:id/generate-storyboard', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost(AIModelType.TEXT); // Storyboard is complex but text-based
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

        await deductCredits(req.user!.userId, ServiceType.TEXT, cost, `Storyboard Generation: ${project.title}`);

        res.json({ success: true, data: { storyboard: project.storyboard } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETED legacy publish route - functionality merged into consolidated /publish

// POST /api/projects/:id/stream - Initiate Ant Media broadcast
router.post('/:id/stream', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.publish?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { streamId, accountId } = req.body;
        // const { antMediaService } = await import('../utils/AntMedia.js');
        // const { getSignedS3Url } = await import('../utils/s3.js');
        // const { UserPlatformAccount } = await import('../models/UserPlatformAccount.js');

        // Dynamically resolve AMS config from connected platform accounts
        let amsAccount = null;
        if (accountId) {
            amsAccount = await UserPlatformAccount.findOne({ _id: accountId, userId: req.user!.userId, isActive: true });
        }
        if (!amsAccount) {
            amsAccount = await UserPlatformAccount.findOne({ userId: req.user!.userId, platform: 'ant-media', isActive: true });
        }

        const amsConfig = amsAccount ? {
            baseUrl: amsAccount.credentials?.serverUrl || amsAccount.rtmpUrl,
            appName: amsAccount.credentials?.appName || amsAccount.accountName || 'LiveApp',
            email: amsAccount.credentials?.email,
            password: amsAccount.credentials?.password
        } : undefined;

        await antMediaService.authenticate(amsConfig);

        const videoUrl = await getSignedS3Url(project.publish.s3Key);
        const broadcast = await antMediaService.createBroadcast({
            name: project.title || 'AntStudio Stream',
            streamId: streamId || `antflow-${project._id}`,
            type: 'streamSource',
            streamUrl: videoUrl
        }, amsConfig);

        if (!broadcast || !broadcast.streamId) throw new Error("Failed to create stream source on Ant Media Server");
        await antMediaService.startStreamSource(broadcast.streamId, amsConfig);

        WebhookService.dispatch(req.user!.userId, 'stream.started', {
            projectId: project._id,
            streamId: broadcast.streamId,
            name: project.title
        });

        res.json({ success: true, data: { streamId: broadcast.streamId } });
    } catch (error: any) {
        Logger.error('Ant Media stream initiation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/vod - Save project final video as VoD to Ant Media Server
router.post('/:id/vod', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.publish?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { accountId } = req.body;
        // const { antMediaService } = await import('../utils/AntMedia.js');
        // const { getSignedS3Url } = await import('../utils/s3.js');
        // const { UserPlatformAccount } = await import('../models/UserPlatformAccount.js');

        let amsAccount = null;
        if (accountId) {
            amsAccount = await UserPlatformAccount.findOne({ _id: accountId, userId: req.user!.userId, isActive: true });
        }
        if (!amsAccount) {
            amsAccount = await UserPlatformAccount.findOne({ userId: req.user!.userId, platform: 'ant-media', isActive: true });
        }

        const amsConfig = amsAccount ? {
            baseUrl: amsAccount.credentials?.serverUrl || amsAccount.rtmpUrl,
            appName: amsAccount.credentials?.appName || amsAccount.accountName || 'LiveApp',
            email: amsAccount.credentials?.email,
            password: amsAccount.credentials?.password
        } : undefined;

        await antMediaService.authenticate(amsConfig);

        const videoUrl = await getSignedS3Url(project.publish.s3Key);
        const vod = await antMediaService.uploadVoD({
            name: `${project.title || 'AntStudio Video'}.mp4`,
            streamUrl: videoUrl
        }, undefined, amsConfig);

        if (!vod) throw new Error("Failed to save VoD on Ant Media Server");

        res.json({ success: true, data: vod });
    } catch (error: any) {
        Logger.error('Ant Media VoD save failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/publish - Finalizes project with client-side output and server-side processing
router.post('/:id/publish', rbacMiddleware(Permission.PROJECT_EDIT), upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
    let tempDir = '';
    let tempVideoPath = '';
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const videoFile = files['video']?.[0];
        const thumbFile = files['thumbnail']?.[0];
        const previewFile = files['preview']?.[0];

        if (!videoFile) return res.status(400).json({ success: false, error: 'Video file is required' });

        // Save to temporary file for FFmpeg with correct extension
        tempDir = path.join(os.tmpdir(), `antflow_pub_${projectId}_${Date.now()}`);
        if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

        if (thumbFile) {
            await writeFile(path.join(tempDir, 'thumb.jpg'), thumbFile.buffer);
        }
        if (previewFile) {
            await writeFile(path.join(tempDir, 'preview.mp4'), previewFile.buffer);
        }
        
        const isWebm = videoFile.mimetype?.includes('webm') || videoFile.originalname?.endsWith('.webm');
        const fileExt = isWebm ? '.webm' : '.mp4';
        tempVideoPath = path.join(tempDir, `input${fileExt}`);
        await writeFile(tempVideoPath, videoFile.buffer);

        // 1. Extract Metadata and Generate Assets
        const processed = await processVideo(tempVideoPath, projectId);

        // 2. Upload Everything to S3
        const finalKey = isWebm ? `projects/${projectId}/final.webm` : S3KeyGenerator.finalVideo(projectId);
        const thumbKey = `projects/${projectId}/publish/thumbnail.jpg`;
        const previewKey = `projects/${projectId}/publish/preview.mp4`;

        await Promise.all([
            uploadToS3(finalKey, videoFile.buffer, videoFile.mimetype),
            uploadToS3(thumbKey, fs.readFileSync(processed.thumbnailPath), 'image/jpeg'),
            uploadToS3(previewKey, fs.readFileSync(processed.previewPath), 'video/mp4')
        ]);

        // 3. Update Project State
        project.status = 'completed';
        project.publish = {
            s3Key: finalKey,
            thumbnailKey: thumbKey,
            previewKey: previewKey,
            duration: processed.duration,
            resolution: processed.resolution,
            fileSize: videoFile.size,
            generatedAt: new Date()
        };

        await project.save();

        // Notify
        // const { socketServer } = await import('../services/streaming/SocketServer.js');
        socketServer.emitProjectUpdate(req.user!.userId, projectId, {
            type: 'publish_ready',
            result: {
                s3Key: finalKey,
                duration: processed.duration
            }
        });

        res.json({
            success: true,
            data: {
                message: 'Project published successfully with processed assets',
                publish: project.publish,
                project: project
            }
        });

    } catch (error: any) {
        Logger.error('[Publish] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Cleanup temp files safely after Windows file locks release
        if (tempDir) {
            const dirToDelete = tempDir;
            setTimeout(() => {
                if (fs.existsSync(dirToDelete)) {
                    try {
                        fs.rmSync(dirToDelete, { recursive: true, force: true });
                    } catch (e) {}
                }
            }, 500);
        }
    }
});

// POST /api/projects/:id/syndicate-final - Syndicate final montage to social media
router.post('/:id/syndicate-final', rbacMiddleware(Permission.PROJECT_EDIT), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { caption, hashtags } = req.body;

        // const { socialSyndicationService } = await import('../services/streaming/SocialSyndicationService.js');
        const result = await socialSyndicationService.syndicateFinalVideo(projectId, { caption, hashtags });

        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[SyndicateFinal] Error:', error);
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
        Logger.error('Delete project error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete project' });
    }
});

// POST /api/projects/:id/segments/:segmentId/generate-voiceover - Generate TTS voiceover for a segment
router.post('/:id/segments/:segmentId/generate-voiceover', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId, segmentId } = req.params;
        const { text, language, voiceId, providerId, modelId, options = {} } = req.body;
        const segmentOrder = parseInt(segmentId);

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s.order === segmentOrder) as any;
        if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });

        const ttsText = text || segment.voiceover;
        if (!ttsText || !ttsText.trim()) {
            return res.status(400).json({ success: false, error: 'No voiceover text for this segment' });
        }

        // Resolve character voice config from dialogue or default to project language
        let resolvedVoiceId = voiceId;
        let resolvedProviderId = providerId;
        let pitch = 0;

        // Try to match character from dialogue if no voiceId provided
        if (!resolvedVoiceId && segment.detailedDialogue?.length > 0) {
            const charId = segment.detailedDialogue[0]?.characterId;
            const character = project.scriptAnalysis?.characters?.find((c: any) => c.char_id === charId);
            if (character?.tts_config) {
                resolvedVoiceId = character.tts_config.voice_id;
                resolvedProviderId = character.tts_config.provider || providerId;
                pitch = character.tts_config.base_pitch || 0;
            }
        }

        // Mark as generating
        segment.generatedAudio = { s3Key: '', status: 'generating', generatedAt: new Date() };
        await project.save();

        // const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
        // const mgr = AIServiceManager.getInstance();
        // await mgr.initialize();

        const result = await aiManager.generateAudio(ttsText, modelId, resolvedProviderId, {
            voice: resolvedVoiceId,
            pitch,
            language: language || project.scriptAnalysis?.language || 'English',
            ...options
        });

        let audioBuffer: Buffer;
        let mimeType = 'audio/mpeg';
        if (result?.media?.url) {
            if (result.media.url.startsWith('data:')) {
                const b64 = result.media.url.split(',')[1];
                audioBuffer = Buffer.from(b64, 'base64');
            } else {
                // const { getFileBuffer } = await import('../utils/AIGenerator.js');
                audioBuffer = await getFileBuffer(result.media.url);
            }
            mimeType = result.media.mimeType || 'audio/mpeg';
        } else if (result?.buffer) {
            audioBuffer = result.buffer;
        } else if (Buffer.isBuffer(result)) {
            audioBuffer = result;
        } else {
            throw new Error('Unexpected audio generation result format');
        }

        const s3Key = S3KeyGenerator.audio(projectId, 'voice', segmentOrder.toString(), 'mp3');
        await uploadToS3(s3Key, audioBuffer, mimeType);

        segment.generatedAudio = { s3Key, status: 'completed', generatedAt: new Date() };
        project.markModified('storyboard');
        await project.save();

        res.json({ success: true, data: { generatedAudio: segment.generatedAudio } });

    } catch (error: any) {
        Logger.error('[generate-voiceover] Error:', error);
        // Try to mark as failed if possible
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/segments/:segmentId/captions - Generate captions for segment
router.post('/:id/segments/:segmentId/captions', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId, segmentId } = req.params;
        const segmentOrder = parseInt(segmentId);

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s.order === segmentOrder) as any;
        if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });

        // const { autoCaptionService } = await import('../services/ai/AutoCaptionService.js');
        let captions: any[] = [];

        // Determine source media (Voiceover Audio > Video)
        let s3Key = segment.generatedAudio?.s3Key;
        let mimeType = 'audio/mp3';

        if (!s3Key && segment.generatedVideo?.s3Key) {
            s3Key = segment.generatedVideo.s3Key;
            mimeType = 'video/mp4';
        }

        if (s3Key) {
            try {
                const storage = await StorageFactory.getActiveAdapter();
                const stream = await storage.getFileStream(s3Key);
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                captions = await autoCaptionService.generateCaptions(buffer, mimeType);
            } catch (mediaErr: any) {
                Logger.warn(`[generate-captions] Media transcription failed, using text fallback: ${mediaErr.message}`);
            }
        }

        // Fallback: If no media or transcription returned empty, estimate from script text
        if (!captions || captions.length === 0) {
            const text = segment.voiceover || segment.description || segment.title || '';
            captions = autoCaptionService.generateTextBasedCaptions(text);
        }

        // Update Project
        segment.captions = captions;
        project.markModified('storyboard'); 
        await project.save();

        res.json({ success: true, data: { captions } });

    } catch (error: any) {
        Logger.error('Caption generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/projects/:id/segments/:segmentId/captions - Manually update/edit captions for segment
router.put('/:id/segments/:segmentId/captions', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId, segmentId } = req.params;
        const { captions } = req.body;
        const segmentOrder = parseInt(segmentId);

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s.order === segmentOrder) as any;
        if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });

        segment.captions = Array.isArray(captions) ? captions : [];
        project.markModified('storyboard');
        await project.save();

        res.json({ success: true, data: { captions: segment.captions } });
    } catch (error: any) {
        Logger.error('Caption update error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/generate-all-captions - Generate captions for all segments
router.post('/:id/generate-all-captions', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId } = req.params;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segments = project.storyboard?.segments || [];
        if (segments.length === 0) {
            return res.status(400).json({ success: false, error: 'No segments found' });
        }

        // const { autoCaptionService } = await import('../services/ai/AutoCaptionService.js');
        const storage = await StorageFactory.getActiveAdapter();

        let successCount = 0;
        for (const segment of segments) {
            // Determine source media (Voiceover Audio > Video)
            let s3Key = segment.generatedAudio?.s3Key;
            let mimeType = 'audio/mp3';

            if (!s3Key && segment.generatedVideo?.s3Key) {
                s3Key = segment.generatedVideo.s3Key;
                mimeType = 'video/mp4';
            }

            let captions: any[] = [];
            if (s3Key) {
                try {
                    const stream = await storage.getFileStream(s3Key);
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    captions = await autoCaptionService.generateCaptions(buffer, mimeType);
                } catch (e: any) {
                    Logger.warn(`[generate-all-captions] Media transcription failed for segment ${segment.order}: ${e.message}`);
                }
            }

            if (!captions || captions.length === 0) {
                const text = segment.voiceover || segment.description || segment.title || '';
                captions = autoCaptionService.generateTextBasedCaptions(text);
            }

            segment.captions = captions;
            if (captions.length > 0) successCount++;
        }

        project.markModified('storyboard');
        await project.save();

        res.json({ success: true, data: { storyboard: project.storyboard, successCount } });

    } catch (error: any) {
        Logger.error('[generate-all-captions] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/assets/generate - Generate specific asset
router.post('/:id/assets/generate', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { assetName, description, type, segmentOrder, providerId, modelId, options = {}, characterNames, charIndex, generationType: bodyGenerationType } = req.body;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        // ─── HIGH FIDELITY PROMPT RESOLUTION ─────────────────────
        // const aiManager = AIServiceManager.getInstance();
        const translator = async (p: string) => await aiManager.generateText(p, undefined);

        // Resolve segment if provided (common for image/video/audio scene tasks)
        let segment: any = null;
        let prompt = description;
        if (bodyGenerationType != "character") {
            if (segmentOrder && project.storyboard?.segments) {
                segment = project.storyboard.segments.find((s: any) => s.order === segmentOrder);
                if (!segment) return res.status(404).json({ success: false, error: 'Segment not found' });
            }
        }
        else{
            if(!characterNames || characterNames.length === 0){
                return res.status(400).json({ success: false, error: 'Character names not provided' });
            }
            const charName = characterNames[0];
            const character = project.scriptAnalysis?.characters?.find((c: any) => c.name === charName);
            if (!character) return res.status(404).json({ success: false, error: 'Character not found' });
            const style = project.videoStyle || project.creativeBrief?.visualStyle || 'Cinematic, Photo-realistic';
            const language = project.scriptAnalysis?.language;
            prompt = await buildCharacterSheetPrompt(character, style, project.scriptAnalysis, language, translator);
        }
        
        if (!prompt && segment) {
            const payload = {
                ...segment,
                all_characters: project.scriptAnalysis?.characters || [],
                projectAnalysis: project.scriptAnalysis || {}
            };
            const prompts = await aiManager.generatePrompt(payload, type === 'image' ? 'segment' : type);
            prompt = (type === 'image' ? prompts.imagePrompt : (type === 'video' ? prompts.videoPrompt : (type === 'audio' ? prompts.audioPrompt : prompts.musicPrompt))) || description;
        }

        if (!prompt) {
            prompt = assetName || 'Generate asset';
        }

        // ─── IMAGE ────────────────────────────────────────────────
        if (type === 'image') {
            const generationType = bodyGenerationType || options.generationType || (segmentOrder ? 'scene' : 'character');
            
            // Resolve visual style fallback
            const finalStyle = options.videoStyle || project.videoStyle || project.creativeBrief?.visualStyle || 'Cinematic, Photo-realistic';

            let referenceImages: string[] = [];
            if(generationType != "character"){
                // VISUAL CONSISTENCY: Collect reference images for characters in this segment
                const charactersInScene = segment?.characters || characterNames || [];
                if (project.scriptAnalysis?.characters) {
                    for (const charName of charactersInScene) {
                        const char = project.scriptAnalysis.characters.find((c: any) => c.name === charName);
                        if (char?.referenceImage) {
                            referenceImages.push(char.referenceImage);
                        }
                    }
                }
                if (referenceImages.length > 0) {
                    Logger.info(`[assets/generate] Collected ${referenceImages.length} reference images for consistency grounding.`);
                }
            }

            const characterContext = generationType == "character" ? null : (project.scriptAnalysis?.characters || []);
            const projectAnalysis = generationType == "character" ? null : project.scriptAnalysis;
            const aspectRatio = generationType == "character" ? "1:1" : (options.aspectRatio || project.aspectRatio || '16:9');
            const result = await generateImage(prompt, projectId, assetName || `generated-${Date.now()}`, {
                generationType,
                characterContext: characterContext,
                projectAnalysis: projectAnalysis,
                videoStyle: finalStyle,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                aspectRatio: aspectRatio
            });


            if (segment) segment.sceneImage = result.s3Key;

            // Update character referenceImage if this is a character generation
            if (generationType === 'character' && characterNames?.length > 0 && project.scriptAnalysis?.characters) {
                for (const charName of characterNames) {
                    const character = project.scriptAnalysis.characters.find((c: any) => c.name === charName);
                    if (character) {
                        character.referenceImage = result.s3Key;
                        Logger.info(`[assets/generate] Updated referenceImage for character "${charName}" → ${result.s3Key}`);
                    }
                }
                project.markModified('scriptAnalysis');
            }
            else if(generationType == "scene"){
                // this is frame generation for segment
                project.storyboard?.segments?.forEach((seg: any) => {
                    if(seg.order == segmentOrder){
                        seg.sceneImage = result.s3Key;
                        project.markModified('storyboard');
                    }
                });
            }

            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({
                name: assetName || `Generated Asset ${Date.now()}`,
                description: prompt,
                type: 'image',
                status: 'ready',
                s3Key: result.s3Key,
                createdAt: new Date()
            });

            await project.save();
            return res.json({ success: true, data: { s3Key: result.s3Key, url: result.s3Key } });
        }

        // ─── VIDEO ────────────────────────────────────────────────
        if (type === 'video') {
            // Resolve visual consistency references
            const resolvedCharacterNames = characterNames || (segment?.characters) || [];
            const characterImages: string[] = [];

            if (resolvedCharacterNames.length > 0 && project.scriptAnalysis?.characters) {
                for (const name of resolvedCharacterNames) {
                    const char = project.scriptAnalysis.characters.find((c: any) => c.name === name);
                    if (char?.referenceImage) characterImages.push(char.referenceImage);
                }
            }

            let imageStart = segment?.sceneImage || options.imageUrl;
            let imageEnd: string | undefined = undefined;

            // Continuity: Use previous segment's result as start, or current as start and next as end
            if (segment && project.storyboard?.segments) {
                const currentIndex = project.storyboard.segments.findIndex((s: any) => s.order === segmentOrder);
                if (currentIndex > 0) {
                    const prevSegment = project.storyboard.segments[currentIndex - 1];
                    // If no current scene image, use previous as transition point
                    if (!imageStart && prevSegment.sceneImage) imageStart = prevSegment.sceneImage;
                }
                if (currentIndex < project.storyboard.segments.length - 1) {
                    const nextSegment = project.storyboard.segments[currentIndex + 1];
                    if (nextSegment.sceneImage) imageEnd = nextSegment.sceneImage;
                }
            }

            // Mark as generating immediately so the client can poll
            if (segment) {
                segment.generatedVideo = { s3Key: '', status: 'generating', generatedAt: new Date() };
                await project.save();
            }

            // const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            // const mgr = AIServiceManager.getInstance();
            // await mgr.initialize();

            let finalPrompt = prompt;
            if (segment) {
                // const { buildVeoVideoPrompt } = await import('../utils/PromptBuilder.js');
                finalPrompt = await buildVeoVideoPrompt(
                    segment,
                    project.scriptAnalysis?.characters || [],
                    project.scriptAnalysis,
                    'en',
                    async (p) => await aiManager.generateText(p, undefined)
                );
                Logger.info(`[assets/generate] Enriched prompt for segment ${segment.order}`);
            }

            const result = await aiManager.generateVideo(finalPrompt, modelId, providerId, {
                aspectRatio: options.aspectRatio || project.aspectRatio || '16:9',
                duration: segment?.duration || options.duration || 5,
                imageStart,
                imageEnd,
                characterImages,
                ...options
            });

            // Upload buffer to S3
            const segOrder = segment?.order ?? 0;
            const s3Key = segmentOrder
                ? S3KeyGenerator.sceneVideo(projectId, segOrder)
                : S3KeyGenerator.asset(projectId, 'video', `${Date.now()}`, 'mp4');
            await uploadToS3(s3Key, result.buffer, result.mimeType || 'video/mp4');

            if (segment) {
                // segment.generatedVideo = { s3Key, status: 'completed', generatedAt: new Date(), duration: segment.duration };
                project.storyboard?.segments?.forEach((seg: any) => {
                    if(seg.order == segmentOrder){
                        seg.generatedVideo = { s3Key, status: 'completed', generatedAt: new Date(), duration: segment.duration };
                        project.markModified('storyboard');
                    }
                });
            }

            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({ name: assetName || `Video ${Date.now()}`, description: prompt, type: 'video', status: 'ready', s3Key, createdAt: new Date() });

            await project.save();
            return res.json({ success: true, data: { s3Key, url: s3Key } });
        }

        // ─── AUDIO (TTS) ──────────────────────────────────────────
        if (type === 'audio') {
            const ttsText = prompt || (segment?.voiceover) || description;
            if (!ttsText) return res.status(400).json({ success: false, error: 'No text provided for audio generation' });

            if (segment) {
                segment.generatedAudio = { s3Key: '', status: 'generating', generatedAt: new Date() };
                await project.save();
            }

            // const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            // const mgr = AIServiceManager.getInstance();
            // await mgr.initialize();

            const result = await aiManager.generateAudio(ttsText, modelId, providerId, options);

            // Result can be { media: { url: 'data:...' } } or { buffer }
            let audioBuffer: Buffer;
            let mimeType = 'audio/mpeg';
            if (result?.media?.url) {
                if (result.media.url.startsWith('data:')) {
                    const b64 = result.media.url.split(',')[1];
                    audioBuffer = Buffer.from(b64, 'base64');
                } else {
                    // const { getFileBuffer } = await import('../utils/AIGenerator.js');
                    audioBuffer = await getFileBuffer(result.media.url);
                }
                mimeType = result.media.mimeType || 'audio/mpeg';
            } else if (result?.buffer) {
                audioBuffer = result.buffer;
            } else if (Buffer.isBuffer(result)) {
                audioBuffer = result;
            } else {
                throw new Error('Unexpected audio generation result format');
            }

            const s3Key = S3KeyGenerator.audio(projectId, 'voice', segmentOrder || `${Date.now()}`, 'mp3');
            await uploadToS3(s3Key, audioBuffer, mimeType);

            if (segment) {
                segment.generatedAudio = { s3Key, status: 'completed', generatedAt: new Date() };
            }

            await project.save();
            return res.json({ success: true, data: { s3Key, url: s3Key } });
        }

        // ─── MUSIC ────────────────────────────────────────────────
        if (type === 'music') {
            // const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            // const mgr = AIServiceManager.getInstance();
            // await mgr.initialize();

            const result = await aiManager.generateMusic(prompt, modelId, providerId, options);

            let musicBuffer: Buffer;
            let mimeType = 'audio/mpeg';
            if (result?.media?.url) {
                if (result.media.url.startsWith('data:')) {
                    const b64 = result.media.url.split(',')[1];
                    musicBuffer = Buffer.from(b64, 'base64');
                } else {
                    // const { getFileBuffer } = await import('../utils/AIGenerator.js');
                    musicBuffer = await getFileBuffer(result.media.url);
                }
                mimeType = result.media.mimeType || 'audio/mpeg';
            } else if (result?.buffer) {
                musicBuffer = result.buffer;
            } else if (Buffer.isBuffer(result)) {
                musicBuffer = result;
            } else {
                throw new Error('Unexpected music generation result format');
            }

            const s3Key = S3KeyGenerator.audio(projectId, 'bgm', `${Date.now()}`, 'mp3');
            await uploadToS3(s3Key, musicBuffer, mimeType);

            // Push to project.musics array (append new tracks)
            if (!project.musics) project.musics = [];
            project.musics.push({ id: crypto.randomUUID(), s3Key, volume: options.volume ?? 0.5 });
            project.markModified('musics');

            if (!project.visualAssets) project.visualAssets = [];
            project.visualAssets.push({
                name: assetName || `Background Music ${Date.now()}`,
                description: prompt || 'Generated BGM',
                type: 'audio',
                status: 'ready',
                s3Key,
                createdAt: new Date()
            });

            await project.save();
            return res.json({ success: true, data: { s3Key, url: s3Key } });
        }

        return res.status(400).json({ success: false, error: `Unsupported asset type: ${type}` });

    } catch (error: any) {
        Logger.error('[assets/generate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST /api/projects/:id/assets/upload - Upload asset
router.post('/:id/assets/upload',
    licenseGating(LicenseType.TRIAL),
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
                    const segment = project.storyboard.segments.find((s: any) => s.order === entityId);
                    if (segment) {
                        segment.sceneImage = uploadResult.key;
                        project.markModified('storyboard');
                    }
                } else if (entityType === 'character' && project.scriptAnalysis && project.scriptAnalysis.characters) {
                    const character = project.scriptAnalysis.characters.find((c: any) => c.name === entityId || c.char_id === entityId); // assuming entityId matches name or ID
                    if (character) {
                        character.referenceImage = uploadResult.key;
                        project.markModified('scriptAnalysis');
                    }
                }
            } else {
                // Generic Asset Upload (e.g. Recordings)
                const assetType = file.mimetype.startsWith('video/') ? 'video' : file.mimetype.startsWith('audio/') ? 'audio' : 'image';
                const description = req.body.description || 'Uploaded asset';
                
                if (!project.visualAssets) project.visualAssets = [];
                project.visualAssets.push({
                    name: file.originalname,
                    description,
                    type: assetType,
                    status: 'ready',
                    s3Key: uploadResult.key,
                    metadata: {
                        originalName: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype
                    },
                    createdAt: new Date()
                });

                // UNIFICATION: Also create a Global Media record so it appears in Resources hub
                // If it's a recording from studio, mark it as 'recording' purpose
                const isRecording = description.toLowerCase().includes('recording');
                
                await Media.create({
                    userId: req.user!.userId,
                    key: uploadResult.key,
                    fileName: file.originalname,
                    contentType: file.mimetype,
                    size: file.size,
                    bucket: configService.aws.bucketName,
                    purpose: isRecording ? 'recording' : 'project_asset',
                    metadata: {
                      projectId: project._id,
                      projectTitle: project.title,
                      originalName: file.originalname
                    }
                });
            }
            await project.save();

            res.json({ success: true, data: { s3Key: uploadResult.key, url: uploadResult.key } });
        } catch (error: any) {
            Logger.error('Asset upload error:', error);
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

// POST /api/projects/:id/storyboard/generate-assets - Batch generate all segment videos
router.post('/:id/storyboard/generate-assets', licenseGating(LicenseType.TRIAL), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project || !project.storyboard?.segments) {
            return res.status(404).json({ success: false, error: 'Project or storyboard segments not found' });
        }

        // const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
        // const mgr = AIServiceManager.getInstance();
        // await mgr.initialize();

        // Start batch generation in background
        const generateBatch = async () => {
            for (const segment of project.storyboard!.segments as any[]) {
                try {
                    // Skip if already generating or completed
                    if (segment.generatedVideo?.status === 'completed' || segment.generatedVideo?.status === 'generating') continue;

                    segment.generatedVideo = { s3Key: '', status: 'generating', generatedAt: new Date() };
                    project.markModified('storyboard');
                    await project.save();

                    const allCharacters = project.scriptAnalysis?.characters || [];
                    // const { buildVeoVideoPrompt } = await import('../utils/PromptBuilder.js');
                    const videoPrompt = await buildVeoVideoPrompt(
                        segment, 
                        allCharacters, 
                        project.scriptAnalysis, 
                        'en', 
                        async (p) => await aiManager.generateText(p, undefined)
                    );

                    const result = await aiManager.generateVideo(videoPrompt, undefined, undefined, {
                        aspectRatio: project.aspectRatio || '16:9',
                        duration: segment.duration || 5,
                        imageStart: segment.sceneImage
                    });

                    // const { uploadToS3 } = await import('../utils/s3.js');
                    const s3Key = S3KeyGenerator.sceneVideo(projectId, segment.order);
                    await uploadToS3(s3Key, result.buffer, result.mimeType || 'video/mp4');

                    segment.generatedVideo = { s3Key, status: 'completed', generatedAt: new Date(), duration: segment.duration };
                    project.markModified('storyboard');
                    await project.save();
                    
                    // const { socketServer } = await import('../services/streaming/SocketServer.js');
                    socketServer.emitProjectUpdate(req.user!.userId, projectId, {
                        type: 'segment_video_ready',
                        segmentOrder: segment.order
                    });
                    
                    Logger.info(`[BatchGen] Completed segment ${segment.order} for project ${projectId}`);
                } catch (err: any) {
                    Logger.error(`[BatchGen] Failed segment ${segment.order}:`, err.message);
                    segment.generatedVideo = { s3Key: '', status: 'failed', generatedAt: new Date() };
                    project.markModified('storyboard');
                    await project.save();

                    // const { socketServer } = await import('../services/streaming/SocketServer.js');
                    socketServer.emitProjectUpdate(req.user!.userId, projectId, {
                        type: 'segment_video_failed',
                        segmentOrder: segment.order
                    });
                }
            }
        };

        generateBatch(); // Non-blocking

        res.json({ success: true, message: 'Batch generation started' });
    } catch (error: any) {
        Logger.error('Batch generation start error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
