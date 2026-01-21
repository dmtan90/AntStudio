import { Project } from '../../models/Project'
import { User } from '../../models/User'
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

    const body = await readBody(event)
    const { title, description, aspectRatio, videoStyle, targetDuration } = body
    const mode = body.mode || 'topic'

    // Validation
    if (!title) {
        throw createError({
            statusCode: 400,
            message: 'Title is required'
        })
    }

    // Check user
    const userDoc = await User.findById(user._id)
    if (!userDoc) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        })
    }

    // Create project
    const project = await Project.create({
        userId: user._id,
        title,
        description: description || '',
        mode,
        aspectRatio: aspectRatio || '16:9',
        videoStyle: videoStyle || 'cinematic',
        targetDuration: targetDuration || 60,
        status: 'draft',
        input: {}
    })

    return {
        success: true,
        data: {
            project
        }
    }
})
