export default defineNuxtRouteMiddleware(async (to, from) => {
    // Check if user is authenticated and is admin
    if (process.client) {
        const token = localStorage.getItem('auth-token')
        if (!token) {
            return navigateTo('/login')
        }

        try {
            const { data } = await $fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            }) as any

            const user = data?.user
            if (!user || user.role !== 'admin') {
                return navigateTo('/')
            }
        } catch (error) {
            return navigateTo('/login')
        }
    }
})
