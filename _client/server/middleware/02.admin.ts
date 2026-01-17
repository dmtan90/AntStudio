import { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    // Only check for admin routes
    if (!event.path.startsWith('/api/admin/')) {
        return
    }

    const user = event.context.user

    if (!user || user.role !== 'admin') {
        throw createError({
            statusCode: 403,
            message: 'Admin access required'
        })
    }
})
