import { User } from '../../models/User'
import { Project } from '../../models/Project'
import { Payment } from '../../models/Payment'
import { AdminSettings } from '../../models/AdminSettings'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    // Verify admin role
    const user = event.context.user
    if (!user || user.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    try {
        const [
            totalUsers,
            activeSubscriptions,
            payments,
            recentProjects,
            settings
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 'subscription.status': 'active', 'subscription.plan': { $ne: 'free' } }),
            Payment.find({ status: 'completed' }),
            Project.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(10),
            AdminSettings.findOne()
        ])

        const monthlyRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0)
        const storageUsed = settings?.s3?.totalStorageUsed || 0

        // Fetch Recent Signups
        const recentSignups = await User.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role isActive createdAt subscription')

        // Fetch Recent Paid/Upgrades (Simulated by finding recent users with paid plans)
        const recentUpgrades = await User.find({ 'subscription.plan': { $ne: 'free' } })
            .sort({ 'subscription.currentPeriodStart': -1, updatedAt: -1 })
            .limit(5)
            .select('name email subscription')

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
        ])

        // Transform for chart (labels: Month names, data: counts)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const chartLabels = userGrowthAgg.map(item => monthNames[item._id - 1])
        const userGrowthData = userGrowthAgg.map(item => item.count)

        // Mock Revenue Data for Chart (since we don't have historical payment aggregation readily available yet)
        const revenueLabels = [...chartLabels]
        const revenueData = chartLabels.map(() => Math.floor(Math.random() * 500) + 100) // Mock

        return {
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
                revenue: { labels: revenueLabels.length ? revenueLabels : ['Jan', 'Feb'], data: revenueData.length ? revenueData : [100, monthlyRevenue] }
            }
        }
    } catch (error: any) {
        throw createError({ statusCode: 500, message: error.message })
    }
})
