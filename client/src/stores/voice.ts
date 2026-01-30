import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useVoiceStore = defineStore('voice', () => {
    const voices = ref<any[]>([])
    const loading = ref(false)

    async function fetchVoices() {
        loading.value = true
        try {
            const response = await api.get('/voice/list-all')
            voices.value = response.data.data?.voices || []
            return voices.value
        } catch (error: any) {
            toast.error('Failed to load voices: ' + (error.response?.data?.error || error.message))
            throw error
        } finally {
            loading.value = false
        }
    }

    async function cloneVoice(formData: FormData) {
        loading.value = true
        try {
            const response = await api.post('/voice/clone', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            // Optimistically add to list or refresh
            if (response.data.data?.voice) {
                voices.value.unshift(response.data.data.voice)
            } else {
                await fetchVoices()
            }
            return response.data
        } catch (error: any) {
            toast.error('Failed to clone voice: ' + (error.response?.data?.error || error.message))
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        voices,
        loading,
        fetchVoices,
        cloneVoice
    }
})
