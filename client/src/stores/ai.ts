import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'
const GENERATE_ASSET_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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
            const res: any = await api.post('/ai/generate-avatar-video', payload, {
                timeout: GENERATE_ASSET_TIMEOUT
            });
            const jobId = res.data?.jobId
            if (jobId) {
                processingJobs.value.set(jobId, { status: 'processing', type: 'avatar-video' })
            }
            return res.data
        } catch (error: any) {
            toast.error('Failed to start avatar video generation: ' + (error.response?.data?.error || error.message))
            throw error
        } finally {
            loading.value = false
        }
    }

    // Generate Generic Video (Veo3/Kling)
    async function generateVideo(payload: {
        prompt: string
        duration?: number
        aspectRatio?: string
    }) {
        loading.value = true
        try {
            const res: any = await api.post('/ai/generate-video', payload, {
                timeout: GENERATE_ASSET_TIMEOUT
            });
            const jobId = res.data?.data?.jobId || res.data?.jobId
            if (jobId) {
                processingJobs.value.set(jobId, { status: 'processing', type: 'video' })
            }
            return res.data?.data || res.data
        } catch (error: any) {
            toast.error('Failed to start video generation: ' + (error.response?.data?.error || error.message))
            throw error
        } finally {
            loading.value = false
        }
    }

    // Check Video Status
    async function checkVideoStatus(jobId: string) {
        try {
            const res: any = await api.get(`/ai/video-status/${jobId}`)
            const data = res.data

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

    // Generate Voice
    async function generateVoice(payload: { text: string, voiceId?: string }) {
        loading.value = true
        try {
            const { data } = await api.post('/headless/generate-voice', payload, {
                timeout: GENERATE_ASSET_TIMEOUT
            });
            // Or /api/ai/generate-voice depending on backend route found in grep? 
            // Grep said: axios.post('/api/ai/generate-voice', {
            // But headless.ts has /generate-voice. Let's stick to what the view was using or standardise.
            // View Used: axios.post('/api/ai/generate-voice', {
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate voice')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function enhanceAudio(formData: FormData) {
        loading.value = true
        try {
            // View Used: axios.post('/api/ai/enhance-audio', formData);
            const { data } = await api.post('/ai/enhance-audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: GENERATE_ASSET_TIMEOUT
            });
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to enhance audio')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchPerformanceInsights(sessionId?: string) {
        try {
            const url = sessionId ? `/ai/performance/insights/${sessionId}` : '/ai/performance/insights/current-session'
            const { data } = await api.get(url)
            return data
        } catch (error: any) {
            console.error('Failed to fetch insights', error)
        }
    }

    async function optimizePerformance(payload: any) {
        try {
            const { data } = await api.post('/ai/performance/optimize/start', payload)
            toast.success('Optimization started')
            return data
        } catch (error: any) {
            toast.error(error.message || 'Optimization failed')
            throw error
        }
    }

    async function analyzeProduct(url: string) {
        loading.value = true;
        try {
            const res: any = await api.post('/ai/analyze-product', { url });
            return res.data;
        } catch (error: any) {
            console.error('AI Product Analysis Error:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    return {
        loading,
        processingJobs,
        fetchPerformanceInsights,
        optimizePerformance,
        analyzeProduct,
        generateVideo,
        generateAvatarVideo,
        checkVideoStatus,
        pollVideoStatus,
        generateVoice,
        enhanceAudio
    }
})
