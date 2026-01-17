import axios from 'axios'
import { Buffer } from 'node:buffer'

/**
 * Facebook Graph API utility
 */
export const getFacebookAuthUrl = (state: string) => {
    const config = useRuntimeConfig()

    if (!config.facebookAppId || !config.facebookRedirectUri) {
        throw new Error('Facebook OAuth credentials not configured')
    }

    const scopes = [
        'pages_manage_posts',
        'publish_video',
        'pages_show_list',
        'public_profile',
        'email'
    ].join(',')

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.facebookAppId}&redirect_uri=${encodeURIComponent(config.facebookRedirectUri)}&state=${state}&scope=${scopes}`
}

/**
 * Exchange code for Facebook user access token
 */
export const getFacebookUserToken = async (code: string) => {
    const config = useRuntimeConfig()

    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
            client_id: config.facebookAppId,
            redirect_uri: config.facebookRedirectUri,
            client_secret: config.facebookAppSecret,
            code
        }
    })

    return response.data.access_token
}

/**
 * Get Facebook Pages for a user
 */
export const getFacebookPages = async (userAccessToken: string) => {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
            access_token: userAccessToken
        }
    })

    return response.data.data // List of pages with tokens
}

/**
 * Upload video to Facebook Page
 */
export const uploadToFacebook = async (options: {
    pageAccessToken: string
    pageId: string
    videoBuffer: Buffer
    title: string
    description: string
}) => {
    // Resumable upload is recommended for large videos
    // For simplicity, we use the basic upload for smaller videos first

    const formData = new FormData()
    formData.append('access_token', options.pageAccessToken)
    formData.append('title', options.title)
    formData.append('description', options.description)

    const blob = new Blob([options.videoBuffer], { type: 'video/mp4' })
    formData.append('source', blob)

    const response = await axios.post(`https://graph.facebook.com/v18.0/${options.pageId}/videos`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })

    return response.data
}
