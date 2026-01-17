import { Project } from '../../models/Project'
import { connectDB } from '../../utils/db'
import { uploadToS3 } from '../../utils/s3'
import { parseDocument } from '../../utils/documentParser'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    // Parse multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
        throw createError({
            statusCode: 400,
            message: 'No file uploaded'
        })
    }

    const fileData = formData.find(item => item.name === 'file')
    const projectIdData = formData.find(item => item.name === 'projectId')

    if (!fileData || !projectIdData) {
        throw createError({
            statusCode: 400,
            message: 'File and projectId are required'
        })
    }

    const projectId = projectIdData.data.toString()

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

    // Validate file type
    const filename = fileData.filename || 'script.txt'
    const fileExtension = filename.split('.').pop()?.toLowerCase() as 'txt' | 'pdf' | 'docx' | 'pptx'

    if (!['txt', 'pdf', 'docx', 'pptx'].includes(fileExtension)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid file type. Supported formats: txt, pdf, docx, pptx'
        })
    }

    // Upload to S3
    const s3Key = `projects/${projectId}/scripts/${Date.now()}-${filename}`
    const contentType = {
        txt: 'text/plain',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    }[fileExtension]

    const uploadResult = await uploadToS3(s3Key, fileData.data, contentType)

    // Parse document to extract text
    let parsedText = ''
    try {
        const parsed = await parseDocument(fileData.data, fileExtension)
        parsedText = parsed.text
    } catch (error) {
        console.error('Failed to parse document:', error)
        // Continue even if parsing fails, we have the file in S3
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        {
            $set: {
                'input.scriptFile': {
                    originalName: filename,
                    s3Key: uploadResult.key,
                    s3Url: uploadResult.url,
                    fileType: fileExtension,
                    uploadedAt: new Date()
                }
            }
        },
        { new: true }
    )

    return {
        success: true,
        data: {
            project: updatedProject,
            parsedText // Return parsed text for immediate use
        }
    }
})
