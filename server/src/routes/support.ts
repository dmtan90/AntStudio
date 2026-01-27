import { Router } from 'express';
import { SupportTicket } from '../models/SupportTicket.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, sysAdminMiddleware, AuthRequest } from '../middleware/auth.js';
import { uploadToS3 } from '../utils/s3.js';

const router = Router();

router.use(authMiddleware);

// GET /api/support/tickets - List my tickets (Edge Specialist)
router.get('/tickets', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const tickets = await SupportTicket.find({ userId: req.user!.userId }).sort({ updatedAt: -1 });
        res.json({ success: true, data: { tickets } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/support/tickets - Open a new tactical ticket
router.post('/tickets', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { subject, description, priority, instanceId, attachments } = req.body;

        const ticket = await SupportTicket.create({
            userId: req.user!.userId,
            instanceId,
            subject,
            description,
            priority: priority || 'medium',
            attachments: attachments || []
        });

        res.status(201).json({ success: true, data: { ticket } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/support/tickets/:id/messages - Add message to ticket
router.post('/tickets/:id/messages', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { text } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

        // Authorization: Specialist or Admin
        const isAdmin = req.user!.role === 'admin' || req.user!.role === 'sys-admin';
        if (!isAdmin && ticket.userId.toString() !== req.user!.userId.toString()) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }

        ticket.messages.push({
            senderId: req.user!.userId as any,
            text,
            timestamp: new Date(),
            isAdmin
        });
        ticket.status = isAdmin ? 'in-progress' : 'open';
        await ticket.save();

        res.json({ success: true, data: { ticket } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/support/admin/tickets - Master Admin terminal
router.get('/admin/tickets', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const tickets = await SupportTicket.find().populate('userId', 'name email').sort({ status: 1, updatedAt: -1 });
        res.json({ success: true, data: { tickets } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
