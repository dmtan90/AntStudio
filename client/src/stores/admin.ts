import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useAdminStore = defineStore('admin', () => {
    const { t } = useTranslations()
    const users = ref<any[]>([])
    const settings = ref<any>({})
    const stats = ref<any>({})
    const loading = ref(false)

    // Helper
    function handleError(error: any, defaultKey: string = 'common.failed') {
        const message = error.response?.data?.error || error.message || t(defaultKey)
        toast.error(t(message))
        return message
    }

    async function fetchUsers(params?: any) {
        loading.value = true
        try {
            const res : any = await api.get('/admin/users', { params })
            users.value = res.data.users || []
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchUser(userId: string) {
        loading.value = true
        try {
            const res : any = await api.get(`/admin/users/${userId}`)
            return res.data.user
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchStats() {
        loading.value = true
        try {
            const res : any = await api.get('/admin/stats')
            // console.log("response", response);
            stats.value = res.data
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchSettings() {
        loading.value = true
        try {
            const res : any = await api.get('/admin/settings')
            settings.value = res.data
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function updateSettings(newSettings: any) {
        try {
            const res : any = await api.put('/admin/settings', newSettings)
            settings.value = res.data
            toast.success(t('common.updateSuccess'))
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function updateUser(userId: string, updateData: any) {
        try {
            const res : any = await api.put(`/admin/users/${userId}`, updateData)
            const updatedUser = res.data.user
            const idx = users.value.findIndex(u => u._id === userId)
            if (idx !== -1 && updatedUser) {
                users.value[idx] = updatedUser
            }
            toast.success(t('common.updateSuccess'))
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function deleteUser(userId: string) {
        try {
            await api.delete(`/admin/users/${userId}`)
            users.value = users.value.filter(u => u._id !== userId)
            toast.success(t('common.updateSuccess')) // Generic "success" toast
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateTemplate(docUrl: string, taskType: string) {
        loading.value = true
        try {
            const res : any = await api.post('/ai-config/generate-template', {
                docUrl: docUrl,
                taskType: taskType
            }, { timeout: 100000 })
            // console.log("response", response.data);
            return res.data
        } catch (error) {
            throw error
        } finally {
            loading.value = false
        }
    }

    const licenses = ref<any[]>([])

    async function fetchLicenses() {
        loading.value = true
        try {
            const res : any = await api.get('/licenses')
            licenses.value = res.data.licenses || []
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function generateLicense(data: any) {
        loading.value = true
        try {
            const res : any = await api.post('/licenses', data)
            await fetchLicenses()
            toast.success('License generated successfully')
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function deleteLicense(id: string) {
        try {
            await api.delete(`/licenses/${id}`)
            licenses.value = licenses.value.filter(l => l._id !== id)
            toast.success('License deleted successfully')
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    // Release Hub Actions
    async function fetchReleases(params?: any) {
        loading.value = true
        try {
            const res : any = await api.get('/admin/releases', { params })
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function createRelease(data: any) {
        try {
            const res : any = await api.post('/admin/releases', data)
            toast.success('Release created successfully')
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function deleteRelease(id: string) {
        try {
            await api.delete(`/admin/releases/${id}`)
            toast.success('Release deleted successfully')
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function fetchLatestRelease() {
        try {
            const res : any = await api.get('/releases/latest')
            return res.data
        } catch (error) {
            // Silently fail or just return null/undefined as this is often for UI badges
            return null
        }
    }



    // Monitoring Actions
    async function fetchMonitoringStats() {
        try {
            const res : any = await api.get('/admin/monitoring/stats')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchMonitoringHealth() {
        try {
            const res : any = await api.get('/admin/monitoring/health')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchMonitoringHeartbeat() {
        try {
            const res : any = await api.get('/admin/monitoring/heartbeat')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchMonitoringHistory(limit = 60) {
        try {
            const res : any = await api.get(`/admin/monitoring/history?limit=${limit}`)
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchMonitoringLogs(params: any) {
        try {
            const res : any = await api.get('/admin/monitoring/logs', { params })
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchClientLogs() {
        try {
            const res : any = await api.get('/admin/monitoring/client-logs')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function exportDiagnostics() {
        // Returns blob usually
        try {
            const res : any = await api.get('/admin/monitoring/export-diagnostics', { responseType: 'blob' })
            return res
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function fetchMonitoringSettings() {
        try {
            const res : any = await api.get('/admin/monitoring/settings')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function updateMonitoringSettings(payload: any) {
        try {
            await api.patch('/admin/monitoring/settings', payload)
            toast.success('Monitoring settings updated')
        } catch (error) {
            handleError(error)
        }
    }

    async function clearMonitoringLogs() {
        try {
            await api.delete('/admin/monitoring/logs')
            toast.success('Logs cleared')
        } catch (error) {
            handleError(error)
        }
    }

    // Logs View Actions
    async function fetchSystemLogs(params: any) {
        try {
            const res : any = await api.get('/admin/logs', { params })
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchLogSettings() {
        try {
            const res : any = await api.get('/admin/logs/settings')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function updateLogSettings(payload: any) {
        try {
            await api.patch('/admin/logs/settings', payload)
            toast.success('Log settings updated')
        } catch (error) {
            handleError(error)
        }
    }

    async function clearSystemLogs() {
        try {
            await api.delete('/admin/logs')
            toast.success('System logs cleared')
        } catch (error) {
            handleError(error)
        }
    }

    // Network Control Actions
    async function fetchNetworkSnapshot() {
        try {
            const res : any = await api.get('/network/snapshot')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function triggerNetworkEvent(type: string) {
        try {
            await api.post('/network/event/global', { eventType: type })
            toast.success(`Network event ${type} triggered`)
        } catch (error) {
            handleError(error)
        }
    }

    // AI Accounts Actions
    async function updateAIAccount(id: string, payload: any) {
        try {
            await api.patch(`/admin/ai/accounts/${id}`, payload)
            toast.success('AI Account updated')
        } catch (error) {
            handleError(error)
        }
    }

    async function fetchAIPerformance() {
        try {
            const res : any = await api.get('/ai/performance/insights/current-session')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function toggleAIOptimization(payload: any) {
        try {
            const res : any = await api.post('/ai/performance/optimize/start', payload)
            toast.success("AI Optimizer Engaged")
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function fetchAIAccounts() {
        try {
            const res : any = await api.get('/admin/ai/accounts')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function getAuthUrl(platform: string, redirectUri?: string) {
        try {
            const res : any = await api.get(`/admin/ai/auth/${platform}`, {
                params: { redirectUri }
            })
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function handleAIAuthCallback(platform: string, code: string, state?: string, redirectUri?: string) {
        try {
            const res : any = await api.post(`/admin/ai/auth/${platform}/callback`, { code, state, redirectUri })
            toast.success('AI Account connected successfully')
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function createProject(accountId: string) {
        try {
            const res : any = await api.post(`/admin/ai/accounts/${accountId}/create-project`)
            toast.success('GCP Project created')
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function addDirectAccount(payload: any) {
        try {
            const res : any = await api.post('/admin/ai/accounts/direct', payload)
            toast.success('Account added')
            return res.data
        } catch (error) {
            handleError(error)
        }
    }

    async function syncAccount(id: string) {
        try {
            await api.post(`/admin/ai/accounts/${id}/sync`)
            toast.success('Sync started')
        } catch (error) {
            handleError(error)
        }
    }

    async function deleteAIAccount(id: string) {
        try {
            await api.delete(`/admin/ai/accounts/${id}`)
            toast.success('Account deleted')
        } catch (error) {
            handleError(error)
        }
    }

    return {
        users,
        settings,
        stats,
        licenses,
        loading,
        fetchUsers,
        fetchUser,
        fetchStats,
        fetchSettings,
        updateSettings,
        updateUser,
        deleteUser,
        fetchLicenses,
        generateLicense,
        deleteLicense,
        generateTemplate,
        fetchReleases,
        createRelease,
        deleteRelease,
        fetchLatestRelease,

        // New exports
        fetchMonitoringStats,
        fetchMonitoringHealth,
        fetchMonitoringHeartbeat,
        fetchMonitoringHistory,
        fetchMonitoringLogs,
        fetchClientLogs,
        exportDiagnostics,
        fetchMonitoringSettings,
        updateMonitoringSettings,
        clearMonitoringLogs,
        fetchSystemLogs,
        fetchLogSettings,
        updateLogSettings,
        clearSystemLogs,
        fetchNetworkSnapshot,
        triggerNetworkEvent,
        updateAIAccount,
        fetchAIAccounts,
        getAuthUrl,
        addDirectAccount,
        syncAccount,
        deleteAIAccount,
        handleAIAuthCallback,
        createProject,
        fetchAIPerformance,
        toggleAIOptimization
    }
})
