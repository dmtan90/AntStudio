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

    async function fetchMedia(params: any = {}) {
        loading.value = true
        try {
            const res: any = await api.get('/media/list', {
                params
            })
            resources.value = res.data.media || []
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    // Alias for deprecated calls if any, or just consistent naming
    async function fetchMediaList(purpose?: string) {
        return fetchMedia(purpose)
    }

    async function fetchVideos() {
        loading.value = true
        try {
            const res: any = await api.get('/videos/list')
            videos.value = res.data.videos || []
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchCloudMedia(prefix?: string) {
        loading.value = true
        try {
            const res: any = await api.get('/media/cloud/list', {
                params: { prefix }
            })
            return res.data
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
            const res: any = await api.post('/media/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            const newMedia = res.data.media
            if (newMedia) {
                resources.value.unshift(newMedia)
            }
            toast.success(t('common.updateSuccess'))
            return res.data
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
        fetchCloudMedia,
        deleteMedia,
        uploadMedia,
        async searchYouTubeMusic(params: { query: string; preferCovers: boolean; language: string; maxResults: number }) {
            try {
                const res: any = await api.post('/media/youtube/search', params);
                return res.data;
            } catch (error) {
                console.error('[MediaStore] YouTube search failed:', error);
                handleError(error);
                throw error;
            }
        },
        async fetchYouTubeMetadata(params: { videoId: string; fetchLyrics: boolean; songTitle: string }) {
            try {
                const res: any = await api.post('/media/youtube/metadata', params);
                return res.data;
            } catch (error) {
                console.error('[MediaStore] Fetch metadata failed:', error);
                handleError(error);
                throw error;
            }
        }
    }
})
