import { Router } from 'express';
import { generateJSON, generateText, generateImage, generateAudio, generateVideo, checkVideoStatus } from '../utils/AIGenerator.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';
import { parseDocument } from '../utils/documentParser.js';
import { enhanceAudioFile } from '../utils/audioEnhancer.js'; // Added for audio enhancement
import multer from 'multer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadToS3 } from '../utils/s3.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { Media } from '../models/Media.js';
import { connectDB } from '../utils/db.js';
import config from '../utils/config.js';
import { aiPerformanceService } from '../services/ai/AIPerformanceService.js';
import { styleABTestingEngine } from '../services/ai/StyleABTestingEngine.js';
import { deductCredits, CREDIT_PRICES, getCreditCost } from '../utils/credits.js';
import { sceneDetectionService } from '../services/ai/SceneDetectionService.js';
import { audioAnalysisService } from '../services/ai/AudioAnalysisService.js';
import { silenceDetectionService } from '../services/ai/SilenceDetectionService.js';

import { aiGuestService } from '../services/ai/AIGuestService.js';
import { ttsService } from '../services/ai/TTSService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for auth
router.use(authMiddleware);

// Helper to clean and validate response
const cleanResponse = (data: any[]) => {
    return data.map(item => typeof item === 'string' ? item.trim() : item).filter(item => item && item.length > 0);
};

// ============================================================================
// AI MEDIA GENERATION
// ============================================================================

// POST /api/ai/generate-image
router.post('/generate-image', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { prompt, style, aspectRatio } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            await deductCredits(userId, 'image', CREDIT_PRICES.IMAGE_GEN, `Generate AI Image: ${prompt.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        // Enhance prompt with style
        const fullPrompt = style ? `${style} style. ${prompt}` : prompt;

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
            fileName: `AI Image - ${prompt.substring(0, 20)}...`,
            contentType: 'image/png', // AIGenerator usually returns png or jpg
            size: 0, // We might not know size without head request or from buffer in util
            bucket: config.awsS3Bucket,
            purpose: 'ai-image',
            metadata: {
                prompt,
                style,
                aspectRatio
            }
        });

        // Return Key instead of URL (Frontend constructs /api/s3/...)
        res.json({ success: true, data: { media, url: s3Key } });
    } catch (error: any) {
        console.error('Image generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate image' });
    }
});

// POST /api/ai/generate-voice
router.post('/generate-voice', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { text, voice, provider } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            await deductCredits(userId, 'audio', CREDIT_PRICES.VOICE_GEN, `Generate AI Voice: ${text.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { s3Key } = await generateAudio(
            text,
            userId,
            `gen_voice_${Date.now()}`,
            {
                voice,
                providerId: provider // 'elevenlabs' or others
            }
        );

        // Create Media Record
        const media = await Media.create({
            userId,
            key: s3Key,
            fileName: `AI Voice - ${text.substring(0, 20)}...`,
            contentType: 'audio/mpeg',
            size: 0,
            bucket: config.awsS3Bucket,
            purpose: 'ai-voice',
            metadata: {
                text,
                voice
            }
        });

        // Return Key
        res.json({ success: true, data: { media, url: s3Key } });
    } catch (error: any) {
        console.error('Voice generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate voice' });
    }
});

// POST /api/ai/generate-video
router.post('/generate-video', async (req: AuthRequest, res) => {
    try {
        const { prompt, duration, aspectRatio } = req.body;
        const effectiveDuration = duration || 5;

        // Credit Deduction
        const baseCreditCost = await getCreditCost('video');
        const creditAmount = Math.ceil(effectiveDuration * baseCreditCost);
        const deductionDescription = `Generate Video (Generic) - ${effectiveDuration}s @ ${baseCreditCost} cr/s`;

        try {
            await deductCredits(req.user!.userId, 'video', creditAmount, deductionDescription);
        } catch (creditError: any) {
            return res.status(402).json({ success: false, error: creditError.message || 'Insufficient credits' });
        }

        const { jobId } = await generateVideo({
            prompt,
            duration: effectiveDuration,
            aspectRatio: aspectRatio || '16:9'
        });

        res.json({ success: true, data: { jobId } });
    } catch (error: any) {
        console.error('Video generation error:', error);
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
                bucket: 'external',
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
        console.error('Video status check error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to check video status' });
    }
});

// POST /api/ai/detect-scenes
router.post('/detect-scenes', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const file = req.file;
        const { mediaId } = req.body;

        let videoBuffer: Buffer;
        let mimeType: string;

        if (file) {
            videoBuffer = file.buffer;
            mimeType = file.mimetype;
        } else if (mediaId) {
            const media = await Media.findById(mediaId);
            if (!media) return res.status(404).json({ success: false, error: 'Media not found' });

            // Fetch from S3
            const response = await axios.get(media.key.startsWith('http') ? media.key : `${config.awsS3Endpoint}/${media.key}`, { responseType: 'arraybuffer' });
            videoBuffer = Buffer.from(response.data);
            mimeType = media.contentType;
        } else {
            return res.status(400).json({ success: false, error: 'No video provided' });
        }

        // Credit Deduction (1 credit per 2 seconds of video, simplified)
        // Hardcoding 10 credits for now as we don't know duration easily without ffprobe
        try {
            await deductCredits(userId, 'video', 10, 'AI Scene Detection');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const scenes = await sceneDetectionService.detectScenes(videoBuffer, mimeType);
        res.json({ success: true, data: { scenes } });
    } catch (error: any) {
        console.error('Scene detection error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to detect scenes' });
    }
});

/**
 * AI Beat Detection
 */
router.post('/detect-beats', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const file = req.file;
        const { mediaId } = req.body;

        let audioBuffer: Buffer;
        let mimeType: string;

        if (file) {
            audioBuffer = file.buffer;
            mimeType = file.mimetype;
        } else if (mediaId) {
            const media = await Media.findById(mediaId);
            if (!media) return res.status(404).json({ success: false, error: 'Media not found' });

            const url = media.key.startsWith('http') ? media.key : `${config.awsS3Endpoint}/${media.key}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            audioBuffer = Buffer.from(response.data);
            mimeType = media.contentType;
        } else {
            return res.status(400).json({ success: false, error: 'No audio provided' });
        }

        try {
            // Deduct 5 credits for beat analysis
            await deductCredits(userId, 'audio', 5, 'AI Beat Detection');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const beats = await audioAnalysisService.detectBeats(audioBuffer, mimeType);
        res.json({ success: true, data: { beats } });
    } catch (error: any) {
        console.error('Beat detection error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to detect beats' });
    }
});

/**
 * AI Silence Detection (Smart Trim)
 */
router.post('/detect-silence', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const file = req.file;
        const { mediaId, noiseThreshold, minSilenceLen } = req.body;

        let videoBuffer: Buffer;
        let mimeType: string;

        if (file) {
            videoBuffer = file.buffer;
            mimeType = file.mimetype;
        } else if (mediaId) {
            const media = await Media.findById(mediaId);
            if (!media) return res.status(404).json({ success: false, error: 'Media not found' });

            const url = media.key.startsWith('http') ? media.key : `${config.awsS3Endpoint}/${media.key}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            videoBuffer = Buffer.from(response.data);
            mimeType = media.contentType;
        } else {
            return res.status(400).json({ success: false, error: 'No media provided' });
        }

        try {
            await deductCredits(userId, 'video', 5, 'AI Silence Detection');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const regions = await silenceDetectionService.detectNonSilentRegions(
            videoBuffer,
            parseFloat(noiseThreshold || '-30'),
            parseFloat(minSilenceLen || '0.5')
        );

        res.json({ success: true, data: { regions } });
    } catch (error: any) {
        console.error('Silence detection error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to detect silence' });
    }
});

// ============================================================================
// AI GUEST INTERACTION
// ============================================================================

/**
 * POST /api/ai/guest/talk - Generate personality-driven response
 */
router.post('/guest/talk', async (req: AuthRequest, res) => {
    try {
        const { entityId, prompt } = req.body;
        const userId = req.user!.userId;

        if (!entityId || !prompt) {
            return res.status(400).json({ success: false, error: 'EntityId and Prompt are required' });
        }

        const result = await aiGuestService.generateGuestDialogue(userId, entityId, prompt);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[AI/Guest] Talk Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/guest/tts - Generate voice for text
 */
router.post('/guest/tts', async (req: AuthRequest, res) => {
    try {
        const { text, voiceId } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

        const result = await ttsService.synthesizeSpeech(text, voiceId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[AI/Guest] TTS Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/generate-captions
router.post('/generate-captions', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const file = req.file;
        const { mediaId } = req.body;

        let videoBuffer: Buffer;
        let mimeType: string;

        if (file) {
            videoBuffer = file.buffer;
            mimeType = file.mimetype;
        } else if (mediaId) {
            const media = await Media.findById(mediaId);
            if (!media) return res.status(404).json({ success: false, error: 'Media not found' });

            const response = await axios.get(media.key.startsWith('http') ? media.key : `${config.awsS3Endpoint}/${media.key}`, { responseType: 'arraybuffer' });
            videoBuffer = Buffer.from(response.data);
            mimeType = media.contentType;
        } else {
            // Fallback to project-wide captioning (if logic exists elsewhere, for now error)
            return res.status(400).json({ success: false, error: 'No video provided for captioning' });
        }

        try {
            await deductCredits(userId, 'audio', 5, 'AI Caption Generation');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { autoCaptionService } = await import('../services/ai/AutoCaptionService.js');
        const segments = await autoCaptionService.generateCaptions(videoBuffer, mimeType);

        res.json({ success: true, data: { segments } });
    } catch (error: any) {
        console.error('Caption generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate captions' });
    }
});

// POST /api/ai/headlines
router.post('/headlines', async (req, res) => {
    try {
        const { product_name, description } = req.body;
        const prompt = `Generate 5 catchy, professional ad headlines for a product named "${product_name}". 
        Description: ${description}.
        Return ONLY a JSON object with this format: { "data": ["Headline 1", "Headline 2", ...] }`;

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        console.error('Headlines generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate headlines' });
    }
});

// POST /api/ai/subheadlines
router.post('/subheadlines', async (req, res) => {
    try {
        const { product_name, description } = req.body;
        const prompt = `Generate 3 detailed ad descriptions (subheadlines) for a product named "${product_name}". 
        Description: ${description}.
        Return ONLY a JSON object with this format: { "data": ["Desc 1", "Desc 2", ...] }`;

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        console.error('Subheadlines generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate subheadlines' });
    }
});

// POST /api/ai/ad-cta
router.post('/ad-cta', async (req, res) => {
    try {
        const { name, description, objective } = req.body;
        const prompt = `Generate 5 short, action-oriented Call-to-Action (CTA) phrases for a product named "${name}".
        Objective: ${objective}.
        Description: ${description}.
        Return ONLY a JSON object with this format: { "data": ["Shop Now", "Learn More", ...] }`;

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        console.error('CTA generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate CTAs' });
    }
});

// POST /api/ai/analyze-product
// Supports: url (body), text (body), file (multipart)
router.post('/analyze-product', upload.single('file'), async (req, res) => {
    try {
        let contentToAnalyze = '';
        let contextType = 'text';
        let images: any[] = [];
        let sourceUrl = '';

        const { url, text } = req.body;
        const file = req.file;

        // 1. Extract Content & Images
        if (url) {
            contextType = 'website';
            sourceUrl = url;
            try {
                const response = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 10000
                });
                const $ = cheerio.load(response.data);

                // Extract images
                $('img').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && !src.startsWith('data:') && images.length < 5) {
                        // Handle relative URLs
                        try {
                            const fullUrl = src.startsWith('http') ? src : new URL(src, url).toString();
                            // Basic filter for small icons or tracking pixels could go here
                            images.push({ id: Math.floor(Math.random() * 10000), url: fullUrl });
                        } catch (e) { /* ignore invalid URLs */ }
                    }
                });

                // Extract text
                $('script, style, nav, footer, header').remove();
                contentToAnalyze = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);
            } catch (e) {
                console.warn('Failed to scrape URL:', e);
                contentToAnalyze = `Analyze this URL: ${url}`;
            }
        } else if (text) {
            contentToAnalyze = text.substring(0, 15000);
        } else if (file) {
            contextType = 'document'; // Default
            const fileType = file.originalname.split('.').pop()?.toLowerCase();

            // Text/PDF/Docx Parsing
            if (['txt', 'pdf', 'docx', 'pptx'].includes(fileType || '')) {
                const parsed = await parseDocument(file.buffer, fileType as any);
                contentToAnalyze = parsed.text.substring(0, 15000);
            }
            // Image/Video Analysis
            else if (['jpg', 'jpeg', 'png', 'webp', 'mp4'].includes(fileType || '')) {
                contextType = fileType === 'mp4' ? 'video' : 'image';
                const s3Result = await uploadToS3(`temp/analysis/${Date.now()}_${file.originalname}`, file.buffer, file.mimetype);

                // For direct media upload, this IS the product image
                images.push({ id: Math.floor(Math.random() * 10000), url: s3Result.url || s3Result.key });

                contentToAnalyze = `[${contextType === 'video' ? 'Video' : 'Image'} File at: ${s3Result.url}]`;
            }
            else {
                return res.status(400).json({ success: false, error: 'Unsupported file type' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'No input provided' });
        }

        // 2. Analyze with AI
        const prompt = `Analyze the following ${contextType} content and extract product and brand details into a structured JSON format.
        
        Content:
        ${contentToAnalyze}

        Target JSON Structure:
        {
            "product": {
                "name": "Product Name",
                "description": "Marketing description (with highlights)",
                "selling_price": 0,
                "currency": "USD",
                "tags": ["tag1", "tag2"],
                "site_url": "${sourceUrl || url || ''}",
                "features": ["feature 1", "feature 2"],
                "rating": 5.0,
                "review_count": 0,
                "original_price": 0,
                "sku": "SKU-123",
                "availability": true,
                "category": "General"
            },
            "brand": {
                "brand_name": "Brand Name",
                "brand_description": "Brand story",
                "primary_colors": ["#000000"],
                "secondary_colors": ["#ffffff"],
                "tone_of_voice": "Professional"
            }
        }

        Rules:
        - Infer missing fields reasonably based on context.
        - If multiple products found, pick the main one.
        - Price should be a number.
        - "features" should be a list of key selling points.
        - Return ONLY JSON.`;

        const analysis = await generateJSON<any>(prompt);

        // 3. Post-processing
        const product = analysis.product || {};
        const brand = analysis.brand || {};

        // Generate ID
        product.id = Math.floor(Math.random() * 100000);
        product.business_id = Math.floor(Math.random() * 100000);

        // Handle Images
        if (images.length > 0) {
            product.images = images;
        } else if (contextType === 'document' || contextType === 'text') {
            // If document/text and no images scraped/uploaded -> Generate AI Image
            try {
                // Import locally to avoid circular dep issues
                const { generateImage } = await import('../utils/AIGenerator.js');
                const imagePrompt = `Professional product photography of ${product.name}, ${product.description ? product.description.substring(0, 100) : ''}, high quality, studio lighting, 4k`;

                // Using a temp/random project ID as we don't have one here contextually, or use 'temp'
                const { s3Key } = await generateImage(imagePrompt, 'temp-analysis', `gen_${Date.now()}`, { aspectRatio: '1:1' });

                product.images = [{ id: Math.floor(Math.random() * 10000), url: s3Key }];
            } catch (imageError) {
                console.warn('Failed to generate AI product image:', imageError);
                // Fallback placeholder
                product.images = [{ id: 1, url: 'https://via.placeholder.com/500?text=Product' }];
            }
        } else {
            product.images = [];
        }

        res.json({ success: true, data: { product, brand } });

    } catch (error: any) {
        console.error('Product analysis error:', error);
        res.status(500).json({ success: false, error: 'Failed to analyze product' });
    }
});

// POST /api/ai/generate-avatar-video
router.post('/generate-avatar-video', async (req: AuthRequest, res) => {
    try {
        const { avatarId, script, voiceId, voiceProvider, voiceSettings, background, avatarImage } = req.body;
        const userId = req.user!.userId;

        // Estimate duration
        const avatarWordCount = script.split(' ').length;
        const avatarDuration = Math.ceil(Math.max(5, avatarWordCount / 2.5));

        // Credit Deduction
        const creditAmount = Math.ceil(avatarDuration * CREDIT_PRICES.VIDEO_GEN_PER_SECOND);
        try {
            await deductCredits(userId, 'video', creditAmount, `Generate Avatar Video (${avatarDuration}s)`);
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

        const prompt = `A cinematic video of a character speaking the following lines: "${script}". 
        The character should match the provided reference image.
        Setting: ${background || 'Professional studio background, neutral lighting'}.
        Action: Speaking naturally to the camera, lip syncing to the dialogue.
        Style: Highly realistic, 4k, professional cinematography.`;

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
        console.error('Avatar generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate avatar video' });
    }
});

// POST /api/ai/convert-presentation
router.post('/convert-presentation', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const file = req.file;
        const userId = req.user!.userId;

        if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const fileType = file.originalname.split('.').pop()?.toLowerCase();
        const scenes = [];

        if (fileType === 'pdf') {
            // Import dynamically to avoid startup issues if not installed yet (though we just installed it)
            // @ts-ignore
            const pdf2img = (await import('pdf-img-convert')).default;

            // Convert PDF pages to images (Uint8Array[])
            const outputImages = await pdf2img.convert(file.buffer, {
                width: 1920,
                height: 1080
            });

            // Upload each page to S3
            for (let i = 0; i < outputImages.length; i++) {
                // Determine duration based on text content? For now fixed.
                const buffer = Buffer.from(outputImages[i]);
                const s3Key = `projects/${userId}/docs/${Date.now()}_slide_${i + 1}.png`;
                const upload = await uploadToS3(s3Key, buffer, 'image/png');

                scenes.push({
                    id: i + 1,
                    image: upload.url,
                    duration: 5,
                    notes: `Slide ${i + 1} from ${file.originalname}`
                });
            }
        }
        else if (['pptx', 'ppt'].includes(fileType || '')) {
            // PPTX Extraction (Text only currently supported natively efficiently)
            // For images, we would need CloudConvert or LibreOffice.
            // Fallback: Parse text and use AI to generate scenes? 
            // Or return error saying PDF is required for visual slides.

            // Temporary Strategy: Suggest converting to PDF
            return res.status(400).json({
                success: false,
                error: 'For visual slide conversion, please export your presentation as PDF first. PPTX support is currently limited to text analysis.'
            });
        }
        else {
            return res.status(400).json({ success: false, error: 'Unsupported file type. Please upload a PDF.' });
        }

        res.json({ success: true, data: { scenes, totalDuration: scenes.length * 5 } });
    } catch (error: any) {
        console.error('Presentation conversion error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to convert presentation' });
    }
});

/**
 * POST /api/ai/cookies
 * Update session cookies for browser-based providers (AI Studio, Flow, Gemini Chat)
 */
router.post('/cookies', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        let { providerId, cookies } = req.body;

        // Default to aistudio if not provided
        providerId = providerId || 'aistudio';

        // Support form-data / stringified cookies from bookmarklet
        if (typeof cookies === 'string' && (cookies.startsWith('[') || cookies.startsWith('{'))) {
            try {
                cookies = JSON.parse(cookies);
            } catch (e) {
                console.warn('[AI Routes] Failed to parse cookies string as JSON');
            }
        }

        if (!cookies) {
            return res.status(400).json({ success: false, error: 'cookies are required' });
        }

        console.log(`[AI Routes] Updating cookies for provider: ${providerId}`);

        if (providerId === 'aistudio' || providerId === 'gemini-chat') {
            const { aiStudioClient } = await import('../integrations/aistudio/AIStudioClient.js');
            await aiStudioClient.updateCookies(cookies);
        } else if (providerId === 'flow') {
            const { flowClient } = await import('../integrations/flow/FlowClient.js');
            await flowClient.updateCookies(cookies);
        } else {
            return res.status(400).json({ success: false, error: 'Unsupported provider for cookie update' });
        }

        res.json({ success: true, message: 'Cookies updated successfully' });
    } catch (error: any) {
        console.error('Cookie update error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update cookies' });
    }
});

/**
 * POST /api/ai/cookies/sync
 * Trigger server-side browser sync with Google (Manual Login Flow)
 */
router.post('/cookies/sync', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { aiStudioClient } = await import('../integrations/aistudio/AIStudioClient.js');
        const result = await aiStudioClient.syncWithGoogle();
        res.json({ success: true, message: `Successfully synced ${result.count} cookies!`, data: result });
    } catch (error: any) {
        console.error('Cookie sync error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to sync with Google' });
    }
});

/**
 * TEST AI CONNECTION
 * Verifies if the session for a native provider is active
 */
router.post('/test-connection', adminMiddleware, async (req: AuthRequest, res: any) => {
    try {
        const { providerId } = req.body;
        if (!providerId) return res.status(400).json({ error: 'providerId is required' });

        const result = await aiManager.testConnection(providerId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- AI Performance & Optimization Endpoints ---

// POST /api/ai/autopilot/analyze
router.post('/autopilot/analyze', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const file = req.file;
        const userId = req.user!.userId;

        if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const fileType = file.originalname.split('.').pop()?.toLowerCase() as 'pdf' | 'pptx';
        if (!['pdf', 'pptx'].includes(fileType)) {
            return res.status(400).json({ success: false, error: 'Unsupported file type. Please upload PDF or PPTX.' });
        }

        // 1. Parse Document for Text
        const parsedDoc = await parseDocument(file.buffer, fileType);
        const slides = parsedDoc.slides || [parsedDoc.text];

        const scenes = [];

        // 2. Handle Visuals (PDF -> Images)
        let slideImages: string[] = [];
        if (fileType === 'pdf') {
            // @ts-ignore
            const pdf2img = (await import('pdf-img-convert')).default;
            const outputImages = await pdf2img.convert(file.buffer, {
                width: 1920,
                height: 1080
            });

            for (let i = 0; i < outputImages.length; i++) {
                const buffer = Buffer.from(outputImages[i] as any);
                const s3Key = `projects/${userId}/docs/${Date.now()}_slide_${i + 1}.png`;
                const upload = await uploadToS3(s3Key, buffer, 'image/png');
                slideImages.push(upload.url || upload.key);
            }
        }

        // 3. Generate Scripts & Storyboard for each slide
        // We do this in parallel for speed, but limited to avoid rate limits
        const analysisPromises = slides.map(async (slideText, index) => {
            const prompt = `You are a professional presenter's scriptwriter. 
            Analyze the content of Slide ${index + 1} and write a engaging, clear script for a presentation.
            
            Slide Content:
            ${slideText}

            Return ONLY a JSON object:
            {
                "script": "The spoken words for this slide...",
                "captions": "Condensed version for on-screen captions",
                "estimatedDuration": 15, // in seconds, realistic based on script length
                "focusPoints": ["bullet point 1", "bullet point 2"]
            }`;

            try {
                const result = await generateJSON<any>(prompt);
                return {
                    id: index + 1,
                    text: slideText,
                    image: slideImages[index] || null, // No image for PPTX yet
                    script: result.script,
                    captions: result.captions,
                    duration: result.estimatedDuration || 10,
                    focusPoints: result.focusPoints || []
                };
            } catch (err) {
                console.error(`AI Analysis failed for slide ${index + 1}:`, err);
                return {
                    id: index + 1,
                    text: slideText,
                    image: slideImages[index] || null,
                    script: `And here we have slide ${index + 1}, covering ${slideText.substring(0, 50)}...`,
                    captions: `Slide ${index + 1}`,
                    duration: 10,
                    focusPoints: []
                };
            }
        });

        const analyzedScenes = await Promise.all(analysisPromises);

        res.json({
            success: true,
            data: {
                scenes: analyzedScenes,
                totalSlides: analyzedScenes.length,
                fileName: file.originalname
            }
        });

    } catch (error: any) {
        console.error('Autopilot analysis error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to analyze presentation for autopilot' });
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
        console.error('Audio enhancement error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to enhance audio' });
    }
});

// POST /api/ai/translate
router.post('/translate', async (req: AuthRequest, res) => {
    try {
        const { text, targetLang, sourceLang } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

        const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang || 'auto'} to ${targetLang || 'English'}. 
        Maintain the tone and nuances. Return ONLY the translated text, no explanations.`;

        const translatedText = await generateText(text, undefined, { systemPrompt });
        res.json({ success: true, data: translatedText.trim() });
    } catch (error: any) {
        console.error('Translation error:', error);
        res.status(500).json({ success: false, error: 'Failed to translate text' });
    }
});

// POST /api/ai/speech-to-speech (Modulator Bridge)
router.post('/speech-to-speech', async (req: AuthRequest, res) => {
    try {
        const { text, targetLang, voiceId } = req.body;

        // 1. Translate
        const translationPrompt = `Translate to ${targetLang}: ${text}`;
        const translatedText = await generateText(translationPrompt);

        // 2. Generate Audio (TTS)
        const { s3Key } = await generateAudio(translatedText, req.user!.userId, `speech_${Date.now()}`, {
            voice: voiceId || 'standard'
        });

        res.json({ success: true, data: { text: translatedText, audioUrl: s3Key } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/performance/snapshot
router.post('/performance/snapshot', async (req, res) => {
    try {
        const { projectId, snapshot } = req.body;
        aiPerformanceService.recordSnapshot(projectId, snapshot);

        // Pass to AB Testing engine for potential style swap
        await styleABTestingEngine.evaluate(projectId, snapshot);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/performance/insights/:projectId
router.get('/performance/insights/:projectId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const data = await aiPerformanceService.generateDirectorInsights(req.params.projectId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/performance/optimize/start
router.post('/performance/optimize/start', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { projectId, initialStyle, candidates } = req.body;
        styleABTestingEngine.startOptimization(projectId, initialStyle, candidates);
        res.json({ success: true, message: 'Autonomous optimization cycle engaged' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
