import { Project } from '../../../models/Project'
import { connectDB } from '../../../utils/db'
import { analyzeScript } from '../../../services/scriptAnalyzer'
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

    // Get script content
    let scriptContent = ''

    if (project.mode === 'topic' && project.input?.topic) {
        scriptContent = project.input.topic
    } else if (project.mode === 'upload' && project.input?.scriptFile) {
        // Download file from S3 and parse
        try {
            const fileBuffer = await getFromS3(project.input.scriptFile.s3Key)

            // Convert stream to buffer
            const chunks: any[] = []
            for await (const chunk of fileBuffer as any) {
                chunks.push(chunk)
            }
            const buffer = Buffer.concat(chunks)

            // Parse document
            const parsed = await parseDocument(buffer, project.input.scriptFile.fileType)
            scriptContent = parsed.text
        } catch (error) {
            console.error('Failed to download/parse script:', error)
            throw createError({
                statusCode: 500,
                message: 'Failed to process script file'
            })
        }
    } else {
        throw createError({
            statusCode: 400,
            message: 'No script content found. Please provide a topic or upload a script.'
        })
    }

    // Validate script content
    if (!scriptContent || scriptContent.trim().length < 50) {
        throw createError({
            statusCode: 400,
            message: 'Script content is too short. Please provide more details.'
        })
    }

    // Analyze script with Gemini
    try {
        const analysis = await analyzeScript(scriptContent)

        // Update project with analysis results
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $set: {
                    scriptAnalysis: {
                        ...analysis,
                        analyzedAt: new Date()
                    },
                    status: 'analyzing' // Update status
                }
            },
            { new: true }
        )

        return {
            success: true,
            data: {
                project: updatedProject,
                analysis
            }
        }
    } catch (error: any) {
        console.error('Script analysis failed:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to analyze script'
        })
    }
})
