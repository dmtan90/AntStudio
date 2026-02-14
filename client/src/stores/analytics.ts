import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useAnalyticsStore = defineStore('analytics', () => {
    const stats = ref<any>(null)
    const recentClips = ref<any[]>([])
    const loading = ref(false)

    async function fetchOverview() {
        loading.value = true
        try {
            const res: any = await api.get('/analytics/overview')
            if (res.success) {
                stats.value = res.data
                if (res.data.recentClips && res.data.recentClips.length > 0) {
                    recentClips.value = res.data.recentClips
                } else {
                    recentClips.value = []
                }
            }
            return res.data
        } catch (error: any) {
            console.error("Failed to load analytics", error)
            // toast.error('Failed to load analytics') // Optional, maybe silence it for dashboard
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        stats,
        recentClips,
        loading,
        fetchOverview
    }
})
