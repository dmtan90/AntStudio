import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useAIStore = defineStore('ai', () => {
    const loading = ref(false)
    const processingJobs = ref(new Map<string, any>())

    // Generate Avatar Video
    async function generateAvatarVideo(payload: {
        avatarId?: string
        script: string
        voiceId?: string
        voiceProvider?: string
        voiceSettings?: any
        background?: string
        avatarImage?: string
    }) {
        loading.value = true
        try {
            const response = await api.post('/ai/generate-avatar-video', payload)
            const jobId = response.data.data?.jobId
            if (jobId) {
                processingJobs.value.set(jobId, { status: 'processing', type: 'avatar-video' })
            }
            return response.data.data
        } catch (error: any) {
            toast.error('Failed to start avatar video generation: ' + (error.response?.data?.error || error.message))
            throw error
        } finally {
            loading.value = false
        }
    }

    // Check Video Status
    async function checkVideoStatus(jobId: string) {
        try {
            const response = await api.get(`/ai/video-status/${jobId}`)
            const data = response.data.data

            if (data.status === 'completed' || data.status === 'failed') {
                processingJobs.value.delete(jobId)
            }
            return data
        } catch (error: any) {
            console.error('Failed to check video status', error)
            throw error
        }
    }

    // Poll for video completion
    async function pollVideoStatus(jobId: string, interval = 3000, timeout = 300000): Promise<any> {
        const startTime = Date.now()

        return new Promise((resolve, reject) => {
            const check = async () => {
                try {
                    const status = await checkVideoStatus(jobId)
                    if (status.status === 'completed') {
                        resolve(status)
                    } else if (status.status === 'failed') {
                        reject(new Error(status.error || 'Generation failed'))
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error('Polling timed out'))
                    } else {
                        setTimeout(check, interval)
                    }
                } catch (e) {
                    reject(e)
                }
            }
            check()
        })
    }

    return {
        loading,
        processingJobs,
        generateAvatarVideo,
        checkVideoStatus,
        pollVideoStatus
    }
})
