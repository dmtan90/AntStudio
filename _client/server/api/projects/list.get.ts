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
        const status = query.status as string
        const search = query.search as string

        // Build filter
        const filter: any = { userId: user._id }
        if (status && status !== 'all') {
            filter.status = status
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        }

        // Get total count
        const total = await Project.countDocuments(filter)

        // Get projects
        const projects = await Project.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('title description status mode createdAt updatedAt finalVideo')
            .lean()

        return {
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        }
    } catch (error: any) {
        console.error('Error fetching projects:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to fetch projects'
        })
    }
})
