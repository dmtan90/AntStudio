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
    const body = await readBody(event)

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

    // Update allowed fields
    const allowedFields = [
        'title', 'description', 'status', 'aspectRatio', 'videoStyle', 'targetDuration',
        'scriptAnalysis', 'storyboard', 'input', 'chatHistory', 'visualAssets'
    ]
    const updates: any = {}

    // Support for top-level fields and dot-notation for nested fields
    for (const key in body) {
        const field = key.split('.')[0]
        if (allowedFields.includes(field)) {
            updates[key] = body[key]
        }
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $set: updates },
        { new: true, runValidators: true }
    )

    return {
        success: true,
        data: {
            project: updatedProject
        }
    }
})
