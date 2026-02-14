import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const usePaymentStore = defineStore('payment', () => {
    const transactions = ref<any[]>([])
    const stats = ref<any>(null)
    const loading = ref(false)

    async function fetchTransactions() {
        loading.value = true
        try {
            const res: any = await api.get('/payment/transactions')
            transactions.value = res.data?.transactions || []
            return transactions.value
        } catch (error: any) {
            console.error('Failed to fetch transactions', error)
        } finally {
            loading.value = false
        }
    }

    async function fetchAdminTransactions() {
        loading.value = true
        try {
            const res: any = await api.get('/payment/admin/transactions')
            transactions.value = res.data?.transactions || []
            return transactions.value
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch admin transactions')
        } finally {
            loading.value = false
        }
    }

    async function fetchAdminStats() {
        loading.value = true
        try {
            const res: any = await api.get('/payment/admin/stats')
            stats.value = res.data
            return stats.value
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch admin stats')
        } finally {
            loading.value = false
        }
    }

    async function createCheckout(payload: { packageId: string }) {
        try {
            const res: any = await api.post('/payment/create-checkout', payload);
            return res.data;
        } catch (error: any) {
            toast.error(error.message || 'Failed to create checkout');
            throw error;
        }
    }

    async function verifySession(payload: { sessionId: string, gateway: string }) {
        try {
            const res: any = await api.post('/payment/verify-session', payload);
            toast.success('Payment verified successfully');
            return res.data;
        } catch (error: any) {
            toast.error('Payment verification failed');
            throw error;
        }
    }

    return {
        transactions,
        stats,
        loading,
        fetchTransactions,
        fetchAdminTransactions,
        fetchAdminStats,
        createCheckout,
        verifySession
    }
})
