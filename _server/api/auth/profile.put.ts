import { defineEventHandler, readBody, createError } from 'h3'
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { name, avatar, preferredLanguage } = body
    const user = event.context.user

    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    const dbUser = await User.findById(user._id || user.id)
    if (!dbUser) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        })
    }

    if (name) dbUser.name = name
    if (avatar) dbUser.avatar = avatar
    if (preferredLanguage) dbUser.preferredLanguage = preferredLanguage

    await dbUser.save()

    return {
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: dbUser._id,
                name: dbUser.name,
                email: dbUser.email,
                avatar: dbUser.avatar,
                preferredLanguage: dbUser.preferredLanguage,
                subscription: dbUser.subscription,
                quota: dbUser.quota
            }
        }
    }
})
