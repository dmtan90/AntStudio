import { defineEventHandler, createError, setHeader } from 'h3'
import { getS3Client } from '../../utils/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    const params = event.context.params || {}
    const rawSlug = params.slug || params._

    if (!rawSlug) {
        throw createError({
            statusCode: 400,
            message: 'Key is required'
        })
    }

    const slug = decodeURIComponent(rawSlug)

    const config = useRuntimeConfig()
    const client = getS3Client()

    try {
        const command = new GetObjectCommand({
            Bucket: config.awsS3Bucket,
            Key: slug
        })

        const response = await client.send(command)

        if (response.ContentType) {
            setHeader(event, 'Content-Type', response.ContentType)
        }
        if (response.ContentLength) {
            setHeader(event, 'Content-Length', response.ContentLength.toString())
        }

        // Cache control for performance
        setHeader(event, 'Cache-Control', 'public, max-age=3600')

        return response.Body
    } catch (error: any) {
        console.error('S3 Proxy Error:', error)
        throw createError({
            statusCode: 404,
            message: 'File not found'
        })
    }
})
