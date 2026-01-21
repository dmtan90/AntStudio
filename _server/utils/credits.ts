import { User } from '../models/User'
import { getAdminSettings } from '../models/AdminSettings'
import { createError } from 'h3'

export const CREDIT_PRICES = {
    IMAGE_GEN: 5,
    VIDEO_GEN_PER_SECOND: 5, // Matching price table in AccountDialog
    MUSIC_GEN: 10,
    VOICE_GEN: 2,
    LLM_CHAT: 5
}

/**
 * Resolves the credit cost for a specific action/model
 */
export const getCreditCost = async (type: 'image' | 'video' | 'audio' | 'text', modelId?: string) => {
    const settings = await getAdminSettings()

    // 1. Try to find specific model cost
    if (modelId) {
        const model = settings.aiSettings?.models?.find(m => m.id === modelId && m.isActive)
        if (model) return model.creditCost
    }

    // 2. Fallback to category defaults from settings
    const categoryModels = settings.aiSettings?.models?.filter(m => m.type === type && m.isActive)
    if (categoryModels && categoryModels.length > 0) {
        // Return average or first? Let's return the first active one as default for that category
        return categoryModels[0].creditCost
    }

    // 3. Hardcoded fallbacks
    switch (type) {
        case 'image': return CREDIT_PRICES.IMAGE_GEN
        case 'video': return CREDIT_PRICES.VIDEO_GEN_PER_SECOND
        case 'audio': return CREDIT_PRICES.MUSIC_GEN
        case 'text': return CREDIT_PRICES.LLM_CHAT
        default: return 1
    }
}

/**
 * Checks if a user has enough credits and deducts them.
 * Logs the transaction to creditLogs.
 */
export const deductCredits = async (userId: string, amount: number, description: string) => {
    const user = await User.findById(userId)
    if (!user) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Initialize credits if missing
    if (!user.credits) {
        user.credits = { balance: 0, membership: 0, bonus: 0, weekly: 0 }
    }

    const { membership = 0, balance = 0, bonus = 0, weekly = 0 } = user.credits
    const totalAvailable = membership + balance + bonus + weekly

    if (totalAvailable < amount) {
        throw createError({
            statusCode: 402,
            statusMessage: `Insufficient credits. Required: ${amount}, Available: ${totalAvailable}`
        })
    }

    // Deduction logic (Waterfall: Weekly -> Membership -> Balance -> Bonus)
    let remaining = amount

    // 1. Weekly (Use it or lose it)
    if (user.credits.weekly >= remaining) {
        user.credits.weekly -= remaining
        remaining = 0
    } else {
        remaining -= user.credits.weekly
        user.credits.weekly = 0
    }

    // 2. Membership (Monthly allocation)
    if (remaining > 0) {
        if (user.credits.membership >= remaining) {
            user.credits.membership -= remaining
            remaining = 0
        } else {
            remaining -= user.credits.membership
            user.credits.membership = 0
        }
    }

    // 3. Balance (Purchased top-up)
    if (remaining > 0) {
        if (user.credits.balance >= remaining) {
            user.credits.balance -= remaining
            remaining = 0
        } else {
            remaining -= user.credits.balance
            user.credits.balance = 0
        }
    }

    // 4. Bonus
    if (remaining > 0) {
        user.credits.bonus = Math.max(0, user.credits.bonus - remaining)
    }

    // Log transaction
    user.creditLogs.push({
        type: 'consumed',
        amount: amount,
        description: description,
        timestamp: new Date()
    })

    await user.save()
    return true
}
