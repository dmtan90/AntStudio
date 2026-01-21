import { User } from '../../../models/User'
import { connectDB } from '../../../utils/db'
import { getFacebookUserToken, getFacebookPages } from '../../../utils/facebook'

export default defineEventHandler(async (event) => {
    await connectDB()

    const query = getQuery(event)
    const code = query.code as string
    const state = query.state as string

    if (!code) {
        throw createError({
            statusCode: 400,
            message: 'Code missing from Facebook callback'
        })
    }

    try {
        const userAccessToken = await getFacebookUserToken(code)
        const pages = await getFacebookPages(userAccessToken)

        if (!pages || pages.length === 0) {
            throw createError({
                statusCode: 400,
                message: 'No Facebook pages found for this account'
            })
        }

        // Pick the first page as default or let user choose later
        const page = pages[0]

        // Identify user from state
        const userId = state
        const user = await User.findById(userId)

        if (!user) {
            throw createError({
                statusCode: 404,
                message: 'User not found'
            })
        }

        // Update user social accounts
        user.socialAccounts.facebook = {
            accessToken: page.access_token,
            pageId: page.id
        }

        await user.save()

        // Redirect back to integrations page
        return sendRedirect(event, '/settings/integrations?success=facebook')
    } catch (error: any) {
        console.error('Facebook callback error:', error)
        return sendRedirect(event, '/settings/integrations?error=facebook_failed')
    }
})
