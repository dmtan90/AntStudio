import { User } from '~/server/models/User'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user || user.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    const userId = getRouterParam(event, 'id')

    try {
        const targetUser = await User.findById(userId).select('-passwordHash')

        if (!targetUser) {
            throw createError({ statusCode: 404, message: 'User not found' })
        }

        return { user: targetUser }
    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to fetch user'
        })
    }
})
