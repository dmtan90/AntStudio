import { H3Event } from 'h3'
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '../utils/jwt'
import { User } from '../models/User'
import { connectDB } from '../utils/db'

export default defineEventHandler(async (event: H3Event) => {
    // Skip auth for public routes
    const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/youtube/callback',
        '/api/auth/facebook/callback'
    ]

    if (publicRoutes.includes(event.path)) {
        return
    }

    // Extract token from header or cookie
    const authHeader = getHeader(event, 'authorization')
    const cookieHeader = getHeader(event, 'cookie')

    const token = extractTokenFromHeader(authHeader) || extractTokenFromCookie(cookieHeader)

    if (!token) {
        // For non-auth API routes, return 401
        if (event.path.startsWith('/api/')) {
            throw createError({
                statusCode: 401,
                message: 'Authentication required'
            })
        }
        return
    }

    // Verify token
    const payload = verifyToken(token)

    if (!payload) {
        throw createError({
            statusCode: 401,
            message: 'Invalid or expired token'
        })
    }

    // Connect to DB and fetch user
    await connectDB()
    const user = await User.findById(payload.userId)

    if (!user || !user.isActive) {
        throw createError({
            statusCode: 401,
            message: 'User not found or inactive'
        })
    }

    // Attach user to event context
    event.context.user = user
})
