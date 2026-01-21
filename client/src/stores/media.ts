import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useMediaStore = defineStore('media', () => {
    const { t } = useTranslations()
    const resources = ref<any[]>([])
    const videos = ref<any[]>([])
    const loading = ref(false)

    // Helper
    function handleError(error: any, defaultKey: string = 'common.failed') {
        const message = error.response?.data?.error || error.message || t(defaultKey)
        toast.error(t(message))
        return message
    }

    async function fetchMedia(purpose?: string) {
        loading.value = true
        try {
            const response = await api.get('/media/list', {
                params: { purpose }
            })
            resources.value = response.data.media || []
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchVideos() {
        loading.value = true
        try {
            const response = await api.get('/videos/list')
            videos.value = response.data.videos || []
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function deleteMedia(id: string) {
        try {
            await api.delete(`/media/${id}`)
            resources.value = resources.value.filter(m => m._id !== id)
            toast.success(t('resources.deleteSuccess'))
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function uploadMedia(formData: FormData) {
        try {
            const response = await api.post('/media/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            const newMedia = response.data.media
            if (newMedia) {
                resources.value.unshift(newMedia)
            }
            toast.success(t('common.updateSuccess'))
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    return {
        resources,
        videos,
        loading,
        fetchMedia,
        fetchVideos,
        deleteMedia,
        uploadMedia
    }
})
