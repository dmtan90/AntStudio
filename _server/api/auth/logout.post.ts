export default defineEventHandler(async (event) => {
    // Clear auth cookie
    deleteCookie(event, 'auth-token')

    return {
        success: true,
        message: 'Logged out successfully'
    }
})
