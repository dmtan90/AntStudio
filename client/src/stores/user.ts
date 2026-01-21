import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useUserStore = defineStore('user', () => {
    const { t } = useTranslations()
    const user = ref<any>(null)
    const creditLogs = ref<any[]>([])
    const token = ref<string | null>(localStorage.getItem('auth-token'))
    const isAuthenticated = computed(() => !!user.value)
    const isInitialized = ref(false)
    const loadingHistory = ref(false)
    const lastFetch = ref(0)
    const refreshInterval = 5 * 60 * 1000 // 5 minutes

    function setToken(newToken: string) {
        token.value = newToken
        localStorage.setItem('auth-token', newToken)
    }

    function setUser(userData: any) {
        user.value = userData
        lastFetch.value = Date.now()
    }

    function clearAuth() {
        user.value = null
        token.value = null
        localStorage.removeItem('auth-token')
        isInitialized.value = true
    }

    function handleError(error: any, defaultKey: string = 'common.failed') {
        const message = error.response?.data?.error || error.message || t(defaultKey)
        toast.error(t(message))
        return message
    }

    async function fetchProfile(force = false) {
        const now = Date.now()
        if (!force && user.value && (now - lastFetch.value < refreshInterval)) {
            return
        }

        if (!token.value) {
            isInitialized.value = true
            return
        }

        try {
            const response = await api.get('/auth/me')
            setUser(response.data.user)
        } catch (error) {
            console.error('Failed to fetch profile:', error)
            // Error handling for fetchProfile is usually silent unless forced
        } finally {
            isInitialized.value = true
        }
    }

    async function login(credentials: any) {
        try {
            const response = await api.post('/auth/login', credentials)
            const { token: newToken, user: userData } = response.data
            setToken(newToken)
            setUser(userData)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function register(userData: any) {
        try {
            const response = await api.post('/auth/register', userData)
            const { token: newToken, user: createdUser } = response.data
            setToken(newToken)
            setUser(createdUser)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function updateProfile(profileData: any) {
        try {
            const response = await api.put('/auth/profile', profileData)
            setUser(response.data.user)
            toast.success(t('common.updateSuccess'))
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function changePassword(data: any) {
        try {
            await api.post('/auth/change-password', data)
            toast.success(t('password.success'))
        } catch (error) {
            handleError(error, 'password.failed')
            throw error
        }
    }

    async function fetchPaymentHistory() {
        try {
            const response = await api.get('/payment/history')
            return response.data.payments || []
        } catch (error) {
            handleError(error)
            return []
        }
    }

    async function fetchPlans() {
        try {
            const response = await api.get('/admin/settings/plans')
            return response.data.plans
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function createCheckoutSession(payload: { planName?: string, packageId?: string, billingPeriod?: string }) {
        try {
            const response = await api.post('/payment/create-checkout', payload)
            if (response.data?.data?.url) {
                window.location.href = response.data.data.url
            }
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function purchaseCredits(packageId: string) {
        return createCheckoutSession({ packageId })
    }

    function logout() {
        clearAuth()
        window.location.href = '/login'
    }

    async function fetchCreditHistory() {
        loadingHistory.value = true
        try {
            const response = await api.get('/auth/credits/history')
            creditLogs.value = response.data || []
            return creditLogs.value
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loadingHistory.value = false
        }
    }

    async function forgotPassword(email: string) {
        try {
            const response = await api.post('/auth/forgot-password', { email })
            toast.success(response.data?.data?.message || response.data?.message)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function resetPassword(data: any) {
        try {
            const response = await api.post('/auth/reset-password', data)
            toast.success(response.data?.data?.message || response.data?.message)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        isInitialized,
        lastFetch,
        setToken,
        setUser,
        clearAuth,
        fetchProfile,
        login,
        register,
        updateProfile,
        changePassword,
        fetchPaymentHistory,
        fetchPlans,
        createCheckoutSession,
        logout,
        forgotPassword,
        resetPassword,
        creditLogs,
        loadingHistory,
        fetchCreditHistory,
        purchaseCredits
    }
})
