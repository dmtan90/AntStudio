import { getAdminSettings } from '../../../models/AdminSettings'
import { connectDB } from '../../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    try {
        const settings = await getAdminSettings()
        return {
            success: true,
            data: {
                plans: settings.plans
            }
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch pricing plans'
        })
    }
})
