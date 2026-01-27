import { User } from '../models/User.js'
import { getAdminSettings } from '../models/AdminSettings.js'
import { creditManager, ServiceType } from './CreditManager.js'

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
export const getCreditCost = async (type: 'image' | 'video' | 'audio' | 'text' | 'music', modelId?: string) => {
    const settings = await getAdminSettings()

    // 1. Check Task Defaults (Primary Source)
    if (settings.aiSettings?.defaults?.[type]?.creditCost !== undefined) {
        return settings.aiSettings.defaults[type].creditCost
    }

    // 2. Legacy: Try to find specific model cost if modelId provided
    if (modelId) {
        const model = settings.aiSettings?.models?.find(m => m.id === modelId && m.isActive)
        if (model) return model.creditCost
    }

    // 3. Legacy: Fallback to category defaults from old models list
    const categoryModels = settings.aiSettings?.models?.filter(m => m.type === type && m.isActive)
    if (categoryModels && categoryModels.length > 0) {
        return categoryModels[0].creditCost
    }

    // 4. Hardcoded fallbacks (Emergency)
    switch (type) {
        case 'image': return CREDIT_PRICES.IMAGE_GEN
        case 'video': return CREDIT_PRICES.VIDEO_GEN_PER_SECOND
        case 'audio': return CREDIT_PRICES.VOICE_GEN
        case 'text': return CREDIT_PRICES.LLM_CHAT
        case 'music': return CREDIT_PRICES.MUSIC_GEN
        default: return 1
    }
}

/**
 * Checks if a user has enough credits and deducts them.
 * Logs the transaction to creditLogs.
 */
export const deductUserCredits = async (userId: string, serviceType: ServiceType, amount: number, description: string) => {
    const success = await creditManager.deductCredits(userId, serviceType, amount, description);
    if (!success) {
        throw new Error(`Insufficient credits. Required: ${amount}`);
    }
    return true;
}

export const deductCredits = deductUserCredits;

/**
 * Checks if a user has enough credits without deducting.
 */
export const hasSufficientCredits = async (userId: string, amount: number) => {
    const user = await User.findById(userId);
    if (!user) return false;
    return (user.credits?.balance || 0) >= amount;
}
