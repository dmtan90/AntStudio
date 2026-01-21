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

    const projectId = getRouterParam(event, 'id')

    // Fetch project
    const project = await Project.findById(projectId)

    if (!project) {
        throw createError({
            statusCode: 404,
            message: 'Project not found'
        })
    }

    // Authorization check
    if (project.userId.toString() !== user._id.toString() && user.role !== 'admin') {
        throw createError({
            statusCode: 403,
            message: 'Access denied'
        })
    }

    return {
        success: true,
        data: {
            project
        }
    }
})
