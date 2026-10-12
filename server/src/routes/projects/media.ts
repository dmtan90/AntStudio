// Voiceover, captions & visual assets (moved verbatim from routes/projects.ts).
// Mounted by routes/projects.ts after authMiddleware.
import { Router } from 'express';
import { Response } from 'express';
import { connectDB } from '../../utils/db.js';
import { Project } from '../../models/Project.js';
import { Media } from '../../models/Media.js';
import { Logger } from '../../utils/Logger.js';
import { generateImage } from '../../utils/AIGenerator.js';
import { rbacMiddleware } from '../../middleware/rbac.js';
import { Permission } from '../../utils/permissions.js';
import { licenseGating } from '../../middleware/LicenseGating.js';
import { uploadToS3, S3KeyGenerator } from '../../utils/s3.js';
import { StorageFactory } from '../../services/storage/StorageFactory.js';
import { configService } from '../../utils/ConfigService.js';
import { aiManager } from '../../utils/ai/AIServiceManager.js';
import { buildCharacterSheetPrompt } from '../../utils/PromptBuilder.js';
import { LicenseType } from '~/models/License.js';
import { buildVeoVideoPrompt } from '../../utils/PromptBuilder.js';
import { getFileBuffer } from '../../utils/AIGenerator.js';
import { autoCaptionService } from '../../services/ai/AutoCaptionService.js';
import { upload } from './shared.js';

const router = Router();

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

export default router;
