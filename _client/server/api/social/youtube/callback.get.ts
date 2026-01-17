import { User } from '../../../models/User'
import { connectDB } from '../../../utils/db'
import { getGoogleAuthClient } from '../../../utils/google'
import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
    await connectDB()

    const query = getQuery(event)
    const code = query.code as string
    const state = query.state as string // Should be userId or similar to verify

    if (!code) {
        throw createError({
            statusCode: 400,
            message: 'Code missing from Google callback'
        })
    }

    try {
        const auth = getGoogleAuthClient()
        const { tokens } = await auth.getToken(code)
        auth.setCredentials(tokens)

        const youtube = google.youtube({ version: 'v3', auth })
        const channelsResponse = await youtube.channels.list({
            part: ['id', 'snippet'],
            mine: true
        })

        const channel = channelsResponse.data.items?.[0]
        if (!channel) {
            throw createError({
                statusCode: 400,
                message: 'No YouTube channel found for this account'
            })
        }

        // Identify user from state (state should contain the userId we sent)
        const userId = state
        const user = await User.findById(userId)

        if (!user) {
            throw createError({
                statusCode: 404,
                message: 'User not found'
            })
        }

        // Update user social accounts
        user.socialAccounts.youtube = {
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || '',
            channelId: channel.id || ''
        }

        await user.save()

        // Redirect back to integrations page
        return sendRedirect(event, '/settings/integrations?success=youtube')
    } catch (error: any) {
        console.error('Google callback error:', error)
        return sendRedirect(event, '/settings/integrations?error=youtube_failed')
    }
})
