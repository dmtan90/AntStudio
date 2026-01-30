import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useMarketplaceStore = defineStore('marketplace', () => {
    const assets = ref<any[]>([])
    const templates = ref<any[]>([])
    const loading = ref(false)

    async function fetchAssets(params: any = {}) {
        loading.value = true
        try {
            const response = await api.get('/marketplace/assets', { params })
            assets.value = response.data.data
            return response.data.data
        } catch (error: any) {
            console.error('Failed to fetch assets', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchTemplates(params: any = {}) {
        loading.value = true
        try {
            const response = await api.get('/marketplace/templates', { params })
            templates.value = response.data?.templates || []
            return response.data
        } catch (error: any) {
            console.error('Failed to fetch templates', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function useTemplate(id: string) {
        try {
            const response = await api.post(`/marketplace/templates/${id}/use`)
            return response.data.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to use template')
            throw error
        }
    }

    async function purchaseAsset(id: string) {
        loading.value = true
        try {
            const response = await api.post(`/marketplace/purchase/${id}`)
            toast.success('Asset purchased successfully')
            return response.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Purchase failed')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function importTemplate(url: string) {
        loading.value = true
        try {
            const response = await api.post('/marketplace/import', { url }, { timeout: 120000 })
            if (response.data.success) {
                return response.data.data.template
            } else {
                throw new Error(response.data.error || 'Failed to import template')
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Target platform blocked scraping or URL is invalid.'
            throw new Error(msg)
        } finally {
            loading.value = false
        }
    }

    return {
        assets,
        templates,
        loading,
        fetchAssets,
        fetchTemplates,
        useTemplate,
        purchaseAsset,
        importTemplate
    }
})
