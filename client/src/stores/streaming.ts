import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useStreamingStore = defineStore('streaming', () => {
    const session = ref<any>(null)
    const loading = ref(false)
    const activeStream = ref(false)

    async function prepareSession(projectId?: string) {
        try {
            const res: any = await api.post('/streaming/session/prepare', { projectId })
            session.value = res.data
            return res.data
        } catch (error: any) {
            toast.error(error.message || 'Failed to prepare streaming session')
            throw error
        }
    }

    async function startStream(payload: any) {
        loading.value = true
        try {
            const res: any = await api.post('/streaming/start', payload)
            activeStream.value = true
            toast.success('Stream started successfully')
            return res.data
        } catch (error: any) {
            toast.error(error.message || 'Failed to start stream')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function stopStream(sessionId: string) {
        try {
            await api.post(`/streaming/stop/${sessionId}`)
            activeStream.value = false
            toast.success('Stream stopped successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to stop stream')
        }
    }

    async function validateGuestToken(token: string) {
        try {
            const res = await api.get(`/streaming/guest/validate/${token}`)
            return res.data
        } catch (error: any) {
            throw error
        }
    }

    return {
        session,
        loading,
        activeStream,
        prepareSession,
        startStream,
        stopStream,
        validateGuestToken
    }
})
