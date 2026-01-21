import { getStripeClient } from '../../utils/stripe'
import { User } from '../../models/User'
import { Payment } from '../../models/Payment'
import { getAdminSettings } from '../../models/AdminSettings'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const config = useRuntimeConfig()
    const stripe = getStripeClient()
    const signature = getHeader(event, 'stripe-signature')
    const rawBody = await readRawBody(event)

    if (!signature || !rawBody) {
        throw createError({
            statusCode: 400,
            message: 'Missing stripe signature or body'
        })
    }

    let stripeEvent: any

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            config.stripeWebhookSecret as string
        )
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        throw createError({
            statusCode: 400,
            message: `Webhook Error: ${err.message}`
        })
    }

    // Handle the event
    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            const session = stripeEvent.data.object
            const userId = session.metadata.userId
            const planName = session.metadata.planName

            if (userId && planName) {
                await handleSuccessfulPayment(userId, planName, session)
            }
            break
        }
        case 'invoice.paid': {
            const invoice = stripeEvent.data.object
            // Handle recurring payments
            break
        }
        case 'customer.subscription.deleted': {
            const subscription = stripeEvent.data.object
            // Handle subscription cancellation
            break
        }
    }

    return { received: true }
})

async function handleSuccessfulPayment(userId: string, productName: string, session: any) {
    const settings = await getAdminSettings()
    const user = await User.findById(userId)

    if (!user) return

    // 1. Check if it's a Credit Package
    const creditPackage = settings.creditPackages.find(p => p.name === productName || p.id === productName)
    if (creditPackage) {
        user.credits.balance = (user.credits.balance || 0) + creditPackage.credits
        user.creditLogs.push({
            type: 'obtained',
            amount: creditPackage.credits,
            description: `Purchased ${creditPackage.name}`,
            timestamp: new Date()
        })
        await user.save()

        await Payment.create({
            userId: user._id,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'completed',
            type: 'credit_purchase',
            plan: productName,
            stripePaymentIntentId: session.payment_intent as string,
            metadata: session.metadata
        })
        return
    }

    // 2. Check if it's a Subscription Plan
    const plan = settings.plans.find(p => p.name === productName)
    if (plan) {
        // Update user subscription
        user.subscription = {
            plan: plan.name.toLowerCase() as any,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string
        }

        // Update Membership Credits (Reset monthly)
        // Ensure credits structure exists
        if (!user.credits) user.credits = { balance: 0, membership: 0, bonus: 0, weekly: 0 }

        user.credits.membership = plan.features.monthlyCredits || 0

        await user.save()

        // Create payment record
        await Payment.create({
            userId: user._id,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'completed',
            type: 'subscription',
            plan: plan.name,
            stripePaymentIntentId: session.payment_intent as string,
            metadata: session.metadata
        })
    }
}
