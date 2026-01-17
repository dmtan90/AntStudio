import jwt from 'jsonwebtoken'
import type { IUser } from '../models/User'

export interface JWTPayload {
    userId: string
    email: string
    role: string
}

export const generateToken = (user: IUser): string => {
    const config = useRuntimeConfig()

    const payload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
    }

    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: '7d'
    })
}

export const verifyToken = (token: string): JWTPayload | null => {
    const config = useRuntimeConfig()

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload
        return decoded
    } catch (error) {
        return null
    }
}

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    return authHeader.substring(7)
}

export const extractTokenFromCookie = (cookieHeader: string | undefined): string | null => {
    if (!cookieHeader) {
        return null
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
    }, {} as Record<string, string>)

    return cookies['auth-token'] || null
}
