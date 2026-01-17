import { Router } from 'express';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users - List all users
router.get('/users', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = 20;
        const search = req.query.search as string;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize),
            User.countDocuments(filter)
        ]);

        res.json({ users, total });
    } catch (error: any) {
        console.error('Admin list users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
    try {
        await connectDB();

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error: any) {
        console.error('Admin get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
    try {
        await connectDB();

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user });
    } catch (error: any) {
        console.error('Admin update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        await connectDB();

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted' });
    } catch (error: any) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/stats - Get platform statistics
router.get('/stats', async (req, res) => {
    try {
        await connectDB();

        const [totalUsers, activeUsers, totalProjects] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            // Import Project model if needed for this stat
            Promise.resolve(0) // Placeholder
        ]);

        res.json({
            totalUsers,
            activeUsers,
            totalProjects
        });
    } catch (error: any) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
