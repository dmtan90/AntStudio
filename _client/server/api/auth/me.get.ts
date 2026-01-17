export default defineEventHandler(async (event) => {
    const user = event.context.user

    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Not authenticated'
        })
    }

    // Return current user data
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
                credits: user.credits,
                emailVerified: user.emailVerified,
                preferredLanguage: user.preferredLanguage,
                socialAccounts: {
                    youtube: !!user.socialAccounts?.youtube,
                    facebook: !!user.socialAccounts?.facebook
                }
            }
        }
    }
})
