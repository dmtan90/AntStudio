import { Project } from '../../models/Project'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    // Get query parameters for pagination and filtering
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const status = query.status as string
    const search = query.search as string

    // Build filter
    const filter: any = { userId: user._id }
    if (status) {
        filter.status = status
    }
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ]
    }

    // Fetch projects with pagination
    const skip = (page - 1) * limit
    const [projects, total] = await Promise.all([
        Project.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Project.countDocuments(filter)
    ])

    return {
        success: true,
        data: {
            projects,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    }
})
