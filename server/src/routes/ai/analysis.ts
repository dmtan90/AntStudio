// Vision & media analysis (captions, detection, OCR, presentations) (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
import { Response } from 'express';
import { generateJSON, generateText, generateImage, extractHighlights } from '../../utils/AIGenerator.js';
import { buildVisionAnalyzePrompt, buildVisionOCRPrompt, buildVisionFacesPrompt, buildVisionObjectsPrompt, buildVisionCaptionPrompt, buildAnalyzeProductPrompt, buildPresentationAnalyzePrompt } from '../../utils/PromptBuilder.js';
import { aiManager } from '../../utils/ai/AIServiceManager.js';
import { parseDocument } from '../../utils/DocumentParser.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadToS3 } from '../../utils/s3.js';
import { AuthRequest } from '../../middleware/auth.js';
import { Media } from '../../models/Media.js';
import { connectDB } from '../../utils/db.js';
import { deductCredits, getCreditCost } from '../../utils/credits.js';
import { sceneDetectionService } from '../../services/ai/SceneDetectionService.js';
import { audioAnalysisService } from '../../services/ai/AudioAnalysisService.js';
import { silenceDetectionService } from '../../services/ai/SilenceDetectionService.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../../services/ai/PromptService.js';
import { AIModelType } from '~/models/AdminSettings.js';
import { ServiceType } from '~/models/CreditUsage.js';
import { upload, resolveMediaInput } from './shared.js';

const router = Router();

/**
 * AI Highlight Extraction
 */
router.post('/extract-highlights', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { context, mediaId } = req.body;
        const userId = req.user!.userId;

        let analysisContext = context;
        if (mediaId && !context) {
            const media = await Media.findById(mediaId);
            if (media) analysisContext = media.fileName + " " + (media.metadata?.description || "");
        }

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.TEXT);
            await deductCredits(userId, ServiceType.TEXT, creditCost, 'Extract Highlights');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const result = await extractHighlights(analysisContext);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('Highlight extraction error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to extract highlights' });
    }
});

/**
 * AI Vision: Image Captioning
 */
router.post(['/generate-caption', '/generate-image-caption'], upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { image, mediaId } = req.body;
        const { buffer, mimeType } = await resolveMediaInput(req.file, mediaId || image);
        
        
        const prompt = await buildVisionCaptionPrompt();
        const result = await generateText(prompt, undefined, { 
            images: [buffer.toString('base64')] 
        });

        res.json({ success: true, data: { caption: result } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * AI Vision: Object Detection
 */
router.post('/detect-objects', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { image, mediaId } = req.body;
        const { buffer, mimeType } = await resolveMediaInput(req.file, mediaId || image);


        const prompt = await buildVisionObjectsPrompt();
        const result = await generateJSON(prompt, undefined, { 
            images: [buffer.toString('base64')] 
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * AI Vision: Face Detection
 */
router.post('/detect-faces', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { image, mediaId } = req.body;
        const { buffer, mimeType } = await resolveMediaInput(req.file, mediaId || image);


        const prompt = await buildVisionFacesPrompt();
        const result = await generateJSON(prompt, undefined, { 
            images: [buffer.toString('base64')] 
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * AI Vision: Text Extraction (OCR)
 */
router.post('/extract-text', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { image, mediaId } = req.body;
        const { buffer, mimeType } = await resolveMediaInput(req.file, mediaId || image);


        const prompt = await buildVisionOCRPrompt();
        const result = await generateText(prompt, undefined, { 
            images: [buffer.toString('base64')] 
        });

        res.json({ success: true, data: { text: result } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/detect-scenes
router.post('/detect-scenes', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const { mediaId } = req.body;

        const { buffer: videoBuffer, mimeType } = await resolveMediaInput(req.file, mediaId);

        // Credit Deduction (1 credit per 2 seconds of video, simplified)
        // Hardcoding 10 credits for now as we don't know duration easily without ffprobe
        try {
            const creditCost = await getCreditCost(AIModelType.VIDEO);
            await deductCredits(userId, ServiceType.VIDEO, creditCost, 'AI Scene Detection');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const scenes = await sceneDetectionService.detectScenes(videoBuffer, mimeType);
        res.json({ success: true, data: { scenes } });
    } catch (error: any) {
        Logger.error('Scene detection error:', error);
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
        const { mediaId } = req.body;

        const { buffer: audioBuffer, mimeType } = await resolveMediaInput(req.file, mediaId);

        try {
            const creditCost = await getCreditCost(AIModelType.AUDIO);
            await deductCredits(userId, ServiceType.AUDIO, creditCost, 'AI Beat Detection');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const beats = await audioAnalysisService.detectBeats(audioBuffer, mimeType);
        res.json({ success: true, data: { beats } });
    } catch (error: any) {
        Logger.error('Beat detection error:', error);
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
        const { mediaId, noiseThreshold, minSilenceLen } = req.body;

        const { buffer: videoBuffer, mimeType } = await resolveMediaInput(req.file, mediaId);

        try {
            const creditCost = await getCreditCost(AIModelType.VIDEO);
            await deductCredits(userId, ServiceType.VIDEO, creditCost, 'AI Silence Detection');
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
        Logger.error('Silence detection error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to detect silence' });
    }
});

/**
 * POST /api/ai/vision/analyze - Analyze stream canvas image
 */
router.post('/vision/analyze', async (req: AuthRequest, res) => {
    try {
        const { image, mediaId, prompt } = req.body;
        const { buffer, mimeType } = await resolveMediaInput(undefined, mediaId || image);


        const analysisPrompt = await buildVisionAnalyzePrompt({ prompt: prompt || '' });
        
        // Use AI Manager with image support
        const result = await aiManager.generateText(analysisPrompt, undefined, undefined, {
            images: [buffer.toString('base64')] // Array of base64 strings
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI/Vision] Analyze Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/generate-captions
router.post('/generate-captions', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const userId = req.user!.userId;
        const { mediaId } = req.body;

        const { buffer: videoBuffer, mimeType } = await resolveMediaInput(req.file, mediaId);

        try {
            const creditCost = await getCreditCost(AIModelType.AUDIO);
            await deductCredits(userId, ServiceType.AUDIO, creditCost, 'AI Caption Generation');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const { autoCaptionService } = await import('../../services/ai/AutoCaptionService.js');
        const segments = await autoCaptionService.generateCaptions(videoBuffer, mimeType);

        res.json({ success: true, data: { segments } });
    } catch (error: any) {
        Logger.error('Caption generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate captions' });
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
                Logger.warn('Failed to scrape URL:', 'AI', e);
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
        const prompt = await buildAnalyzeProductPrompt({
            contextType,
            contentToAnalyze,
            sourceUrl: sourceUrl || url || ''
        });

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
                const { generateImage } = await import('../../utils/AIGenerator.js');
                const imagePrompt = `Professional product photography of ${product.name}, ${product.description ? product.description.substring(0, 100) : ''}, high quality, studio lighting, 4k`;

                // Using a temp/random project ID as we don't have one here contextually, or use 'temp'
                const { s3Key } = await generateImage(imagePrompt, 'temp-analysis', `gen_${Date.now()}`, { aspectRatio: '1:1' });

                product.images = [{ id: Math.floor(Math.random() * 10000), url: s3Key }];
            } catch (imageError) {
                Logger.warn('Failed to generate AI product image:', 'AI', imageError);
                // Fallback placeholder
                product.images = [{ id: 1, url: 'https://via.placeholder.com/500?text=Product' }];
            }
        } else {
            product.images = [];
        }

        res.json({ success: true, data: { product, brand } });

    } catch (error: any) {
        Logger.error('Product analysis error:', error);
        res.status(500).json({ success: false, error: 'Failed to analyze product' });
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
        Logger.error('Presentation conversion error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to convert presentation' });
    }
});

// --- AI Performance & Optimization Endpoints ---

// POST /api/ai/presentation/analyze
router.post('/presentation/analyze', upload.single('file'), async (req: AuthRequest, res) => {
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
            const prompt = await buildPresentationAnalyzePrompt({
                slideNumber: index + 1,
                slideText: slideText
            });

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
                Logger.error(`AI Analysis failed for slide ${index + 1}:`, 'AI', err);
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
        Logger.error('Autopilot analysis error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to analyze presentation' });
    }
});

/**
 * POST /api/ai/generate-social-caption - Generate social media captions for a viral moment.
 * This used to be registered as a second '/generate-caption' route, which was shadowed by the
 * image-caption route above, so viral syndication always fell back to its default caption.
 */
router.post('/generate-social-caption', async (req: AuthRequest, res: Response) => {
    try {
        const { moment, description, context, platforms } = req.body;
        const prompt = await promptService.get('studio/caption_gen', {
            moment,
            description,
            context,
            platforms: JSON.stringify(platforms)
        });

        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Caption Gen Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
