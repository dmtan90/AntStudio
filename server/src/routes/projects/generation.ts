// AI script, analysis & storyboard generation (moved verbatim from routes/projects.ts).
// Mounted by routes/projects.ts after authMiddleware.
import { Router } from 'express';
import { Response } from 'express';
import { connectDB } from '../../utils/db.js';
import { Project } from '../../models/Project.js';
import { Logger } from '../../utils/Logger.js';
import { generateText, generateJSON } from '../../utils/AIGenerator.js';
import { generateStoryboardIteratively } from '../../services/streaming/IterativeStoryboard.js';
import { rbacMiddleware } from '../../middleware/rbac.js';
import { Permission } from '../../utils/permissions.js';
import { licenseGating } from '../../middleware/LicenseGating.js';
import { hasSufficientCredits, deductCredits, getCreditCost } from '../../utils/credits.js';
import { uploadToS3, S3KeyGenerator } from '../../utils/s3.js';
import { AIModelType } from '../../models/AdminSettings.js';
import { aiManager } from '../../utils/ai/AIServiceManager.js';
import { projectContext } from '../../utils/ProjectContext.js';
import { promptService } from '../../services/ai/PromptService.js';
import { videoWorkflow } from '../../services/ai/VideoWorkflow.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import { ServiceType } from '~/models/CreditUsage.js';
import { LicenseType } from '~/models/License.js';
import { socketServer } from '../../services/streaming/SocketServer.js';
import { buildVeoVideoPrompt } from '../../utils/PromptBuilder.js';
import { upload } from './shared.js';

const router = Router();

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

        // Non-blocking; errors outside the per-segment try/catch must not become unhandled rejections
        generateBatch().catch(err => Logger.error('[Storyboard] Batch asset generation failed:', 'Projects', err));

        res.json({ success: true, message: 'Batch generation started' });
    } catch (error: any) {
        Logger.error('Batch generation start error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
