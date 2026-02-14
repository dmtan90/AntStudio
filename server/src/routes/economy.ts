import express, { Request, Response } from 'express';
import { virtualEconomyService } from '../services/economy/VirtualEconomyService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/economy/catalog - Get all available gifts/items
router.get('/catalog', authMiddleware, (req: Request, res: Response) => {
    res.json(virtualEconomyService.getCatalog());
});

// GET /api/economy/wallet - Get current user wallet
router.get('/wallet', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'User not authenticated' });
        const wallet = await virtualEconomyService.getWallet(userId);
        res.json(wallet);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/economy/purchase - Purchase an item
router.post('/purchase', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { itemId } = req.body;
        
        if (!userId) return res.status(401).json({ error: 'User not authenticated' });
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        
        const result = await virtualEconomyService.purchaseItem(userId, itemId);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/economy/add-credits (Admin or Test only?)
router.post('/add-credits', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { amount } = req.body;
        
        if (!userId) return res.status(401).json({ error: 'User not authenticated' });
        if (!amount) return res.status(400).json({ error: 'amount is required' });
        
        await virtualEconomyService.addCredits(userId, amount);
        const wallet = await virtualEconomyService.getWallet(userId);
        res.json({ success: true, balance: wallet.balance });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
