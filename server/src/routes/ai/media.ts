// AI media generation (image, video, voice, music, audio) (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
import { Response } from 'express';
import { generateText, generateImage, generateAudio, generateVideo, checkVideoStatus, generateMusic } from '../../utils/AIGenerator.js';
import { buildAvatarVideoPrompt, buildTranslateTextPrompt } from '../../utils/PromptBuilder.js';
import { enhanceAudioFile } from '../../utils/AudioEnhancer.js';
import { AuthRequest } from '../../middleware/auth.js';
import { Media } from '../../models/Media.js';
import { connectDB } from '../../utils/db.js';
import { configService } from '../../utils/ConfigService.js';
import { deductCredits, getCreditCost } from '../../utils/credits.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../../services/ai/PromptService.js';
import { AIModelCost, AIModelType } from '~/models/AdminSettings.js';
import { ServiceType } from '~/models/CreditUsage.js';
import { upload } from './shared.js';

const router = Router();

// ============================================================================
// AI MEDIA GENERATION
// ============================================================================

// POST /api/ai/generate-broll
router.post('/generate-broll', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, promptId, variables, topic } = req.body;
        const userId = req.user!.userId;

        let finalPrompt = prompt;
        if (promptId) {
            finalPrompt = await promptService.get(promptId, variables || {});
        }

        if (!finalPrompt) {
            return res.status(400).json({ success: false, error: 'Prompt or PromptId is required' });
        }

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.IMAGE);
            await deductCredits(userId, ServiceType.IMAGE, creditCost, `Generate B-Roll: ${topic || finalPrompt.substring(0, 30)}`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { s3Key } = await generateImage(
            finalPrompt,
            userId,
            `broll_${Date.now()}`,
            { aspectRatio: '16:9' }
        );

        res.json({ success: true, data: { url: s3Key, topic } });
    } catch (error: any) {
        Logger.error('B-Roll generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate B-Roll' });
    }
});

// POST /api/ai/generate-image
router.post('/generate-image', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, promptId, variables, style, aspectRatio } = req.body;
        const userId = req.user!.userId;

        let basePrompt = prompt;
        if (promptId) {
            basePrompt = await promptService.get(promptId, variables || {});
        }

        if (!basePrompt) {
            return res.status(400).json({ success: false, error: 'Prompt or PromptId is required' });
        }

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.IMAGE);
            await deductCredits(userId, ServiceType.IMAGE, creditCost, `Generate AI Image: ${basePrompt.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        // Enhance prompt with style
        const fullPrompt = style ? `${style} style. ${basePrompt}` : basePrompt;

        const { s3Key } = await generateImage(
            fullPrompt,
            userId, // Using userId as projectId for now or 'user-gen'
            `gen_img_${Date.now()}`,
            { aspectRatio: aspectRatio || '16:9' }
        );

        // Create Media Record
        const media = await Media.create({
            userId,
            key: s3Key,
            fileName: `AI Image - ${basePrompt.substring(0, 20)}...`,
            contentType: 'image/png', // AIGenerator usually returns png or jpg
            size: 0, // We might not know size without head request or from buffer in util
            bucket: configService.bucketName,
            purpose: 'ai-image',
            metadata: {
                prompt: basePrompt,
                style,
                aspectRatio
            }
        });

        // Return Key instead of URL (Frontend constructs /api/s3/...)
        res.json({ success: true, data: { media, url: s3Key } });
    } catch (error: any) {
        Logger.error('Image generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate image' });
    }
});

// POST /api/ai/generate-voice
router.post('/generate-voice', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { text, voice, provider, multiSpeaker } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.AUDIO);
            await deductCredits(userId, ServiceType.AUDIO, creditCost, `Generate AI Voice: ${text.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { s3Key } = await generateAudio(
            text,
            userId,
            `gen_voice_${Date.now()}`,
            {
                voice,
                providerId: provider,//google/gemini
                multiSpeaker: multiSpeaker
            }
        );

        // Create Media Record
        const media = await Media.create({
            userId,
            key: s3Key,
            fileName: `AI Voice - ${text.substring(0, 20)}...`,
            contentType: 'audio/mpeg',
            size: 0,
            bucket: configService.bucketName,
            purpose: 'ai-voice',
            metadata: {
                text,
                voice
            }
        });

        // Return Key
        res.json({ success: true, data: { media, url: s3Key } });
    } catch (error: any) {
        Logger.error('Voice generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate voice' });
    }
});

// POST /api/ai/generate-music
router.post('/generate-music', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, duration } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.MUSIC);
            await deductCredits(userId, ServiceType.MUSIC, creditCost, `Generate AI Music: ${prompt.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { s3Key } = await generateMusic(
            prompt,
            userId,
            `gen_music_${Date.now()}`,
            { durationSeconds: duration || 30 }
        );

        // Create Media Record
        const media = await Media.create({
            userId,
            key: s3Key,
            fileName: `AI Music - ${prompt.substring(0, 20)}...`,
            contentType: 'audio/wav',
            size: 0,
            bucket: configService.bucketName,
            purpose: 'ai-music',
            metadata: {
                prompt,
                duration
            }
        });

        res.json({ success: true, data: { media, url: s3Key } });
    } catch (error: any) {
        Logger.error('Music generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate music' });
    }
});

// POST /api/ai/generate-video
router.post('/generate-video', async (req: AuthRequest, res) => {
    try {
        const { prompt, duration, aspectRatio, imageStart, imageEnd, characterImages } = req.body;
        const effectiveDuration = duration || 5;

        // Credit Deduction
        const baseCreditCost = await getCreditCost(AIModelType.VIDEO);
        const creditAmount = Math.ceil(effectiveDuration * baseCreditCost);
        const deductionDescription = `Generate Video (Generic) - ${effectiveDuration}s @ ${baseCreditCost} cr/s`;

        try {
            await deductCredits(req.user!.userId, ServiceType.VIDEO, creditAmount, deductionDescription);
        } catch (creditError: any) {
            return res.status(402).json({ success: false, error: creditError.message || 'Insufficient credits' });
        }

        const userId = req.user!.userId;
        const { url, jobId: returnedJobId } = await generateVideo({
            prompt,
            duration: effectiveDuration,
            aspectRatio: aspectRatio || '16:9',
            imageStart: imageStart,
            imageEnd: imageEnd,
            characterImages: characterImages,
            metadata: {
                projectId: userId,
                filename: req.body.filename || `gen_vid_${Date.now()}`
            }
        });

        const jobId = returnedJobId || `gen-fallback-${Date.now()}`;
        const existingMedia = await Media.findOne({
            $or: [
                { 'metadata.jobId': jobId },
                { 'key': url }
            ]
        });

        let media = existingMedia;
        if (!media) {
            media = await Media.create({
                userId,
                key: url,
                fileName: `AI Video - ${jobId}`,
                contentType: 'video/mp4',
                size: 0,
                bucket: configService.bucketName, // Consistent with images
                purpose: 'ai-video',
                metadata: {
                    jobId,
                    status: 'completed',
                    prompt
                }
            });
        }

        return res.json({ success: true, data: { media, url } });
    } catch (error: any) {
        Logger.error('Video generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate video' });
    }
});

// GET /api/ai/video-status/:jobId
router.get('/video-status/:jobId', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { jobId } = req.params;
        const userId = req.user!.userId;

        const status = await checkVideoStatus(jobId);

        if (status.status === 'completed' && status.videoUrl) {
            // Check if media already exists for this job or URL to avoid unique key violation (especially for mocks)
            const existingMedia = await Media.findOne({
                $or: [
                    { 'metadata.jobId': jobId },
                    { 'key': status.videoUrl }
                ]
            });

            if (existingMedia) {
                return res.json({ success: true, data: { ...status, media: existingMedia } });
            }

            const media = await Media.create({
                userId,
                key: status.videoUrl,
                fileName: `AI Video - ${jobId}`,
                contentType: 'video/mp4',
                size: 0,
                bucket: configService.bucketName,
                purpose: 'ai-video',
                metadata: {
                    jobId,
                    status: 'completed'
                }
            });

            return res.json({ success: true, data: { ...status, media } });
        }

        res.json({ success: true, data: status });
    } catch (error: any) {
        Logger.error('Video status check error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to check video status' });
    }
});

// Deprecated use for AI headshot video
// POST /api/ai/generate-avatar-video
router.post('/generate-avatar-video', async (req: AuthRequest, res) => {
    try {
        const { avatarId, script, voiceId, voiceProvider, voiceSettings, background, avatarImage } = req.body;
        const userId = req.user!.userId;

        // Estimate duration
        const avatarWordCount = script.split(' ').length;
        const avatarDuration = Math.ceil(Math.max(5, avatarWordCount / 2.5));

        // Credit Deduction
        const creditAmount = Math.ceil(avatarDuration * AIModelCost.VIDEO);
        try {
            await deductCredits(userId, ServiceType.VIDEO, creditAmount, `Generate Avatar Video (${avatarDuration}s)`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        // Use Veo 3 for Avatar Generation
        // We construct a prompt that asks for the character to speak the lines
        // And pass the avatar image as a character reference ("image_start" or "character_references")

        let characterImages = [];
        if (avatarImage) {
            characterImages.push(avatarImage);
        }

        const prompt = await buildAvatarVideoPrompt({
            script: script,
            background: background
        });

        // Estimate duration (approx 150 words per minute -> 2.5 words per second)
        const wordCount = script.split(' ').length;
        const duration = Math.ceil(Math.max(5, wordCount / 2.5));

        const { jobId } = await generateVideo({
            prompt,
            duration,
            aspectRatio: '16:9',
            characterImages: characterImages,
            metadata: {
                avatarId,
                voiceId,
                voiceProvider: voiceProvider || 'elevenlabs',
                voiceSettings: voiceSettings || {},
                script
            }
            // If we have a direct frontal avatar image, using it as image_start might ensure better consistency
            // imageStart: avatarImage 
        });

        res.json({ success: true, data: { jobId, status: 'processing', provider: 'veo-3' } });
    } catch (error: any) {
        Logger.error('Avatar generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate avatar video' });
    }
});

// POST /api/ai/enhance-audio
router.post('/enhance-audio', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const file = req.file;
        const userId = req.user!.userId;

        if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const result = await enhanceAudioFile(file.buffer, file.mimetype, userId);

        res.json({
            success: true,
            data: {
                url: result.url,
                key: result.key
            }
        });
    } catch (error: any) {
        Logger.error('Audio enhancement error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to enhance audio' });
    }
});

// POST /api/ai/translate
router.post('/translate', async (req: AuthRequest, res) => {
    try {
        const { text, targetLang, sourceLang } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

        const systemPrompt = await buildTranslateTextPrompt({
            sourceLang: sourceLang as string,
            targetLang: targetLang as string
        });

        const translatedText = await generateText(text, undefined, { systemPrompt });
        res.json({ success: true, data: translatedText.trim() });
    } catch (error: any) {
        Logger.error('Translation error:', error);
        res.status(500).json({ success: false, error: 'Failed to translate text' });
    }
});

// POST /api/ai/speech-to-speech (Modulator Bridge)
router.post('/speech-to-speech', async (req: AuthRequest, res) => {
    try {
        const { text, targetLang, voiceId, provider } = req.body;

        // 1. Translate
        const translationPrompt = `Translate to ${targetLang}: ${text}`;
        const translatedText = await generateText(translationPrompt);

        // 2. Generate Audio (TTS)
        const { s3Key } = await generateAudio(translatedText, req.user!.userId, `speech_${Date.now()}`, {
            provider: provider || "gemini",
            voice: voiceId || 'Kore',
            language: targetLang || 'en-US'
        });

        res.json({ success: true, data: { text: translatedText, audioUrl: s3Key } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/tts/dub - Influencer Dubbing (Voice Cloning + Translation)
 */
router.post('/tts/dub', async (req: AuthRequest, res: Response) => {
    try {
        const { text, voiceId, language, provider } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

        // Generate Audio (TTS)
        const { s3Key } = await generateAudio(text, req.user!.userId, `dub_${Date.now()}`, {
            provider: provider || "gemini",
            voice: voiceId || 'Kore',
            language: language || 'en-US'
        });

        res.json({ success: true, audioUrl: s3Key });
    } catch (error: any) {
        Logger.error('[AI] TTS Dub Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
