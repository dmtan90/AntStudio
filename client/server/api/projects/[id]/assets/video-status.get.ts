import { Project } from '../../../../models/Project'
import { connectDB } from '../../../../utils/db'

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
    const query = getQuery(event)
    const segmentId = query.segmentId as string

    // Fetch project
    const project = await Project.findById(projectId)

    if (!project) {
        throw createError({
            statusCode: 404,
            message: 'Project not found'
        })
    }

    // Authorization check
    if (project.userId.toString() !== user._id.toString()) {
        throw createError({
            statusCode: 403,
            message: 'Access denied'
        })
    }

    // Find segment
    const segment = project.storyboard?.segments.find(
        seg => seg._id.toString() === segmentId
    )

    if (!segment || !segment.generatedVideo) {
        throw createError({
            statusCode: 404,
            message: 'Segment or video generation job not found'
        })
    }

    // Return current status
    return {
        success: true,
        data: {
            segmentId,
            video: segment.generatedVideo
        }
    }
})
