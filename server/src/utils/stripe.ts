import Stripe from 'stripe'
import { configService } from './configService.js'

export const getStripeClient = () => {
    const stripeConfig = configService.stripe;
    if (!stripeConfig.secretKey) {
        throw new Error('Stripe secret key not configured')
    }
    return new Stripe(stripeConfig.secretKey, {
        apiVersion: '2023-10-16' as any
    })
}

/**
 * Sync user subscription from Stripe invoice/webhook
 */
export const syncUserSubscription = async (stripeSubscriptionId: string) => {
    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    // Logic to find user and update subscription status
    // This will be called from webhook
}
