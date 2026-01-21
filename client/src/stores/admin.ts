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
            const response = await api.get('/admin/users', { params })
            users.value = response.data.users || []
            return response.data
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
            const response = await api.get(`/admin/users/${userId}`)
            return response.data.user
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
            const response = await api.get('/admin/stats')
            console.log("response", response);
            stats.value = response.data
            return response.data
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
            const response = await api.get('/admin/settings')
            settings.value = response.data
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function updateSettings(newSettings: any) {
        try {
            const response = await api.put('/admin/settings', newSettings)
            settings.value = response.data
            toast.success(t('common.updateSuccess'))
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function updateUser(userId: string, updateData: any) {
        try {
            const response = await api.put(`/admin/users/${userId}`, updateData)
            const updatedUser = response.data.user
            const idx = users.value.findIndex(u => u._id === userId)
            if (idx !== -1 && updatedUser) {
                users.value[idx] = updatedUser
            }
            toast.success(t('common.updateSuccess'))
            return response.data
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
            const response = await api.post('/ai-config/generate-template', {
                docUrl: docUrl,
                taskType: taskType
            })
            // console.log("response", response.data);
            return response.data
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
            const response = await api.get('/licenses')
            licenses.value = response.data.licenses || []
            return response.data
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
            const response = await api.post('/licenses', data)
            await fetchLicenses()
            toast.success('License generated successfully')
            return response.data
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
        generateTemplate
    }
})
