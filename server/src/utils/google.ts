import { google } from 'googleapis'
import { Buffer } from 'node:buffer'
import config from './config.js'

/**
 * Google OAuth 2.0 client utility
 */
export const getGoogleAuthClient = () => {

    if (!config.youtubeClientId || !config.youtubeClientSecret || !config.youtubeRedirectUri) {
        throw new Error('Google OAuth credentials not configured')
    }

    return new google.auth.OAuth2(
        config.youtubeClientId,
        config.youtubeClientSecret,
        config.youtubeRedirectUri
    )
}

/**
 * Generate Google Auth URL
 */
export const getGoogleAuthUrl = (state: string) => {
    const client = getGoogleAuthClient()
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        state
    })
}

/**
 * Upload video to YouTube
 */
export const uploadToYouTube = async (options: {
    accessToken: string
    refreshToken: string
    videoBuffer: Buffer
    title: string
    description: string
    tags?: string[]
    privacyStatus?: 'public' | 'private' | 'unlisted'
    categoryId?: string
}) => {
    const auth = getGoogleAuthClient()
    auth.setCredentials({
        access_token: options.accessToken,
        refresh_token: options.refreshToken
    })

    const youtube = google.youtube({ version: 'v3', auth })

    const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
            snippet: {
                title: options.title,
                description: options.description,
                tags: options.tags,
                categoryId: options.categoryId || '22' // 22: People & Blogs
            },
            status: {
                privacyStatus: options.privacyStatus || 'public',
                selfDeclaredMadeForKids: false
            }
        },
        media: {
            body: {
                body: options.videoBuffer,
            } as any,
        }
    })

    return response.data
}
