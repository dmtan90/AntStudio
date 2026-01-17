import { defineEventHandler, getQuery } from 'h3'
import { Media } from '~/server/models/Media'

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
        const limit = parseInt(query.limit as string) || 20
        const fileType = query.fileType as string
        const search = query.search as string

        // Build filter
        const filter: any = { userId: user._id }

        // Filter by file type category
        if (fileType) {
            if (fileType === 'images') {
                filter.contentType = { $regex: '^image/', $options: 'i' }
            } else if (fileType === 'videos') {
                filter.contentType = { $regex: '^video/', $options: 'i' }
            } else if (fileType === 'documents') {
                filter.contentType = {
                    $in: [
                        'application/pdf',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'application/msword',
                        'application/vnd.ms-powerpoint'
                    ]
                }
            }
        }

        if (search) {
            filter.fileName = { $regex: search, $options: 'i' }
        }

        // Get total count
        const total = await Media.countDocuments(filter)

        // Get media files
        const media = await Media.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()

        return {
            success: true,
            data: {
                media,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        }
    } catch (error: any) {
        console.error('Error fetching media:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to fetch media'
        })
    }
})
