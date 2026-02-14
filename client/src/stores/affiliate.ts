import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useAffiliateStore = defineStore('affiliate', () => {
    const affiliate = ref<any>(null)
    const recentCommissions = ref<any[]>([])
    const loading = ref(false)

    async function fetchDashboard() {
        loading.value = true
        try {
            const res : any = await api.get('/affiliate/dashboard')
            if (res.success && res.data) {
                affiliate.value = res.data.affiliate
                recentCommissions.value = res.data.recentCommissions || []
            } else {
                affiliate.value = null
            }
            return res.data
        } catch (error: any) {
            if (error.response?.status !== 404) {
                toast.error('Failed to load affiliate data')
            }
            throw error
        } finally {
            loading.value = false
        }
    }

    async function joinProgram() {
        try {
            const res : any = await api.post('/affiliate/join')
            if (res.success) {
                toast.success("Welcome aboard! Your partner profile has been created.")
                await fetchDashboard()
            }
            return res.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to join affiliate program')
            throw error
        }
    }

    async function requestPayout(amount: number, method: string = 'paypal', details: any = {}) {
        try {
            const res : any = await api.post('/affiliate/payout', {
                amount,
                method,
                details
            })
            if (res.success) {
                toast.success('Payout request submitted successfully')
                await fetchDashboard()
            }
            return res.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to request payout')
            throw error
        }
    }

    return {
        affiliate,
        recentCommissions,
        loading,
        fetchDashboard,
        joinProgram,
        requestPayout
    }
})
