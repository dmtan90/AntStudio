
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    const user = ref<any>(null)
    const token = ref<string | null>(null)
    const isAuthenticated = ref(false)

    function setToken(newToken: string) {
        token.value = newToken
        localStorage.setItem('auth-token', newToken)
        isAuthenticated.value = true
    }

    function setUser(userData: any) {
        user.value = userData
    }

    function clearAuth() {
        user.value = null
        token.value = null
        isAuthenticated.value = false
        localStorage.removeItem('auth-token')
    }

    async function fetchProfile() {
        if (!token.value) {
            const stored = localStorage.getItem('auth-token')
            if (stored) token.value = stored
            else return
        }

        try {
            const res = await $fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token.value}` }
            }) as any
            user.value = res.data.user
            isAuthenticated.value = true
        } catch (error) {
            clearAuth()
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        setToken,
        setUser,
        clearAuth,
        fetchProfile
    }
})
