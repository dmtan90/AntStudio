import { Router, Response } from 'express';
import multer from 'multer';
import { connectDB } from '../utils/db.js';
import { Project } from '../models/Project.js';
import { Media } from '../models/Media.js';
import { monitoringService } from '../services/monitoringService.js';
import { Logger } from '../utils/Logger.js';
import { WebhookService } from '../services/WebhookService.js';
import { moderationService } from '../services/ModerationService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
// import { checkLicenseStatus, checkProjectLimit } from '../middleware/license.js';
import { generateText, generateJSON, generateImage } from '../utils/AIGenerator.js';
import { generateStoryboardIteratively } from '../services/iterativeStoryboard.js';
import { User } from '../models/User.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import { checkProjectLimit, licenseGating } from '../middleware/licenseGating.js';
import { hasSufficientCredits, deductCredits, getCreditCost } from '../utils/credits.js';
import { uploadToS3, S3KeyGenerator, getS3Client } from '../utils/s3.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { AnalyticsService } from '../services/AnalyticsService.js';
import ffmpeg from 'fluent-ffmpeg';
import { config } from '../utils/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { GeminiClient } from '../integrations/ai/GeminiClient.js';
import { getAdminSettings } from '../models/AdminSettings.js';
import { projectContext } from '../utils/ProjectContext.js';
import { buildCharacterSheetPrompt } from '../utils/PromptBuilder.js';
import { configService } from '../utils/configService.js';

ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Helper for metadata extraction and preview generation
async function processVideo(videoPath: string, projectId: string) {
    const tempDir = path.join(os.tmpdir(), `antflow_${projectId}_${Date.now()}`);
    if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

    const thumbnailPath = path.join(tempDir, 'thumb.jpg');
    const previewPath = path.join(tempDir, 'preview.mp4');

    // 1. Get Metadata
    const metadata: any = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err : any, data : any) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const duration = metadata.format.duration || 0;
    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown';

    // 2. Generate Thumbnail (at the start or middle)
    await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [duration > 1 ? 1 : 0],
                filename: 'thumb.jpg',
                folder: tempDir,
                size: '1280x?'
            })
            .on('end', () => resolve())
            .on('error', (err: any) => reject(err));
    });

    // 3. Generate Preview (5 seconds loop)
    await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
            .setStartTime(0)
            .setDuration(Math.min(5, duration))
            .size('640x?')
            .on('end', () => resolve())
            .on('error', (err: any) => reject(err))
            .save(previewPath);
    });

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
router.post('/', licenseGating('trial'), checkProjectLimit, rbacMiddleware(Permission.PROJECT_CREATE), async (req: any, res: Response) => {
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
router.post('/preview', licenseGating('trial'), upload.array('files'), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { topic, history, targetDuration, stage, script, analysis, language, videoStyle } = req.body;
        
        // Topic is required at minimum for the first stage
        if (!topic && !script && !analysis) return res.status(400).json({ success: false, error: 'Topic, script, or analysis is required' });

        const cost = await getCreditCost('text');
        const hasCredits = await hasSufficientCredits(req.user!.userId, cost);
        if (!hasCredits) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        let currentLanguage = language;
        if (!currentLanguage && topic) {
            const langPrompt = `Detect the language of the following text. Respond with only the language name in English.\n\nText: ${topic.substring(0, 500)}`;
            currentLanguage = await generateText(langPrompt);
        } else if (!currentLanguage) {
            currentLanguage = 'English';
        }

        const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

        // --- STAGE 1: SCRIPT GENERATION ---
        if (stage === 'script' || (!stage && topic && !script)) {
            const scriptPrompt = `You are a professional Screenwriter and Audio Director. 
            Create a cinematic screenplay based on the following topic/prompt.
            Topic: ${topic}
            Requested Video Style: ${videoStyle || 'Cinematic'}
            
            ${technicalGrounding ? `
            ### FORMAT & STRUCTURE REFERENCE ###
            ${technicalGrounding}
            
            IMPORTANT:
            - Create NEW characters, locations, and a unique plot for the topic "${topic}".
            - DO NOT reuse the specific names or personalities from the reference above (e.g., Ông Chính, Bà Chính) unless specifically relevant to your new topic.
            - Follow the technical DEPTH and ORGANIZATION (e.g., [CHAR_X] placeholders, PBR material descriptions) shown in the reference.
            ` : ''}
            
            The script MUST be structured with:
            1. "SCENE X: [LOCATION] - [TIME]"
            2. [ACTION]: Vivid descriptions of world and character movement.
            3. [DIALOGUE]: Explicit spoken lines for characters. Use [CHARACTER_NAME]: "Line" (delivery style).
            4. [AUDIO]: Descriptive cues for background music moods and sound effects.

            Ensure the script is detailed enough for a ${targetDuration || 60} second video.
            Write the screenplay with the visual language of the ${videoStyle || 'Cinematic'} style in mind.
            Respond in ${currentLanguage}.
            
            Provide only the script content.`;

            const generatedScript = await generateText(scriptPrompt, 'gemini-2.5-flash');
            
            // Deduct Credits (Success)
            await deductCredits(req.user!.userId, 'text' as any, cost, 'Project Script Generation');

            return res.json({
                success: true,
                data: {
                    stage: 'script',
                    script: generatedScript,
                    language: currentLanguage
                }
            });
        }


            // --- STAGE 2: ANALYSIS GENERATION ---
        if (stage === 'analysis' || (!stage && script && !analysis)) {
            const analysisLanguage = language || currentLanguage || 'en';
                
                // Get technical grounding for format and depth
                const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

                const analysisPrompt = `You are a professional Creative Director and Casting Agent. 
                Analyze the following cinematic script to extract a comprehensive project vision. Respond in ${analysisLanguage}.
                
                ${technicalGrounding}

                CURRENT SCRIPT TO ANALYZE:
                """
                ${script}
                """

                ### STRICT JSON RULES ###
                1. Capture every character with high cinematic detail (PBR materials, skin texture, lighting).
                2. Extract EVERY spoken line into "detailedDialogue".
                3. Match the TECHNICAL DEPTH shown in the GOLD-STANDARD REFERENCE above.
                4. Escape all double quotes in strings (e.g., use \\" instead of ").
                5. Ensure the JSON structure is perfectly balanced. Do not include any text before or after the JSON block.
                6. DO NOT mention "Ông Chính", "Cờ tướng", or anything from the reference unless it is in the CURRENT SCRIPT.

                Return in JSON format:
                {
                  "isComplete": true,
                  "analysis": {
                    "summary": "Brief project overview (Update the project description with this)",
                    "overview": {
                      "genre": "",
                      "mood": "",
                      "duration": "Total playtime in seconds (e.g. 30s)",
                      "setting": "Primary location and time period",
                      "themes": "Main themes/messages",
                      "visualStyle": "Describe the core visual direction",
                      "soundDesign": "General audio direction"
                    },
                    "structure": {
                        "act1": "Summary of the setup/beginning",
                        "act2": "Summary of the conflict/middle",
                        "act3": "Summary of the resolution/ending"
                    },
                    "characters": [ {
                        "char_id": "STRICTLY UNIQUE snake_case ID (e.g. char_main_aya)",
                        "name": "Full Character Name",
                        "description": "Short 1-2 sentence summary of the character",
                        "species": "Human/Robot/etc",
                        "gender": "Male/Female/Other",
                        "age": "Approximate age",
                        "body_build": "E.g., athletic, wiry, stocky",
                        "face_shape": "E.g., heart-shaped, square jaw",
                        "hair": "color and style",
                        "eyes": "color and shape",
                        "skin_or_fur_color": "E.g., tanned, pale, metallic silver",
                        "signature_feature": "E.g., a glowing tattoo, a specific scar",
                        "outfit_top": "Material and style",
                        "outfit_bottom": "Material and style",
                        "props": "Key objects they carry",
                        "personality": "Core traits", 
                        "voice_profile": "Short summary of voice (e.g. Deep, authoritative)",
                        "voice_personality": "DETAILED tone/accent description for AI casting",
                        "tts_config": {
                            "voice_id": "Zephyr|Puck|Algenib|...",
                            "pitch": 0.0,
                            "rate": 1.0
                        }
                    } ],

                    "scenes": [
                        {
                            "id": 1,
                            "title": "Scene Name",
                            "description": "Visual details of the scene (Adhere to the High-Fidelity examples)",
                            "timestamp": "e.g. 00:00 - 00:10",
                            "audio_visual_cues": "Specific SFX/Music cues for this scene"
                        }
                    ],

                    "visuals": { 
                        "palette": "Primary colors", 
                        "characteristics": "Cinematic qualities", 
                        "camera": "Lenses and movement style",
                        "visualStyle": { "category": "${videoStyle || 'Cinematic'}", "label": "${videoStyle || 'Cinematic'}", "description": "", "reference": "" },
                        "visualWorldRules": { 
                            "physics": "Describe physics compatible with style", 
                            "lighting": "Describe lighting compatible with style (e.g. Volumetric, High-Contrast)",
                            "colorHarmony": [ { "hex": "", "name": "", "usage": "" } ]
                        }
                    },
                    "audio": { 
                        "sfx": "Detailed sound effect requirements", 
                        "music": "Detailed background music description (mood, tempo, instruments)", 
                        "ambience": "Background environment sounds" 
                    },
                    "detailedDialogue": [ 
                        { 
                            "characterId": "char_id from character list",
                            "characterName": "Full name", 
                            "line": "EXACT script line", 
                            "delivery": "e.g., excitedly, whispering",
                            "context": "Short description of the scene context"
                        } 
                    ]
                  },
                  "creativeBrief": { 
                    "title": "", 
                    "videoType": "e.g., Brand Film, Explainer, etc.", 
                    "visualStyle": "${videoStyle || 'Cinematic'}",
                    "narrativeDriver": "Main conflict or goal",
                    "tone": "Emotional atmosphere",
                    "pacing": "e.g., fast-cut, slow and rhythmic",
                    "soundDesign": "Instructions for SFX and music",
                    "targetAudience": "Who is this for?"
                  },
                  "summary": "Brief project overview",
                  "closingMessage": "Friendly sign-off"
                }`;

            const finalAnalysis = await generateJSON<any>(analysisPrompt, 'gemini-2.5-flash');
            
            // Deduct Credits (Success)
            await deductCredits(req.user!.userId, 'text' as any, cost, 'Project Vision Analysis');

            return res.json({
                success: true,
                data: {
                    stage: 'analysis',
                    language: analysisLanguage,
                    isComplete: finalAnalysis.isComplete,
                    analysis: finalAnalysis.analysis,
                    creativeBrief: finalAnalysis.creativeBrief,
                    summary: finalAnalysis.summary,
                    closingMessage: finalAnalysis.closingMessage
                }
            });
        }

        // --- STAGE 3: STORYBOARD GENERATION ---
        if (stage === 'storyboard' || (!stage && analysis)) {
            const currentAnalysis = analysis || {};
            const storyboard = await generateStoryboardIteratively(
                script || topic,
                currentAnalysis,
                targetDuration ? parseInt(targetDuration as string) : 60,
                currentLanguage
            );

            // Deduct Credits (Success)
            await deductCredits(req.user!.userId, 'text' as any, cost, 'Project Storyboard Generation');

            res.json({
                success: true,
                data: {
                    stage: 'storyboard',
                    language: currentLanguage,
                    storyboard: storyboard.segments,
                    totalDuration: storyboard.totalDuration,
                    isComplete: true
                }
            });
            return;
        }

        // Fallback (legacy or unknown combination)
        res.status(400).json({ success: false, error: 'Invalid stage or missing data' });


    } catch (error: any) {
        Logger.error('Preview error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate preview' });
    }
});

// POST /api/projects/:id/analyze - Deep analysis
router.post(['/:id/analyze', '/:id/analysis'], licenseGating('trial'), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const cost = await getCreditCost('text');
        if (!await hasSufficientCredits(req.user!.userId, cost)) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

        const videoStyle = project.videoStyle || 'Cinematic';

        const settings = await getAdminSettings();
        const geminiConfig = settings?.aiSettings?.providers?.find((p: any) => p.id === 'google');
        const apiKey = geminiConfig?.apiKey || process.env.GOOGLE_API_KEY;
        const client = new GeminiClient({ apiKey });
        const voices = await client.listVoices();
        const voiceList = voices.map(v => `- ${v.id}: ${v.description} (${v.gender})`).join('\n');

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
        const analysis = await generateJSON<any>(prompt, 'gemini-2.5-flash');

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

        await deductCredits(req.user!.userId, 'text' as any, cost, `Project Analysis: ${project.title}`);

        res.json({ success: true, data: { analysis: project.scriptAnalysis, creativeBrief: project.creativeBrief, description: project.description } });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/chat - AI Refinement
router.post('/:id/chat', licenseGating('trial'), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
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
router.post('/:id/generate-visual-plan', licenseGating('trial'), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
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
router.post('/:id/generate-storyboard', licenseGating('trial'), rbacMiddleware(Permission.PROJECT_EDIT), async (req: any, res: Response) => {
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

// DELETED legacy publish route - functionality merged into consolidated /publish

// POST /api/projects/:id/stream - Initiate Ant Media broadcast
router.post('/:id/stream', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.publish?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { streamId } = req.body;
        const { antMediaService } = await import('../utils/antMedia.js');
        const { getSignedS3Url } = await import('../utils/s3.js');

        const authenticated = await antMediaService.authenticate();
        if (!authenticated) throw new Error("Failed to authenticate with AMS");

        const videoUrl = await getSignedS3Url(project.publish.s3Key);
        const broadcast = await antMediaService.createBroadcast({
            name: project.title || 'AntStudio Stream',
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
        Logger.error('Ant Media stream initiation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/publish - Finalizes project with client-side output and server-side processing
router.post('/:id/publish', rbacMiddleware(Permission.PROJECT_EDIT), upload.fields([
    { name: 'video', maxCount: 1 }
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

        if (!videoFile) return res.status(400).json({ success: false, error: 'Video file is required' });

        // Save to temporary file for FFmpeg
        tempDir = path.join(os.tmpdir(), `antflow_pub_${projectId}_${Date.now()}`);
        if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
        tempVideoPath = path.join(tempDir, 'input.mp4');
        await writeFile(tempVideoPath, videoFile.buffer);

        // 1. Extract Metadata and Generate Assets
        const processed = await processVideo(tempVideoPath, projectId);

        // 2. Upload Everything to S3
        const finalKey = S3KeyGenerator.finalVideo(projectId);
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
        const { socketServer } = await import('../services/SocketServer.js');
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
        // Cleanup temp files
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                Logger.error('Cleanup error:', 'ProjectsRoute', e);
            }
        }
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
router.post('/:id/segments/:segmentId/generate-voiceover', licenseGating('trial'), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
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

        const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
        const mgr = AIServiceManager.getInstance();
        await mgr.initialize();

        const result = await mgr.generateAudio(ttsText, modelId, resolvedProviderId, {
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
                const { getFileBuffer } = await import('../utils/AIGenerator.js');
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
router.post('/:id/segments/:segmentId/captions', licenseGating('trial'), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const { id: projectId, segmentId } = req.params;
        const segmentOrder = parseInt(segmentId);

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const segment = project.storyboard?.segments?.find((s: any) => s.order === segmentOrder) as any;
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
            Bucket: configService.aws.bucketName,
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
        project.markModified('storyboard'); 
        await project.save();

        await deductCredits(req.user!.userId, 'audio' as any, cost, `Caption Generation: ${segment.title}`);

        res.json({ success: true, data: { captions } });

    } catch (error: any) {
        Logger.error('Caption generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/assets/generate - Generate specific asset
router.post('/:id/assets/generate', licenseGating('trial'), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { assetName, description, type, segmentOrder, providerId, modelId, options = {}, characterNames, charIndex, generationType: bodyGenerationType } = req.body;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        // ─── HIGH FIDELITY PROMPT RESOLUTION ─────────────────────
        const aiManager = (await import('../utils/ai/AIServiceManager.js')).aiManager;
        const translator = async (p: string) => await aiManager.generateText(p, 'gemini-2.5-flash');

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

            const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            const mgr = AIServiceManager.getInstance();
            await mgr.initialize();

            let finalPrompt = prompt;
            if (segment) {
                const { buildVeoVideoPrompt } = await import('../utils/PromptBuilder.js');
                finalPrompt = await buildVeoVideoPrompt(
                    segment,
                    project.scriptAnalysis?.characters || [],
                    project.scriptAnalysis,
                    'vi',
                    async (p) => await mgr.generateText(p, 'gemini-2.5-flash')
                );
                Logger.info(`[assets/generate] Enriched prompt for segment ${segment.order}`);
            }

            const result = await mgr.generateVideo(finalPrompt, modelId, providerId, {
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

            const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            const mgr = AIServiceManager.getInstance();
            await mgr.initialize();

            const result = await mgr.generateAudio(ttsText, modelId, providerId, options);

            // Result can be { media: { url: 'data:...' } } or { buffer }
            let audioBuffer: Buffer;
            let mimeType = 'audio/mpeg';
            if (result?.media?.url) {
                if (result.media.url.startsWith('data:')) {
                    const b64 = result.media.url.split(',')[1];
                    audioBuffer = Buffer.from(b64, 'base64');
                } else {
                    const { getFileBuffer } = await import('../utils/AIGenerator.js');
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
            const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
            const mgr = AIServiceManager.getInstance();
            await mgr.initialize();

            const result = await mgr.generateMusic(prompt, modelId, providerId, options);

            let musicBuffer: Buffer;
            let mimeType = 'audio/mpeg';
            if (result?.media?.url) {
                if (result.media.url.startsWith('data:')) {
                    const b64 = result.media.url.split(',')[1];
                    musicBuffer = Buffer.from(b64, 'base64');
                } else {
                    const { getFileBuffer } = await import('../utils/AIGenerator.js');
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
    licenseGating('trial'),
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
router.post('/:id/storyboard/generate-assets', licenseGating('trial'), rbacMiddleware(Permission.AI_GENERATE), async (req: any, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project || !project.storyboard?.segments) {
            return res.status(404).json({ success: false, error: 'Project or storyboard segments not found' });
        }

        const { AIServiceManager } = await import('../utils/ai/AIServiceManager.js');
        const mgr = AIServiceManager.getInstance();
        await mgr.initialize();

        // Start batch generation in background
        const generateBatch = async () => {
            for (const segment of project.storyboard!.segments as any[]) {
                try {
                    // Skip if already generating or completed
                    if (segment.generatedVideo?.status === 'completed' || segment.generatedVideo?.status === 'generating') continue;

                    segment.generatedVideo = { s3Key: '', status: 'generating', generatedAt: new Date() };
                    await project.save();

                    const allCharacters = project.scriptAnalysis?.characters || [];
                    const { buildVeoVideoPrompt } = await import('../utils/PromptBuilder.js');
                    const videoPrompt = await buildVeoVideoPrompt(
                        segment, 
                        allCharacters, 
                        project.scriptAnalysis, 
                        'vi', 
                        async (p) => await mgr.generateText(p, 'gemini-2.5-flash')
                    );

                    const result = await mgr.generateVideo(videoPrompt, undefined, undefined, {
                        aspectRatio: project.aspectRatio || '16:9',
                        duration: segment.duration || 5,
                        imageStart: segment.sceneImage
                    });

                    const { uploadToS3 } = await import('../utils/s3.js');
                    const s3Key = S3KeyGenerator.sceneVideo(projectId, segment.order);
                    await uploadToS3(s3Key, result.buffer, result.mimeType || 'video/mp4');

                    segment.generatedVideo = { s3Key, status: 'completed', generatedAt: new Date(), duration: segment.duration };
                    await project.save();
                    
                    Logger.info(`[BatchGen] Completed segment ${segment.order} for project ${projectId}`);
                } catch (err: any) {
                    Logger.error(`[BatchGen] Failed segment ${segment.order}:`, err.message);
                    segment.generatedVideo = { s3Key: '', status: 'failed', generatedAt: new Date() };
                    await project.save();
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
