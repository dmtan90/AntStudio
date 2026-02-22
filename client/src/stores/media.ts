import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useMediaStore = defineStore('media', () => {
    const { t } = useTranslations()
    const resources = ref<any[]>([])
    const videos = ref<any[]>([])
    const exportedVideos = ref<any[]>([])
    const loading = ref(false)
    const pagination = ref({
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 1
    })

    // Performance State (for lyrics display)
    const performingVTuberId = ref<string | null>(null)
    const performanceLyrics = ref<any[]>([])
    const performanceLyricsCurrentTime = ref(0)
    const performanceLyricsVisible = ref(true)
    const performanceLyricsStyle = ref<'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale'>('bounce')
    const performanceLyricsPosition = ref<'top' | 'center' | 'bottom'>('bottom')

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
            const data = res.data.data || res.data;
            resources.value = data.media || []
            pagination.value = data.pagination || { total: resources.value.length, page: 1, limit: 100, totalPages: 1 }
            return data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchExportedVideos(params: any = {}) {
        loading.value = true
        try {
            const res: any = await api.get('/videos/list', { params })
            const data = res.data.data || res.data;
            exportedVideos.value = data.videos || []
            pagination.value = data.pagination || { total: exportedVideos.value.length, page: 1, limit: 12, pages: 1 }
            return data
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
        exportedVideos,
        loading,
        pagination,
        // Performance State
        performingVTuberId,
        performanceLyrics,
        performanceLyricsCurrentTime,
        performanceLyricsVisible,
        performanceLyricsStyle,
        performanceLyricsPosition,
        // Performance Actions
        startPerformance(vTuberId: string, lyrics: any[], style?: string, position?: string) {
            performingVTuberId.value = vTuberId
            performanceLyrics.value = lyrics
            performanceLyricsCurrentTime.value = 0
            performanceLyricsVisible.value = true
            if (style) performanceLyricsStyle.value = style as any
            if (position) performanceLyricsPosition.value = position as any
        },
        updatePerformanceTime(time: number) {
            performanceLyricsCurrentTime.value = time
        },
        toggleLyricsVisibility(visible: boolean) {
            performanceLyricsVisible.value = visible
        },
        stopPerformance() {
            performingVTuberId.value = null
            performanceLyrics.value = []
            performanceLyricsCurrentTime.value = 0
            performanceLyricsVisible.value = true
        },
        fetchMedia,
        fetchExportedVideos,
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
        async fetchTrendingMusic(params: { region?: string; maxResults?: number } = {}) {
            try {
                const res: any = await api.get('/media/youtube/trending', { params });
                return res.data;
            } catch (error) {
                console.error('[MediaStore] Fetch trending failed:', error);
                handleError(error);
                throw error;
            }
        },
        async fetchYouTubeMetadata(params: { videoId: string; fetchLyrics: boolean; songTitle: string; lyricsLanguage?: string }) {
            try {
                const res: any = await api.post('/media/youtube/metadata', params, {
                    timeout: 60000
                });
                return res.data;
            } catch (error) {
                console.error('[MediaStore] Fetch metadata failed:', error);
                handleError(error);
                throw error;
            }
        }
    }
})
