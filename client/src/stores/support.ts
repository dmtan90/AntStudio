import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useSupportStore = defineStore('support', () => {
    const tickets = ref<any[]>([])
    const currentTicket = ref<any>(null)
    const loading = ref(false)

    // Admin view
    async function fetchAdminTickets() {
        loading.value = true
        try {
            const { data } = await api.get('/support/admin/tickets')
            tickets.value = data.tickets || []
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch tickets')
        } finally {
            loading.value = false
        }
    }

    // User view could be separate or shared logic depending on endpoint, 
    // but assuming admin logic mostly for now based on grep results.

    async function createTicket(payload: { subject: string, message: string, priority: string, category: string }) {
        try {
            const { data } = await api.post('/support/tickets', payload)
            toast.success('Support ticket created')
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to create ticket')
            throw error
        }
    }

    async function replyToTicket(ticketId: string, payload: { message: string }) {
        try {
            await api.post(`/support/tickets/${ticketId}/messages`, payload)
            toast.success('Reply sent')
            // Optimistically or refetch
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reply')
            throw error
        }
    }

    return {
        tickets,
        currentTicket,
        loading,
        fetchAdminTickets,
        createTicket,
        replyToTicket
    }
})
