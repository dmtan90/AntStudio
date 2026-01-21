import { Project } from '../../../models/Project'
import { connectDB } from '../../../utils/db'
import { generateStoryboard } from '../../../services/storyboardGenerator'
import { parseDocument } from '../../../utils/documentParser'
import { getFromS3 } from '../../../utils/s3'

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
    if (project.userId.toString() !== user._id.toString()) {
        throw createError({
            statusCode: 403,
            message: 'Access denied'
        })
    }

    // Check if script analysis exists
    if (!project.scriptAnalysis) {
        throw createError({
            statusCode: 400,
            message: 'Please analyze the script first before generating storyboard'
        })
    }

    // Get script content
    let scriptContent = ''

    if (project.mode === 'topic' && project.input?.topic) {
        scriptContent = project.input.topic
    } else if (project.mode === 'upload' && project.input?.scriptFile) {
        try {
            const fileBuffer = await getFromS3(project.input.scriptFile.s3Key)
            const chunks: any[] = []
            for await (const chunk of fileBuffer as any) {
                chunks.push(chunk)
            }
            const buffer = Buffer.concat(chunks)
            const parsed = await parseDocument(buffer, project.input.scriptFile.fileType)
            scriptContent = parsed.text
        } catch (error) {
            throw createError({
                statusCode: 500,
                message: 'Failed to process script file'
            })
        }
    }

    // Generate storyboard
    try {
        const storyboardResult = await generateStoryboard(scriptContent, project.scriptAnalysis)

        // Update project with storyboard
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $set: {
                    storyboard: {
                        segments: storyboardResult.segments,
                        totalDuration: storyboardResult.totalDuration,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    status: 'storyboard'
                }
            },
            { new: true }
        )

        return {
            success: true,
            data: {
                project: updatedProject,
                storyboard: storyboardResult
            }
        }
    } catch (error: any) {
        console.error('Storyboard generation failed:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to generate storyboard'
        })
    }
})
