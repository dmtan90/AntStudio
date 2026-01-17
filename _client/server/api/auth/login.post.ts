import { User } from '../../models/User'
import { connectDB } from '../../utils/db'
import { generateToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    await connectDB()

    const body = await readBody(event)
    const { email, password } = body

    // Validation
    if (!email || !password) {
        throw createError({
            statusCode: 400,
            message: 'Email and password are required'
        })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Invalid email or password'
        })
    }

    // Check if user is active
    if (!user.isActive) {
        throw createError({
            statusCode: 403,
            message: 'Account is disabled. Please contact support.'
        })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
        throw createError({
            statusCode: 401,
            message: 'Invalid email or password'
        })
    }

    // Generate token
    const token = generateToken(user)

    // Set cookie
    setCookie(event, 'auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    })

    // Return user data (without password) and token
    return {
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                subscription: user.subscription,
                quota: user.quota,
                emailVerified: user.emailVerified
            },
            token
        }
    }
})
