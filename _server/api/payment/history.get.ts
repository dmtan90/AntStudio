import { Payment } from '../../models/Payment'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    try {
        const payments = await Payment.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(20)

        return {
            success: true,
            data: {
                payments
            }
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch payment history'
        })
    }
})
