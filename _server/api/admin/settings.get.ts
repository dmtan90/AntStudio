import { getAdminSettings } from '../../models/AdminSettings'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const admin = event.context.user
    if (!admin || admin.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' })
    }

    try {
        const settings = await getAdminSettings()
        return settings
    } catch (error: any) {
        throw createError({ statusCode: 500, message: error.message })
    }
})
