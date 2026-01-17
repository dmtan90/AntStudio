import { User } from '../../../../models/User'
import { connectDB } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const admin = event.context.user
    if (!admin || admin.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    const userId = getRouterParam(event, 'id')
    const body = await readBody(event)

    try {
        const user = await User.findByIdAndUpdate(userId, { isActive: body.isActive }, { new: true })
        if (!user) {
            throw createError({ statusCode: 404, message: 'User not found' })
        }
        return { success: true, user }
    } catch (error: any) {
        throw createError({ statusCode: 500, message: error.message })
    }
})
