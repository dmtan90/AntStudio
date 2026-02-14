import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useLiveStore = defineStore('live', () => {
    const history = ref<any[]>([])
    const loading = ref(false)

    async function fetchSessions() {
        loading.value = true
        try {
            const { data } = await api.get('/live/sessions')
            history.value = data || []
            return data
        } catch (error: any) {
            console.error('[LiveStore] Failed to fetch sessions:', error)
            return []
        } finally {
            loading.value = false
        }
    }

    async function fetchSessionDetail(sessionId: string) {
        try {
            const { data } = await api.get(`/live/sessions/${sessionId}`)
            return data
        } catch (error: any) {
            toast.error('Failed to load session details')
            throw error
        }
    }

    return {
        history,
        loading,
        fetchSessions,
        fetchSessionDetail
    }
})
