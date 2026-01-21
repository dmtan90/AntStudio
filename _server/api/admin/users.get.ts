import { User } from '../../models/User'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const admin = event.context.user
    if (!admin || admin.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const pageSize = 20
    const search = query.search as string

    const filter: any = {}
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ]
    }

    try {
        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize),
            User.countDocuments(filter)
        ])

        return {
            users,
            total
        }
    } catch (error: any) {
        throw createError({ statusCode: 500, message: error.message })
    }
})
