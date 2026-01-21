import { getGoogleAuthUrl } from '../../utils/google'
import { getFacebookAuthUrl } from '../../utils/facebook'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    const query = getQuery(event)
    const provider = query.provider as string

    if (provider === 'youtube') {
        return { url: getGoogleAuthUrl(user._id.toString()) }
    } else if (provider === 'facebook') {
        return { url: getFacebookAuthUrl(user._id.toString()) }
    } else {
        throw createError({
            statusCode: 400,
            message: 'Invalid provider'
        })
    }
})
