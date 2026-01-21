import { AdminSettings } from '../../models/AdminSettings'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const admin = event.context.user
    if (!admin || admin.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    const body = await readBody(event)

    try {
        const settings = await AdminSettings.findOneAndUpdate({}, body, { new: true, upsert: true })
        return { success: true, settings }
    } catch (error: any) {
        throw createError({ statusCode: 500, message: error.message })
    }
})
