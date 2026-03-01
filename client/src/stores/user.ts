import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner'

export const useUserStore = defineStore('user', () => {
    const { t } = useI18n()
    const user = ref<any>(null)
    const creditLogs = ref<any[]>([])
    const token = ref<string | null>(localStorage.getItem('auth-token'))

    // URL Token Absorption (OAuth Support)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken && !token.value) {
        token.value = urlToken;
        localStorage.setItem('auth-token', urlToken);
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
    }
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
            const res: any = await api.get('/auth/me')
            setUser(res.data.user)
        } catch (error) {
            console.error('Failed to fetch profile:', error)
            // Error handling for fetchProfile is usually silent unless forced
        } finally {
            isInitialized.value = true
        }
    }

    async function login(credentials: any) {
        try {
            const res: any = await api.post('/auth/login', credentials)
            const { token: newToken, user: userData } = res.data
            setToken(newToken)
            setUser(userData)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function register(payload: any) {
        try {
            const res: any = await api.post('/auth/register', payload)
            if (res.data.token) {
                token.value = res.data.token
                user.value = res.data.user
                setToken(res.data.token)
            }
            return res.data
        } catch (error) {
            throw error
        }
    }

    async function registerOwner(payload: any) {
        try {
            const res: any = await api.post('/auth/register-owner', payload)
            // Owner registration might not auto-login or might return token
            if (res.data.token) {
                token.value = res.data.token
                user.value = res.data.user
                setToken(res.data.token)
            }
            return res.data
        } catch (error) {
            throw error
        }
    }

    async function updateProfile(profileData: any) {
        try {
            const res: any = await api.put('/auth/profile', profileData)
            setUser(res.data.user)
            toast.success(t('common.updateSuccess'))
            return res.data
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
            const res: any = await api.get('/payment/transactions')
            return res.data.transactions || []
        } catch (error) {
            handleError(error)
            return []
        }
    }

    async function fetchPlans() {
        try {
            const res: any = await api.get('/admin/settings/plans')
            return res.data.plans
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function createCheckoutSession(payload: any) {
        try {
            const res: any = await api.post('/payment/create-checkout', payload)
            if (res.data?.url) {
                window.location.href = res.data.url
            }
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function createPayPalOrder(payload: { planName?: string, packageId?: string, billingPeriod?: string }) {
        try {
            const res: any = await api.post('/payment/paypal/create-order', payload)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function purchaseCredits(packageId: string) {
        return createCheckoutSession({ packageId, type: 'credit' })
    }

    async function fetchOAuthConfig() {
        try {
            const res: any = await api.get('/auth/oauth-config')
            return res.data
        } catch (error) {
            console.error('Failed to fetch OAuth config:', error)
            return { google: false, facebook: false }
        }
    }

    function logout() {
        clearAuth()
        window.location.href = '/login'
    }

    async function fetchCreditHistory() {
        loadingHistory.value = true
        try {
            const res: any = await api.get('/auth/credits/history')
            creditLogs.value = res.data || []
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
            const res: any = await api.post('/auth/forgot-password', { email })
            toast.success(res.data?.message)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function resetPassword(data: any) {
        try {
            const res: any = await api.post('/auth/reset-password', data)
            toast.success(res.data?.message)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function uploadAvatar(formData: FormData) {
        try {
            const res: any = await api.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return res.data
        } catch (error) {
            handleError(error, 'profile.uploadFailed')
            throw error
        }
    }

    async function connectSocial(provider: 'youtube' | 'facebook') {
        try {
            const res: any = await api.get(`/social/connect?provider=${provider}`)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function disconnectSocial(provider: 'youtube' | 'facebook') {
        try {
            const res: any = await api.post(`/social/disconnect`, { provider })
            return res.data
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
        systemMode: computed(() => user.value?.systemMode || 'edge'),
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
        createPayPalOrder,
        logout,
        forgotPassword,
        resetPassword,
        creditLogs,
        loadingHistory,
        fetchCreditHistory,
        purchaseCredits,
        fetchOAuthConfig,
        uploadAvatar,
        connectSocial,
        disconnectSocial,
        registerOwner
    }
})
