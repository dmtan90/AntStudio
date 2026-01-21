import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useLicenseStore = defineStore('license', () => {
    const { t } = useTranslations()
    const licenses = ref<any[]>([])
    const loading = ref(false)

    // Helper
    function handleError(error: any, defaultKey: string = 'common.failed') {
        const message = error.response?.data?.error || error.message || t(defaultKey)
        toast.error(t(message))
        return message
    }

    async function fetchLicenses(purpose?: string) {
        loading.value = true
        try {
            const response = await api.get('/license/list', {
                params: { purpose }
            })
            licenses.value = response.data.licenses || []
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
            await api.delete(`/license/${id}`)
            licenses.value = licenses.value.filter(l => l._id !== id)
            toast.success(t('license.deleteSuccess'))
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function addLicense(license: any) {
        try {
            const response = await api.post('/license/generate', license)
            const newLicense = response.data.license
            if (newLicense) {
                licenses.value.unshift(newLicense)
            }
            toast.success(t('common.updateSuccess'))
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    return {
        licenses,
        loading,
        fetchLicenses,
        deleteLicense,
        addLicense
    }
})
