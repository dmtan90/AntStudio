import { User, UserRole } from '../models/User.js'
import { AIModelCost, AIModelType, getAdminSettings } from '../models/AdminSettings.js'
import { creditManager, ServiceType } from './CreditManager.js'
import { Logger } from './Logger.js'
import { ConfigService  } from './ConfigService.js'

// export const CREDIT_PRICES = {
//     IMAGE_GEN: 5,
//     VIDEO_GEN_PER_SECOND: 5, // Matching price table in AccountDialog
//     MUSIC_GEN: 10,
//     VOICE_GEN: 2,
//     LLM_CHAT: 5
// }

/**
 * Checks if credit mode is enabled.
 * Default is disabled if no Payment Gateway (Stripe/PayPal) is configured.
 */
export const isCreditModeEnabled = async (): Promise<boolean> => {
    const config = ConfigService.getInstance();
    if (!config.creditModeEnabled) {
        return false;
    }
    return config.paymentEnabled;
}

/**
 * Resolves the credit cost for a specific action/model
 */
export const getCreditCost = async (type: AIModelType, modelId?: string) => {
    const config = ConfigService.getInstance();
    const defaultModel = config.aiDefaultModels?.[type];
    const customModels = config.aiCustomModels;

    // 1. Check Task Defaults (Primary Source)
    if (defaultModel && defaultModel.creditCost !== undefined && (modelId == undefined || modelId == defaultModel.modelId)) {
        return defaultModel.creditCost
    }

    // 2. Custom: Try to find specific model cost if modelId provided
    const model = customModels?.find((m: any) => m.modelId === modelId && m.type == type && m.isActive)
    if (model) return model.creditCost

    // 3. Custom: Fallback to category defaults from old models list
    // const categoryModels = settings.aiSettings?.models?.filter(m => m.type === type && m.isActive)
    // if (categoryModels && categoryModels.length > 0) {
    //     return categoryModels[0].creditCost
    // }

    // 4. Hardcoded fallbacks
    switch (type) {
        case AIModelType.IMAGE: return AIModelCost.IMAGE
        case AIModelType.VIDEO: return AIModelCost.VIDEO
        case AIModelType.AUDIO: return AIModelCost.AUDIO
        case AIModelType.TEXT: return AIModelCost.TEXT
        case AIModelType.MUSIC: return AIModelCost.MUSIC
        case AIModelType.AGENT: return AIModelCost.AGENT
        default: return 0
    }
}

/**
 * Checks if a user has enough credits and deducts them.
 * Logs the transaction to creditLogs.
 */
export const deductUserCredits = async (userId: string, serviceType: ServiceType, amount: number, description: string) => {
    if (!await isCreditModeEnabled()) {
        Logger.info(`[Credits] Bypassing credit deduction because credit mode is disabled.`);
        return true;
    }

    const user = await User.findById(userId);
    if (user && user.role === UserRole.SYS_ADMIN) {
        Logger.info(`[Credits] Bypassing credit deduction for sys-admin user: ${userId}`);
        return true;
    }

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
    if (!await isCreditModeEnabled()) {
        return true;
    }

    const user = await User.findById(userId);
    if (!user) return false;
    if (user.role === UserRole.SYS_ADMIN) {
        return true; // Sys-admin bypasses credit check
    }

    return (user.credits?.balance || 0) >= amount;
}
