import express, { Response } from 'express';
import { ApiKeyService } from '../services/ApiKeyService.js';
import { WebhookSubscription } from '../models/WebhookSubscription.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// All developer routes require UI-level authentication
router.use(authMiddleware);

/**
 * --- API KEY MANAGEMENT ---
 */

// List API Keys
router.get('/keys', async (req: any, res: Response) => {
    try {
        const keys = await ApiKeyService.getKeys(req.user.userId);
        res.json({ success: true, data: keys });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Generate New Key
router.post('/keys', async (req: any, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Key name required' });

        const { raw, record } = await ApiKeyService.generateKey(req.user.userId, name);
        res.json({ success: true, data: { ...record.toObject(), rawKey: raw } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Revoke Key
router.delete('/keys/:id', async (req: any, res: Response) => {
    try {
        await ApiKeyService.revokeKey(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

/**
 * --- WEBHOOK MANAGEMENT ---
 */

// List Webhooks
router.get('/webhooks', async (req: any, res: Response) => {
    try {
        const hooks = await WebhookSubscription.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: hooks });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Add Webhook
router.post('/webhooks', async (req: any, res: Response) => {
    try {
        const { url, events, description } = req.body;
        if (!url || !events?.length) return res.status(400).json({ success: false, error: 'URL and events required' });

        const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
        const sub = await WebhookSubscription.create({
            userId: req.user.userId,
            url,
            events,
            secret,
            description
        });

        res.json({ success: true, data: sub });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Delete Webhook
router.delete('/webhooks/:id', async (req: any, res: Response) => {
    try {
        await WebhookSubscription.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

export default router;
