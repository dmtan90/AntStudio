import { Router } from 'express';
import { generateJSON, generateText } from '../utils/AIGenerator.js';
import { parseDocument } from '../utils/documentParser.js';
import multer from 'multer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadToS3 } from '../utils/s3.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for auth if needed, but for now keeping it open or using same as existing if required by client
// router.use(authMiddleware);

// Helper to clean and validate response
const cleanResponse = (data: any[]) => {
    return data.map(item => typeof item === 'string' ? item.trim() : item).filter(item => item && item.length > 0);
};

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
                const { s3Key, s3Url } = await generateImage(imagePrompt, 'temp-analysis', `gen_${Date.now()}`, { aspectRatio: '1:1' });

                product.images = [{ id: Math.floor(Math.random() * 10000), url: s3Url || s3Key }];
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

export default router;
