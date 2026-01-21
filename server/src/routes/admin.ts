import { Router } from 'express';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { configService } from '../utils/configService.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';

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

        res.json({
            success: true,
            data: { users, total },
            error: null
        });
    } catch (error: any) {
        console.error('Admin list users error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
    try {
        await connectDB();

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        res.json({ success: true, data: { user }, error: null });
    } catch (error: any) {
        console.error('Admin get user error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
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
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        res.json({ success: true, data: { user }, error: null });
    } catch (error: any) {
        console.error('Admin update user error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        await connectDB();

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        res.json({ success: true, data: { message: 'User deleted' }, error: null });
    } catch (error: any) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// GET /api/admin/stats - Get platform statistics
router.get('/stats', async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const [
            totalUsers,
            activeSubscriptions,
            recentProjects,
            settings
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 'subscription.status': 'active', 'subscription.plan': { $ne: 'free' } }),
            Project.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(10),
            AdminSettings.findOne()
        ]);

        // Monthly revenue (placeholder for now, matching _server logic)
        const monthlyRevenue = 0;
        const storageUsed = settings?.s3?.totalStorageUsed || 0;

        // Fetch Recent Signups
        const recentSignups = await User.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role isActive createdAt subscription');

        // Fetch Recent Upgrades
        const recentUpgrades = await User.find({ 'subscription.plan': { $ne: 'free' } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select('name email subscription');

        // Chart Data: User Growth (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const userGrowthAgg = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartLabels = userGrowthAgg.map(item => monthNames[item._id - 1]);
        const userGrowthData = userGrowthAgg.map(item => item.count);

        res.json({
            success: true,
            data: {
                totalUsers,
                monthlyRevenue,
                activeSubscriptions,
                storageUsed,
                recentSignups,
                recentUpgrades,
                recentProjects: recentProjects.map(p => ({
                    _id: p._id,
                    title: p.title,
                    status: p.status,
                    createdAt: p.createdAt,
                    user: p.userId
                })),
                charts: {
                    userGrowth: { labels: chartLabels.length ? chartLabels : ['Jan', 'Feb'], data: userGrowthData.length ? userGrowthData : [0, totalUsers] },
                    revenue: { labels: chartLabels.length ? chartLabels : ['Jan', 'Feb'], data: [100, 200, 300, 400, 500, 600].slice(0, chartLabels.length || 2) }
                }
            },
            error: null
        });
    } catch (error: any) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// GET /api/admin/settings - Get platform settings
router.get('/settings', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        let settings = await AdminSettings.findOne();
        if (!settings) {
            settings = await AdminSettings.create({});
        }
        res.json({ success: true, data: settings, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

// PUT /api/admin/settings - Update platform settings
router.put('/settings', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const settings = await AdminSettings.findOneAndUpdate(
            {},
            { $set: req.body },
            { new: true, upsert: true }
        );

        // Refresh services with new config
        await configService.refresh();
        await aiManager.initialize();

        // If license key was updated, check license status immediately
        if (req.body.license && req.body.license.key) {
            // Import dynamically to avoid circular dependency if any, or just import at top if fine.
            // But we can just use the service.
            const { licenseService } = await import('../services/licenseScheduler.js');
            await licenseService.checkLicense();

            // Re-fetch settings to get updated license info
            const updatedSettings = await AdminSettings.findOne();
            return res.json({ success: true, data: updatedSettings, error: null });
        }

        res.json({ success: true, data: settings, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

export default router;
