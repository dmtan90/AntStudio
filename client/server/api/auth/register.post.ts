import { User } from '../../models/User'
import { connectDB } from '../../utils/db'
import { generateToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    await connectDB()

    const body = await readBody(event)
    const { email, password, name } = body

    // Validation
    if (!email || !password || !name) {
        throw createError({
            statusCode: 400,
            message: 'Email, password, and name are required'
        })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid email format'
        })
    }

    // Password strength validation
    if (password.length < 8) {
        throw createError({
            statusCode: 400,
            message: 'Password must be at least 8 characters long'
        })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw createError({
            statusCode: 409,
            message: 'User with this email already exists'
        })
    }

    // Create new user
    const user = await User.create({
        email: email.toLowerCase(),
        passwordHash: password, // Will be hashed by pre-save middleware
        name,
        role: 'user',
        emailVerified: false,
        isActive: true,
        credits: {
            balance: 0,
            membership: 500, // Default Free Tier Credits
            bonus: 0,
            weekly: 0
        }
    })

    // Generate token
    const token = generateToken(user)

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
                credits: user.credits
            },
            token
        }
    }
})
