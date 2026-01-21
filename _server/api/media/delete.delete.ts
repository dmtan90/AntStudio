import { defineEventHandler, readBody } from 'h3'
import { Media } from '~/server/models/Media'
import { User } from '~/server/models/User'
import { deleteFromS3 } from '~/server/utils/s3'

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user
        if (!user) {
            throw createError({
                statusCode: 401,
                message: 'Unauthorized'
            })
        }

        const body = await readBody(event)
        const { mediaId } = body

        if (!mediaId) {
            throw createError({
                statusCode: 400,
                message: 'Media ID is required'
            })
        }

        // Find media
        const media = await Media.findOne({ _id: mediaId, userId: user._id })
        if (!media) {
            throw createError({
                statusCode: 404,
                message: 'Media not found'
            })
        }

        // Delete from S3
        try {
            await deleteFromS3(media.key)
        } catch (s3Error) {
            console.error('Error deleting from S3:', s3Error)
            // Continue even if S3 deletion fails
        }

        // Update user storage
        await User.findByIdAndUpdate(user._id, {
            $inc: { 'quota.storageUsed': -media.size }
        })

        // Delete from database
        await Media.deleteOne({ _id: mediaId })

        return {
            success: true,
            message: 'Media deleted successfully'
        }
    } catch (error: any) {
        console.error('Error deleting media:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to delete media'
        })
    }
})
