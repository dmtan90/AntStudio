import { Project } from '../../../models/Project'
import { User } from '../../../models/User'
import { connectDB } from '../../../utils/db'
import { getFromS3 } from '../../../utils/s3'
import { uploadToYouTube } from '../../../utils/google'
import { uploadToFacebook } from '../../../utils/facebook'

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
    const body = await readBody(event)
    const { platforms, title, description, tags, privacy, categoryId } = body

    const project = await Project.findOne({ _id: projectId, userId: user._id })
    if (!project) {
        throw createError({
            statusCode: 404,
            message: 'Project not found'
        })
    }

    if (!project.finalVideo?.s3Key) {
        throw createError({
            statusCode: 400,
            message: 'No final video generated for this project'
        })
    }

    // Fetch full user to get social tokens
    const fullUser = await User.findById(user._id)

    const results: any = {}

    try {
        // 1. Download video from S3
        const videoData = await getFromS3(project.finalVideo.s3Key)

        // Convert stream to Buffer
        const chunks: Uint8Array[] = []
        for await (const chunk of videoData as any) {
            chunks.push(chunk)
        }
        const videoBuffer = Buffer.concat(chunks) as unknown as Buffer

        // 2. Publish to YouTube
        if (platforms.includes('youtube') && fullUser?.socialAccounts?.youtube?.accessToken) {
            try {
                const ytResult = await uploadToYouTube({
                    accessToken: fullUser.socialAccounts.youtube.accessToken,
                    refreshToken: fullUser.socialAccounts.youtube.refreshToken,
                    videoBuffer,
                    title: title || project.title,
                    description: description || project.description || '',
                    tags: tags || [],
                    privacyStatus: privacy || 'public',
                    categoryId: categoryId
                })

                project.publishing.youtube = {
                    videoId: ytResult.id || '',
                    url: `https://www.youtube.com/watch?v=${ytResult.id}`,
                    publishedAt: new Date(),
                    status: 'published'
                }
                results.youtube = { success: true, url: project.publishing.youtube.url }
            } catch (err: any) {
                console.error('YouTube publish error:', err)
                results.youtube = { success: false, error: err.message }
            }
        }

        // 3. Publish to Facebook
        if (platforms.includes('facebook') && fullUser?.socialAccounts?.facebook?.accessToken) {
            try {
                const fbResult = await uploadToFacebook({
                    pageAccessToken: fullUser.socialAccounts.facebook.accessToken,
                    pageId: fullUser.socialAccounts.facebook.pageId,
                    videoBuffer,
                    title: title || project.title,
                    description: description || project.description || ''
                })

                project.publishing.facebook = {
                    videoId: fbResult.id || '',
                    url: `https://www.facebook.com/watch/?v=${fbResult.id}`,
                    publishedAt: new Date(),
                    status: 'published'
                }
                results.facebook = { success: true, url: project.publishing.facebook.url }
            } catch (err: any) {
                console.error('Facebook publish error:', err)
                results.facebook = { success: false, error: err.message }
            }
        }

        await project.save()

        return {
            success: true,
            data: results
        }
    } catch (error: any) {
        console.error('Publishing error:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to publish video'
        })
    }
})
