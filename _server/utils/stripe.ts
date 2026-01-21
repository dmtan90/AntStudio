import Stripe from 'stripe'

export const getStripeClient = () => {
    const config = useRuntimeConfig()
    if (!config.stripeSecretKey) {
        throw new Error('Stripe secret key not configured')
    }
    return new Stripe(config.stripeSecretKey, {
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
