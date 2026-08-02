import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../utils/db.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { commerceSyncService } from '../services/streaming/CommerceSyncService.js';
import { generateJSON } from '../utils/AIGenerator.js';
import { chromium } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { Logger } from '../utils/Logger.js';


/**
 * Lightweight async IP geo-lookup using ip-api.com (free tier, no API key needed).
 * Falls back gracefully if the request times out or fails.
 */
async function lookupGeo(ip: string): Promise<{ country: string; region: string; city: string }> {
    const fallback = { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    try {
        // Skip private/loopback addresses
        if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return fallback;
        }
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`, {
            timeout: 2000,
        });
        const data = response.data;
        if (data?.status === 'success') {
            return { country: data.country || 'Unknown', region: data.regionName || 'Unknown', city: data.city || 'Unknown' };
        }
    } catch { /* timeout or network error — use fallback */ }
    return fallback;
}

const router = Router();

// Public routes
// GET /api/commerce/products/:id/public - Get single product without auth (resilient to IDs and names)
router.get('/products/:id/public', async (req, res) => {
    try {
        await connectDB();
        let product = null;
        const lookup = req.params.id;
        
        if (mongoose.Types.ObjectId.isValid(lookup)) {
            product = await Product.findById(lookup);
        }
        
        if (!product) {
            // Case-insensitive exact match
            product = await Product.findOne({
                name: { $regex: new RegExp('^' + lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
            });
        }
        
        if (!product) {
            // Case-insensitive partial/fuzzy match
            product = await Product.findOne({
                name: { $regex: new RegExp(lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }
            });
        }

        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/commerce/products/:id/track - Track engagement (Public)
router.post('/products/:id/track', async (req, res) => {
    try {
        await connectDB();
        const { type, userId, userDemographics } = req.body; // type: 'click' | 'view'
        const productId = req.params.id;
        
        // Resolve IP and User Agent
        let ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(ip)) ip = ip[0];
        const userAgent = req.headers['user-agent'] || '';

        // 1. Resolve Geo info from IP (async API, 2s timeout, graceful fallback)
        const geo = await lookupGeo(ip as string);
        
        // 2. Identify device type
        const isMobile = /mobile/i.test(userAgent);
        const deviceType = isMobile ? 'Mobile' : 'Desktop';

        const update: any = {};
        if (type === 'click') update.$inc = { clicks: 1 };
        else update.$inc = { views: 1 };

        // 3. Casual update on product model for quick stats
        const product = await Product.findByIdAndUpdate(productId, update, { new: true });
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

        // 4. Persistent event for deep analytics
        await AnalyticsEvent.create({
            userId: userId || undefined,
            sessionId: req.body.sessionId || 'anonymous_' + Math.random().toString(36).substring(7),
            event: `commerce:product_${type}`,
            properties: {
                productId,
                productName: product.name,
                country: geo?.country || 'Unknown',
                region: geo?.region || 'Unknown',
                city: geo?.city || 'Unknown',
                device: deviceType,
                ...(userDemographics || {}) // Capture age/gender if passed from frontend (authenticated)
            },
            userAgent,
            ip: ip as string,
            timestamp: new Date()
        });

        res.json({ success: true, data: { current: type === 'click' ? product.clicks : product.views } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// All other commerce routes require authentication
router.use(authMiddleware);

// POST /api/commerce/extract-product - Extract product info from URL via Gemini
router.post('/extract-product', async (req: AuthRequest, res: Response) => {
    let browser;
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

        Logger.info(`[ProductExtractor] Extracting product from URL: ${url}`);

        let html = '';
        try {
            Logger.info(`[ProductExtractor] Launching Playwright to render page`);
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 800 }
            });
            const page = await context.newPage();
            
            // Abort image and media requests to speed up extraction
            await page.route('**/*', (route) => {
                const type = route.request().resourceType();
                if (['image', 'media', 'font'].includes(type)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(2000); // Allow extra time for SPAs to render
            html = await page.content();
        } catch (playwrightErr: any) {
            Logger.warn(`[ProductExtractor] Playwright failed: ${playwrightErr.message}. Falling back to axios.`);
            try {
                const axiosRes = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    },
                    timeout: 10000
                });
                html = axiosRes.data;
            } catch (axiosErr: any) {
                Logger.error(`[ProductExtractor] Axios fallback failed: ${axiosErr.message}`);
                throw new Error(`Failed to fetch product page: ${axiosErr.message}`);
            }
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        if (!html) {
            throw new Error('Failed to retrieve webpage HTML content.');
        }

        // Parse HTML and extract metadata/clean body
        const $ = cheerio.load(html);

        // Normalize helper
        const toAbsolute = (p: string) => {
            if (!p) return '';
            let cleaned = p.trim();
            if (cleaned.startsWith('//')) {
                const protocol = new URL(url).protocol;
                cleaned = `${protocol}${cleaned}`;
            } else if (cleaned.startsWith('www.')) {
                cleaned = `https://${cleaned}`;
            }
            try {
                return new URL(cleaned, url).href;
            } catch {
                return p;
            }
        };

        // Extract brand logo candidate BEFORE cleaning HTML
        let foundLogoUrl = '';
        $('header img, nav img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            const className = $(el).attr('class') || '';
            const alt = $(el).attr('alt') || '';
            if (src && (src.toLowerCase().includes('logo') || className.toLowerCase().includes('logo') || alt.toLowerCase().includes('logo'))) {
                foundLogoUrl = src;
                return false; // break
            }
        });
        if (!foundLogoUrl) {
            $('img').each((_, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                const className = $(el).attr('class') || '';
                if (src && (src.toLowerCase().includes('logo') || className.toLowerCase().includes('logo'))) {
                    foundLogoUrl = src;
                    return false; // break
                }
            });
        }

        // Extract video candidate BEFORE cleaning HTML
        let foundVideoUrl = '';
        
        // Step 1: Look for direct video files (.mp4, .webm, .mov, etc.) in video tags or source tags
        $('video, video source').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) {
                const srcLower = src.toLowerCase();
                if (srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov') || srcLower.includes('.m3u8')) {
                    foundVideoUrl = src;
                    return false; // break
                }
            }
        });

        // Step 2: Look inside template tags for direct video files
        if (!foundVideoUrl) {
            $('template').each((_, el) => {
                const htmlContent = $(el).html() || '';
                if (htmlContent) {
                    const temp$ = cheerio.load(htmlContent);
                    temp$('video, source').each((_, subEl) => {
                        const src = temp$(subEl).attr('src') || temp$(subEl).attr('data-src');
                        if (src) {
                            const srcLower = src.toLowerCase();
                            if (srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov') || srcLower.includes('.m3u8')) {
                                foundVideoUrl = src;
                                return false; // break
                            }
                        }
                    });
                }
                if (foundVideoUrl) return false; // break;
            });
        }

        // Step 3: Run regex to search raw HTML for direct mp4/webm links (Shopify CDN links, etc.)
        if (!foundVideoUrl) {
            const videoRegex = /(https?:)?\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*\.(mp4|webm|m3u8|mov)\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
            const matches = html.match(videoRegex);
            if (matches && matches.length > 0) {
                foundVideoUrl = matches[0];
            }
        }

        // Step 4: Fallback to iframes (YouTube, Vimeo, etc.)
        if (!foundVideoUrl) {
            $('iframe').each((_, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                if (src) {
                    const srcLower = src.toLowerCase();
                    if (srcLower.includes('youtube.com') || srcLower.includes('youtu.be') || srcLower.includes('vimeo.com')) {
                        foundVideoUrl = src;
                        return false; // break
                    }
                }
            });
        }
        
        // Step 5: Fallback to template tags containing iframes
        if (!foundVideoUrl) {
            $('template').each((_, el) => {
                const htmlContent = $(el).html() || '';
                if (htmlContent) {
                    const temp$ = cheerio.load(htmlContent);
                    temp$('iframe').each((_, subEl) => {
                        const src = temp$(subEl).attr('src') || temp$(subEl).attr('data-src');
                        if (src) {
                            const srcLower = src.toLowerCase();
                            if (srcLower.includes('youtube.com') || srcLower.includes('youtu.be') || srcLower.includes('vimeo.com')) {
                                foundVideoUrl = src;
                                return false; // break
                            }
                        }
                    });
                }
                if (foundVideoUrl) return false; // break;
            });
        }
        
        // Extract JSON-LD schemas
        const jsonLdList: any[] = [];
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const txt = $(el).text().trim();
                if (txt) {
                    const parsed = JSON.parse(txt);
                    if (Array.isArray(parsed)) {
                        jsonLdList.push(...parsed);
                    } else {
                        jsonLdList.push(parsed);
                    }
                }
            } catch {}
        });

        // Collect all extracted image candidates from metadata, JSON-LD, application/json, and gallery tags
        const foundImages = new Set<string>();

        // 1. Extract from og:image meta tags
        $('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]').each((_, el) => {
            const content = $(el).attr('content');
            if (content) foundImages.add(toAbsolute(content));
        });

        // 2. Extract from ld+json
        jsonLdList.forEach(item => {
            const extractLdImages = (obj: any) => {
                if (!obj) return;
                if (typeof obj === 'string' && (obj.startsWith('http') || obj.startsWith('//') || obj.includes('/cdn/'))) {
                    foundImages.add(toAbsolute(obj));
                } else if (Array.isArray(obj)) {
                    obj.forEach(extractLdImages);
                } else if (typeof obj === 'object') {
                    if (obj.image) extractLdImages(obj.image);
                    if (obj.images) extractLdImages(obj.images);
                }
            };
            extractLdImages(item);
        });

        // 3. Extract from application/json scripts (like Shopify product JSON)
        $('script[type="application/json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).text().trim());
                const extractJsonImages = (obj: any) => {
                    if (!obj) return;
                    if (Array.isArray(obj)) {
                        obj.forEach(item => {
                            if (typeof item === 'string' && (item.includes('/cdn/') || item.startsWith('http') || item.startsWith('//'))) {
                                foundImages.add(toAbsolute(item));
                            } else {
                                extractJsonImages(item);
                            }
                        });
                    } else if (typeof obj === 'object') {
                        if (Array.isArray(obj.images)) {
                            obj.images.forEach((img: any) => {
                                if (typeof img === 'string') foundImages.add(toAbsolute(img));
                                else if (img && typeof img === 'object' && img.src) foundImages.add(toAbsolute(img.src));
                            });
                        }
                        // Recurse other fields
                        Object.keys(obj).forEach(key => {
                            if (typeof obj[key] === 'object') {
                                extractJsonImages(obj[key]);
                            }
                        });
                    }
                };
                extractJsonImages(data);
            } catch {}
        });

        // 4. Extract from gallery and product img elements
        $('.product__media-list img, .thumbnail-list img, .product-single__media img, .product__gallery img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset');
            if (src) {
                if (src.includes(',')) {
                    const urls = src.split(',').map(s => s.trim().split(' ')[0]);
                    urls.forEach(u => foundImages.add(toAbsolute(u)));
                } else {
                    foundImages.add(toAbsolute(src));
                }
            }
        });

        // Extract color variables and hex colors before we clean up CSS style tags
        const extractedColors: string[] = [];
        const cssVars: string[] = [];
        $('style').each((_, el) => {
            const styleText = $(el).text();
            const varMatches = styleText.match(/--[\w-]+:\s*([^;}\n]+)/g);
            if (varMatches) {
                varMatches.forEach(v => {
                    if (v.includes('#') || v.includes('rgb') || v.includes('color')) {
                        cssVars.push(v.trim());
                    }
                });
            }
            const hexMatches = styleText.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g);
            if (hexMatches) {
                hexMatches.forEach(h => extractedColors.push(h.toLowerCase()));
            }
        });
        $('[style]').each((_, el) => {
            const styleAttr = $(el).attr('style') || '';
            const hexMatches = styleAttr.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g);
            if (hexMatches) {
                hexMatches.forEach(h => extractedColors.push(h.toLowerCase()));
            }
        });

        const uniqueColors = Array.from(new Set(extractedColors)).slice(0, 30);
        const uniqueCssVars = Array.from(new Set(cssVars)).slice(0, 30);

        // Extract relevant meta tags
        const metaTags: Record<string, string> = {};
        $('meta').each((_, el) => {
            const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('itemprop');
            const content = $(el).attr('content');
            if (name && content) {
                const n = name.toLowerCase();
                if (n.startsWith('og:') || n.startsWith('twitter:') || n.includes('title') || n.includes('description') || n.includes('image') || n.includes('price') || n.includes('brand') || n.includes('product') || n === 'keywords') {
                    metaTags[name] = content;
                }
            }
        });

        // Clean up body HTML
        $('script, style, svg, noscript, iframe, footer, header, nav, head').remove();
        $('*').each((_, el) => {
            if (el.type === 'tag') {
                const attribs = (el as any).attribs;
                if (attribs) {
                    Object.keys(attribs).forEach(attr => {
                        if (attr !== 'src' && attr !== 'href' && attr !== 'alt') {
                            $(el).removeAttr(attr);
                        }
                    });
                }
            }
        });

        let cleanHtml = $('body').html() || $.html() || '';
        cleanHtml = cleanHtml
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();

        if (cleanHtml.length > 25000) {
            cleanHtml = cleanHtml.substring(0, 25000) + '... [truncated]';
        }

        const prompt = `Task: Extract structured product data from the provided webpage extraction context.
URL: ${url}
Extracted Brand Logo Candidate URL: ${toAbsolute(foundLogoUrl)}
Extracted Video URL Candidate: ${toAbsolute(foundVideoUrl)}
Extracted Meta Tags: ${JSON.stringify(metaTags)}
Extracted JSON-LD Schema: ${JSON.stringify(jsonLdList)}
Extracted CSS Colors/Variables: ${JSON.stringify(uniqueCssVars)} (Unique CSS hex colors/theme variables found)
Extracted CSS Hex Colors: ${JSON.stringify(uniqueColors)}
Extracted Product Image Candidates: ${JSON.stringify(Array.from(foundImages))}
Cleaned HTML Body Content: ${cleanHtml}

Return EXACTLY ONE JSON object. 
IMPORTANT: 
- No explanations.
- No extra text outside the JSON.
- No trailing commas.
- Use null or empty values if not found.
- DO NOT use Python "None".
- For brand_logo, prefer the "Extracted Brand Logo Candidate URL" if it matches the brand, otherwise extract it.
- For video, prefer the "Extracted Video URL Candidate" if it points to a product video, otherwise extract it.
- For brand_slogan, search the content for taglines, or infer it from the brand's well-known slogan if appropriate (e.g. for Wyze, "Make quality technology accessible to everyone").
- For images, select the most relevant and high-quality product images from the "Extracted Product Image Candidates" array (include all main product images, up to 20).

Fields to extract:
- name (string)
- price (number, numeric only, default 0)
- currency (string, 3-letter code, default "USD")
- description (string, max 200 chars)
- image (string, absolute URL)
- images (string array, absolute URLs, max 20)
- features (string array)
- brand_name (string)
- brand_logo (string, absolute URL)
- brand_slogan (string)
- primary_colors (string array, HEX)
- secondary_colors (string array, HEX)
- video (string, absolute URL)`;

        const result = await generateJSON<{
            name: string;
            price: number;
            currency: string;
            description: string;
            image: string;
            images: string[];
            features: string[];
            brand_name: string;
            brand_logo: string;
            brand_slogan: string;
            primary_colors: string[];
            secondary_colors: string[];
            video: string;
        }>(prompt, undefined);

        if (result) {
            if (result.image) result.image = toAbsolute(result.image);
            if (result.brand_logo) result.brand_logo = toAbsolute(result.brand_logo);
            if (result.video) result.video = toAbsolute(result.video);
            if (Array.isArray(result.images)) {
                result.images = result.images.map(toAbsolute).filter(Boolean);
            }
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('Extract product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to extract product data' });
    }
});

// GET /api/commerce/orders - List orders
router.get('/orders', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId);
        const filter: any = {};

        if (user?.currentOrganizationId) {
            filter.organizationId = user.currentOrganizationId;
        } else {
            filter.userId = req.user!.userId;
            filter.organizationId = { $exists: false };
        }

        const orders = await Order.find(filter).sort({ createdAt: -1 });

        // If no orders found, return some mock ones IF strictly dev mode?
        // No, user asked to remove mocks. We return empty if empty.
        
        res.json({
            success: true,
            data: orders
        });
    } catch (error: any) {
        Logger.error('List orders error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to list orders' });
    }
});

// GET /api/commerce/stats - Aggregate commerce stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId);
        const filter: any = {};

        if (user?.currentOrganizationId) {
            filter.organizationId = user.currentOrganizationId;
        } else {
            filter.userId = req.user!.userId;
            filter.organizationId = { $exists: false };
        }

        const orders = await Order.find(filter);
        const totalRevenue = orders
            .filter((o: any) => o.status === 'completed' || o.status === 'delivered')
            .reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
        const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

        res.json({
            success: true,
            data: {
                totalRevenue,
                pendingOrders,
                currency: 'USD'
            }
        });
    } catch (error: any) {
        Logger.error('Commerce stats error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
    }
});

// GET /api/commerce/analytics/report - Deep reporting
router.get('/analytics/report', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { startDate, endDate, groupBy, productId } = req.query;
        
        const filter: any = {
            event: { $in: ['commerce:product_view', 'commerce:product_click'] }
        };

        if (productId) {
            filter['properties.productId'] = productId;
        }

        if (startDate && endDate) {
            filter.timestamp = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        const events = await AnalyticsEvent.find(filter);

        // Simple aggregation logic for the hub
        // In a high-traffic app, use MongoDB Aggregation Framework
        const report = {
            totalViews: events.filter(e => e.event === 'commerce:product_view').length,
            totalClicks: events.filter(e => e.event === 'commerce:product_click').length,
            byDay: {} as any,
            byProduct: {} as any,
            demographics: {
                age: { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 } as any,
                gender: { 'Male': 0, 'Female': 0, 'Other': 0 } as any
            },
            geo: {} as any,
            devices: { 'Mobile': 0, 'Desktop': 0, 'Tablet': 0 } as any
        };

        events.forEach(e => {
            const date = e.timestamp.toISOString().split('T')[0];
            const pid = e.properties.productId;

            // Group by day
            if (!report.byDay[date]) report.byDay[date] = { views: 0, clicks: 0 };
            if (e.event === 'commerce:product_view') report.byDay[date].views++;
            else report.byDay[date].clicks++;

            // Group by product
            if (!report.byProduct[pid]) report.byProduct[pid] = { name: e.properties.productName, views: 0, clicks: 0 };
            if (e.event === 'commerce:product_view') report.byProduct[pid].views++;
            else report.byProduct[pid].clicks++;

            // Mock/Capture demographics if present in properties
            if (e.properties.ageGroup) report.demographics.age[e.properties.ageGroup as string]++;
            if (e.properties.gender) report.demographics.gender[e.properties.gender as string]++;

            // Geo & Device reporting
            if (e.properties.country) {
                if (!report.geo[e.properties.country]) report.geo[e.properties.country] = 0;
                report.geo[e.properties.country]++;
            }
            if (e.properties.device) {
                if (!report.devices[e.properties.device as string]) report.devices[e.properties.device as string] = 0;
                report.devices[e.properties.device as string]++;
            }
        });

        res.json({ success: true, data: report });
    } catch (error: any) {
        Logger.error('Analytics report error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commerce/reports/:sessionId - Session commerce report
router.get('/reports/:sessionId', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { sessionId } = req.params;

        const orders = await Order.find({
            sessionId,
            userId: req.user!.userId
        });

        const completedOrders = orders.filter(
            (o: any) => o.status !== 'cancelled'
        );

        const totalRevenue = completedOrders.reduce(
            (sum: number, o: any) => sum + (o.amount || 0), 0
        );

        // Determine dominant currency from orders, fallback to USD
        const currencyCounts: Record<string, number> = {};
        orders.forEach((o: any) => {
            const c = o.currency || 'USD';
            currencyCounts[c] = (currencyCounts[c] || 0) + 1;
        });
        const currency = Object.keys(currencyCounts).sort(
            (a, b) => currencyCounts[b] - currencyCounts[a]
        )[0] || 'USD';

        res.json({
            success: true,
            data: {
                sessionId,
                totalOrders: orders.length,
                totalRevenue,
                currency
            }
        });
    } catch (error: any) {
        Logger.error('Commerce session report error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch session report' });
    }
});

// GET /api/commerce/products - List products
router.get('/products', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId);
        const filter: any = {};

        if (user?.currentOrganizationId) {
            filter.organizationId = user.currentOrganizationId;
        } else {
            filter.userId = req.user!.userId;
            filter.organizationId = { $exists: false };
        }

        const products = await Product.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: products
        });
    } catch (error: any) {
        Logger.error('List products error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to list products' });
    }
});

// POST /api/commerce/products - Create product
router.post('/products', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { 
            name, description, price, currency, image, images, stock, inventoryUrl,
            features, brand_name, brand_logo, brand_slogan, primary_colors, secondary_colors, video
        } = req.body;

        if (!name || isNaN(price)) {
            return res.status(400).json({ success: false, error: 'Name and valid price are required' });
        }

        const user = await User.findById(req.user!.userId);
        const product = await Product.create({
            userId: req.user!.userId,
            organizationId: user?.currentOrganizationId || undefined,
            name,
            description,
            price,
            currency: currency || 'USD',
            image,
            images: images || [],
            stock: stock || 0,
            inventoryUrl,
            features: features || [],
            brand_name,
            brand_logo,
            brand_slogan,
            primary_colors: primary_colors || [],
            secondary_colors: secondary_colors || [],
            video: video || ''
        });

        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        Logger.error('Create product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create product' });
    }
});

// DELETED - Moved to public section above authMiddleware

// POST /api/commerce/flash-sale - Simulate/Trigger Flash Sale
router.post('/flash-sale', async (req: AuthRequest, res: Response) => {
    try {
        const { productId, discount, durationMinutes } = req.body;
        // In a real app, this would emit a socket event to all viewers of the current stream
        // For now, we return success to allow the frontend to trigger the UI
        res.json({
            success: true,
            data: {
                message: 'Flash sale initiated',
                expiresAt: new Date(Date.now() + (durationMinutes || 10) * 60000)
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/commerce/purchase-simulate - Simulate a purchase for current stream
router.post('/purchase-simulate', async (req: AuthRequest, res: Response) => {
    try {
        const { userName, productName, productId, amount, currency, sessionId } = req.body;

        const order = await commerceSyncService.recordExternalOrder({
            userId: req.user!.userId,
            sessionId: sessionId || 'dynamic_session',
            customerName: userName || 'Mock Customer',
            productName: productName || 'Mock Product',
            productId,
            amount: amount || 99,
            currency: currency || 'USD',
            platform: 'simulated'
        });

        res.json({ success: true, data: order, message: 'Purchase recorded and broadcasted' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/commerce/products/:id - Update product
router.put('/products/:id', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { 
            name, description, price, currency, image, images, stock, inventoryUrl, isActive,
            features, brand_name, brand_logo, brand_slogan, primary_colors, secondary_colors, video
        } = req.body;
        const lookup = req.params.id;

        let query: any = { userId: req.user!.userId };
        if (mongoose.Types.ObjectId.isValid(lookup)) {
            query._id = lookup;
        } else {
            // Find product matching name under this merchant
            const exactMatch = await Product.findOne({
                name: { $regex: new RegExp('^' + lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                userId: req.user!.userId
            });
            if (exactMatch) {
                query._id = exactMatch._id;
            } else {
                const partialMatch = await Product.findOne({
                    name: { $regex: new RegExp(lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') },
                    userId: req.user!.userId
                });
                if (partialMatch) {
                    query._id = partialMatch._id;
                } else {
                    return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
                }
            }
        }

        const product = await Product.findOneAndUpdate(
            query,
            { 
                $set: { 
                    name, description, price, currency, image, images, stock, inventoryUrl, isActive,
                    features, brand_name, brand_logo, brand_slogan, primary_colors, secondary_colors, video,
                    updatedAt: new Date()
                } 
            },
            { new: true }
        );

        if (!product) return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });

        res.json({ success: true, data: product });
    } catch (error: any) {
        Logger.error('Update product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update product' });
    }
});

// DELETE /api/commerce/products/:id - Delete product
router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const lookup = req.params.id;
        let query: any = { userId: req.user!.userId };

        if (mongoose.Types.ObjectId.isValid(lookup)) {
            query._id = lookup;
        } else {
            const exactMatch = await Product.findOne({
                name: { $regex: new RegExp('^' + lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                userId: req.user!.userId
            });
            if (exactMatch) {
                query._id = exactMatch._id;
            } else {
                const partialMatch = await Product.findOne({
                    name: { $regex: new RegExp(lookup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') },
                    userId: req.user!.userId
                });
                if (partialMatch) {
                    query._id = partialMatch._id;
                } else {
                    return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
                }
            }
        }

        const product = await Product.findOneAndDelete(query);

        if (!product) return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error: any) {
        Logger.error('Delete product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete product' });
    }
});

// POST /api/commerce/products/:id/ingest-knowledge — Phase 11
// Trigger async product knowledge ingestion from inventoryUrl
router.post('/products/:id/ingest-knowledge', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const product = await Product.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!product) return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
        if (!product.inventoryUrl) return res.status(400).json({ success: false, error: 'Product has no inventoryUrl set' });

        const { productKnowledgeService } = await import('../services/ai/ProductKnowledgeService.js');

        // Fire and forget — update status to 'pending' immediately
        await Product.findByIdAndUpdate(req.params.id, { knowledgeStatus: 'pending' });
        productKnowledgeService.ingestProduct(req.params.id).catch(() => {});

        res.json({ success: true, message: 'Knowledge ingestion started', status: 'pending' });
    } catch (error: any) {
        Logger.error('Ingest knowledge error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commerce/products/:id/knowledge — Phase 11
// Get current knowledge status and snippet
router.get('/products/:id/knowledge', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const product = await Product.findOne({ _id: req.params.id, userId: req.user!.userId })
            .select('name knowledgeBase knowledgeStatus knowledgeUpdatedAt');
        if (!product) return res.status(404).json({ success: false, error: 'Not found' });

        res.json({
            success: true,
            data: {
                status: product.knowledgeStatus,
                updatedAt: product.knowledgeUpdatedAt,
                snippetLength: product.knowledgeBase?.length || 0,
                snippet: (product.knowledgeBase || '').substring(0, 200)
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
