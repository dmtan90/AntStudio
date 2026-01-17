import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { Project } from '../../../models/Project'
import { uploadToS3 } from '../../../utils/s3'
import { connectDB } from '../../../utils/db'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    const projectId = getRouterParam(event, 'id')
    const formData = await readMultipartFormData(event)

    if (!formData || !formData.length) {
        throw createError({
            statusCode: 400,
            message: 'No file uploaded'
        })
    }

    const file = formData.find(item => item.name === 'file')
    const duration = formData.find(item => item.name === 'duration')?.data.toString()

    if (!file || !file.data) {
        throw createError({
            statusCode: 400,
            message: 'File is required'
        })
    }

    await connectDB()

    try {
        const project = await Project.findById(projectId)
        if (!project) {
            throw createError({ statusCode: 404, message: 'Project not found' })
        }

        if (project.userId.toString() !== user._id.toString()) {
            throw createError({ statusCode: 403, message: 'Forbidden' })
        }

        const fileName = `final-video-${Date.now()}.mp4`
        const key = `projects/${projectId}/${fileName}`
        const uploadResult = await uploadToS3(key, file.data, 'video/mp4')

        project.finalVideo = {
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            duration: duration ? parseFloat(duration) : project.storyboard?.totalDuration || 0,
            resolution: '1920x1080', // Defaulted to what we mux at
            fileSize: file.data.length,
            generatedAt: new Date()
        }
        project.status = 'completed'
        await project.save()

        return {
            success: true,
            data: project
        }
    } catch (error: any) {
        console.error('Final Video Upload Error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to upload final video'
        })
    }
})
