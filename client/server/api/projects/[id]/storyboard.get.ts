import { Project } from '../../../models/Project'
import { connectDB } from '../../../utils/db'

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

    // Check if storyboard exists
    if (!project.storyboard || !project.storyboard.segments || project.storyboard.segments.length === 0) {
        throw createError({
            statusCode: 404,
            message: 'Storyboard not found'
        })
    }

    return {
        success: true,
        data: {
            storyboard: project.storyboard
        }
    }
})
