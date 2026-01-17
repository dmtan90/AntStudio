import { Project } from '../../models/Project'
import { User } from '../../models/User'
import { connectDB } from '../../utils/db'
import { deleteFolderFromS3 } from '../../utils/s3'

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

    // Clean up S3 files by prefix
    try {
        await deleteFolderFromS3(`projects/${projectId}/`)
    } catch (error) {
        console.error(`Failed to delete S3 folder for project: ${projectId}`, error)
    }

    // Delete project from database
    await Project.findByIdAndDelete(projectId)

    return {
        success: true,
        message: 'Project deleted successfully'
    }
})
