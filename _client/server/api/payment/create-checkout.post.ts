import { getStripeClient } from '../../utils/stripe'
import { getAdminSettings } from '../../models/AdminSettings'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    const body = await readBody(event)
    const { planName } = body

    if (!planName) {
        throw createError({
            statusCode: 400,
            message: 'Plan name is required'
        })
    }

    try {
        const settings = await getAdminSettings()
        const plan = settings.plans.find(p => p.name === planName)

        if (!plan) {
            throw createError({
                statusCode: 404,
                message: 'Plan not found'
            })
        }

        const stripe = getStripeClient()
        const config = useRuntimeConfig()

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: plan.currency || 'usd',
                        product_data: {
                            name: `AntFlow ${plan.name} Plan`,
                            description: `${plan.features.videosPerMonth} videos/month, ${plan.features.storageLimit}GB storage`,
                        },
                        unit_amount: plan.price * 100, // Stripe expects amount in cents
                        recurring: {
                            interval: plan.interval || 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${config.publicBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.publicBaseUrl}/pricing`,
            customer_email: user.email,
            metadata: {
                userId: user._id.toString(),
                planName: plan.name
            }
        })

        return {
            url: session.url
        }
    } catch (error: any) {
        console.error('Stripe checkout error:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to create checkout session'
        })
    }
})
