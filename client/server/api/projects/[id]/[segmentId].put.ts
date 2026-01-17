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
    const segmentId = getRouterParam(event, 'segmentId')
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
    if (project.userId.toString() !== user._id.toString()) {
        throw createError({
            statusCode: 403,
            message: 'Access denied'
        })
    }

    // Find segment
    const segmentIndex = project.storyboard?.segments.findIndex(
        seg => seg._id.toString() === segmentId
    )

    if (segmentIndex === undefined || segmentIndex === -1) {
        throw createError({
            statusCode: 404,
            message: 'Segment not found'
        })
    }

    // Update segment
    const allowedFields = [
        'title',
        'description',
        'voiceover',
        'cameraAngle',
        'mood',
        'style',
        'characters',
        'location'
    ]

    for (const field of allowedFields) {
        if (body[field] !== undefined && project.storyboard) {
            (project.storyboard.segments[segmentIndex] as any)[field] = body[field]
        }
    }

    // Recalculate duration if voiceover changed
    if (body.voiceover && project.storyboard) {
        const words = body.voiceover.trim().split(/\s+/).length
        const wordsPerSecond = 150 / 60
        const duration = Math.ceil(words / wordsPerSecond)
        project.storyboard.segments[segmentIndex].duration = Math.max(duration, 3)

        // Recalculate total duration
        project.storyboard.totalDuration = project.storyboard.segments.reduce(
            (sum, seg) => sum + seg.duration,
            0
        )
    }

    if (project.storyboard) {
        project.storyboard.updatedAt = new Date()
    }

    await project.save()

    return {
        success: true,
        data: {
            segment: project.storyboard?.segments[segmentIndex]
        }
    }
})
