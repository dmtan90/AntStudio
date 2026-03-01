import axios from 'axios'
import { Buffer } from 'node:buffer'
import config from './config.js'
import { Logger } from './Logger.js'

/**
 * Google OAuth 2.0 client utility - Simplified for direct API calls
 */
export const getGoogleAuthClient = () => {
    if (!config.youtubeClientId || !config.youtubeClientSecret || !config.youtubeRedirectUri) {
        throw new Error('Google OAuth credentials not configured')
    }
    
    // We only need the config for manual URL generation or token exchange if needed
    // But for direct API calls, we just use the access token.
    return {
        clientId: config.youtubeClientId,
        clientSecret: config.youtubeClientSecret,
        redirectUri: config.youtubeRedirectUri
    }
}

/**
 * Generate Google Auth URL
 */
export const getGoogleAuthUrl = (state: string) => {
    const { clientId, redirectUri } = getGoogleAuthClient()
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' '),
        state
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Upload video to YouTube using Resumable Upload Protocol (Direct REST API)
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
    try {
        Logger.info(`🚀 [YouTube Utils] Starting direct resumable upload`, 'google-utils');

        // 1. Initiate resumable upload session
        const initiateRes = await axios.post(
            'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
            {
                snippet: {
                    title: options.title,
                    description: options.description,
                    tags: options.tags,
                    categoryId: options.categoryId || '22'
                },
                status: {
                    privacyStatus: options.privacyStatus || 'public',
                    selfDeclaredMadeForKids: false
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${options.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const uploadUrl = initiateRes.headers['location'];
        if (!uploadUrl) {
            throw new Error('Failed to get YouTube upload location');
        }

        Logger.info(`🚀 [YouTube Utils] Session created: ${uploadUrl}`, 'google-utils');

        // 2. Upload the video buffer
        const uploadRes = await axios.put(uploadUrl, options.videoBuffer, {
            headers: {
                'Content-Type': 'video/mp4'
            }
        });

        return uploadRes.data;
    } catch (error: any) {
        Logger.error(`❌ [YouTube Utils] Upload failed: ${error.response?.data?.error?.message || error.message}`, 'google-utils');
        throw error;
    }
}
