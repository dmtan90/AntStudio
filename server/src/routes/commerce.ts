import { Router, Response } from 'express';
import { connectDB } from '../utils/db.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { commerceSyncService } from '../services/CommerceSyncService.js';

const router = Router();

// All commerce routes require authentication
router.use(authMiddleware);

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
        const { name, description, price, currency, image, stock, inventoryUrl } = req.body;

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
            stock: stock || 0,
            inventoryUrl
        });

        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create product' });
    }
});

// POST /api/commerce/products/:id/track - Track engagement
router.post('/products/:id/track', async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const { type } = req.body; // 'click' | 'view'

        const update: any = {};
        if (type === 'click') update.$inc = { clicks: 1 };
        else update.$inc = { views: 1 };

        const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

        res.json({ success: true, data: { clicks: product.clicks } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

/**
 * GET /api/commerce/reports/:sessionId
 * Get commercial report for a specific session
 */
router.get('/reports/:sessionId', async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId } = req.params;
        const report = await commerceSyncService.getSessionCommercialReport(sessionId);
        
        if (!report) {
            return res.status(404).json({ success: false, error: 'No report found for this session' });
        }

        res.json({ success: true, data: report });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
