import { defineEventHandler, getQuery } from 'h3'
import { Project } from '~/server/models/Project'

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user
        if (!user) {
            throw createError({
                statusCode: 401,
                message: 'Unauthorized'
            })
        }

        const query = getQuery(event)
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 12
        const projectId = query.projectId as string

        // Build filter - only get projects with finalVideo
        const filter: any = {
            userId: user._id,
            'finalVideo.s3Key': { $exists: true }
        }

        if (projectId) {
            filter._id = projectId
        }

        // Get total count
        const total = await Project.countDocuments(filter)

        // Get projects with videos
        const projects = await Project.find(filter)
            .sort({ 'finalVideo.generatedAt': -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('title finalVideo createdAt')
            .lean()

        // Transform to video list
        const videos = projects.map(project => ({
            _id: project._id,
            projectTitle: project.title,
            s3Key: project.finalVideo?.s3Key,
            s3Url: project.finalVideo?.s3Url,
            duration: project.finalVideo?.duration,
            resolution: project.finalVideo?.resolution,
            fileSize: project.finalVideo?.fileSize,
            generatedAt: project.finalVideo?.generatedAt,
            createdAt: project.createdAt
        }))

        return {
            success: true,
            data: {
                videos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        }
    } catch (error: any) {
        console.error('Error fetching videos:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to fetch videos'
        })
    }
})
