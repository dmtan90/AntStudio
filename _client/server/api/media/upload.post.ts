import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { Media } from '../../models/Media'
import { User } from '../../models/User'
import { uploadToS3 } from '../../utils/s3'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    const formData = await readMultipartFormData(event)
    if (!formData || !formData.length) {
        throw createError({
            statusCode: 400,
            message: 'No file uploaded'
        })
    }

    const file = formData.find(item => item.name === 'file')
    const purpose = formData.find(item => item.name === 'purpose')?.data.toString() || 'general'

    if (!file || !file.data) {
        throw createError({
            statusCode: 400,
            message: 'File is required'
        })
    }

    await connectDB()

    try {
        const size = file.data.length

        // Remove legacy quota check

        // 2. Upload to S3
        const fileName = file.filename || 'unnamed-file'
        const contentType = file.type || 'application/octet-stream'
        const key = `${purpose === 'avatar' ? 'avatars' : 'media'}/${user.id}/${Date.now()}-${fileName}`

        const uploadResult = await uploadToS3(key, file.data, contentType)

        const config = useRuntimeConfig()

        // 3. Create Media record
        const media = await Media.create({
            userId: user._id,
            key: uploadResult.key,
            fileName: fileName,
            contentType,
            size,
            bucket: config.awsS3Bucket,
            purpose
        })

        return {
            success: true,
            data: {
                key: uploadResult.key,
                url: uploadResult.key, // frontend uses this
                media
            }
        }
    } catch (error: any) {
        console.error('Unified Upload Error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to upload media'
        })
    }
})
