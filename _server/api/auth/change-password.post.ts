import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcryptjs'
import { User } from '~/server/models/User'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { current, new: newPassword } = body
    const user = event.context.user

    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    if (!current || !newPassword) {
        throw createError({
            statusCode: 400,
            message: 'Current and new password are required'
        })
    }

    const dbUser = await User.findById(user.id)
    if (!dbUser) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        })
    }

    const isMatch = await dbUser.comparePassword(current)
    if (!isMatch) {
        throw createError({
            statusCode: 400,
            message: 'Current password is incorrect'
        })
    }

    dbUser.passwordHash = newPassword
    await dbUser.save()

    return {
        message: 'Password updated successfully'
    }
})
