import { Router, Response } from 'express';
import { connectDB } from '../utils/db.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { commerceSyncService } from '../services/CommerceSyncService.js';
import { generateJSON } from '../utils/AIGenerator.js';
import geoip from 'geoip-lite';

const router = Router();

// Public routes
// GET /api/commerce/products/:id/public - Get single product without auth
router.get('/products/:id/public', async (req, res) => {
    try {
        await connectDB();
        const product = await Product.findById(req.params.id);
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

        // 1. Resolve Geo info from IP
        const geo: any = geoip.lookup(ip as string);
        
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
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

        // Fetch page HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AntStudio/1.0; +https://antstudio.io)',
                'Accept': 'text/html,application/xhtml+xml'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return res.status(400).json({ success: false, error: `Failed to fetch URL: ${response.status}` });
        }

        const html = await response.text();
        // Truncate to avoid token limits
        const truncatedHtml = html.substring(0, 30000);

        const prompt = `Task: Extract structured product data from the provided HTML.
URL: ${url}
HTML: ${truncatedHtml}

Return EXACTLY ONE JSON object. 
IMPORTANT: 
- No explanations.
- No extra text outside the JSON.
- No trailing commas.
- Use null or empty values if not found.
- DO NOT use Python "None".

Fields to extract:
- name (string)
- price (number, numeric only, default 0)
- currency (string, 3-letter code, default "USD")
- description (string, max 200 chars)
- image (string, absolute URL)
- images (string array, absolute URLs, max 5)
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
        }>(prompt, 'gemini-2.5-flash', {
            generationConfig: { 
                responseMimeType: 'application/json',
                maxOutputTokens: 4096
            }
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Extract product error:', error);
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
        console.error('List orders error:', error);
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
        console.error('Commerce stats error:', error);
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
        console.error('Analytics report error:', error);
        res.status(500).json({ success: false, error: error.message });
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
        console.error('List products error:', error);
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
        console.error('Create product error:', error);
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

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, userId: req.user!.userId },
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
        console.error('Update product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update product' });
    }
});

// DELETE /api/commerce/products/:id - Delete product
router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });

        if (!product) return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error: any) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete product' });
    }
});

export default router;
