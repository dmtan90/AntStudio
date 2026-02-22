import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export const useMarketplaceStore = defineStore('marketplace', () => {
    const assets = ref<any[]>([])
    const templates = ref<any[]>([])
    const commerceStats = ref({
        totalRevenue: 0,
        pendingOrders: 0,
        currency: 'USD'
    })
    const products = ref<any[]>([])
    const loading = ref(false)
 
    async function fetchProducts() {
        loading.value = true
        try {
            const res: any = await api.get('/commerce/products')
            products.value = res.data
            return res.data
        } catch (error: any) {
            console.error('Failed to fetch products', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function createProduct(data: any) {
        loading.value = true
        try {
            const res: any = await api.post('/commerce/products', data)
            products.value.unshift(res.data)
            toast.success('Product created successfully')
            return res.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create product')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function updateProduct(id: string, data: any) {
        loading.value = true
        try {
            const res: any = await api.put(`/commerce/products/${id}`, data)
            const index = products.value.findIndex(p => p._id === id || p.id === id)
            if (index !== -1) {
                products.value[index] = res.data
            }
            toast.success('Product updated successfully')
            return res.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update product')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function deleteProduct(id: string) {
        loading.value = true
        try {
            await api.delete(`/commerce/products/${id}`)
            products.value = products.value.filter(p => p._id !== id && p.id !== id)
            toast.success('Product deleted successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete product')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchAssets(params: any = {}) {
        loading.value = true
        try {
            const res: any = await api.get('/marketplace/assets', { params })
            assets.value = res.data
            return res.data
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
            const res: any = await api.get('/marketplace/templates', { params })
            console.log(res.data);
            templates.value = res.data?.templates ?? [];
            return res.data
        } catch (error: any) {
            console.error('Failed to fetch templates', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function useTemplate(id: string) {
        try {
            const res: any = await api.post(`/marketplace/templates/${id}/use`)
            return res.data
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to use template')
            throw error
        }
    }

    async function purchaseAsset(id: string) {
        loading.value = true
        try {
            const res: any = await api.post(`/marketplace/purchase/${id}`)
            toast.success('Asset purchased successfully')
            return res.data
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
            const res: any = await api.post('/marketplace/import', { url }, { timeout: 120000 })
            if (res.success) {
                return res.data.template
            } else {
                throw new Error(res.error || 'Failed to import template')
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Target platform blocked scraping or URL is invalid.'
            throw new Error(msg)
        } finally {
            loading.value = false
        }
    }

    async function importPptx(file: File) {
        loading.value = true
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res: any = await api.post('/marketplace/import/pptx', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000
            })
            if (res.success) {
                toast.success('PPTX Template imported successfully!')
                return res.data.template
            } else {
                throw new Error(res.error || 'Failed to import PPTX')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'PPTX Import failed')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchOrders() {
        loading.value = true
        try {
            const res: any = await api.get('/commerce/orders')
            if (res.success && res.data.stats) {
                commerceStats.value = res.data.stats
            }
            return res.data
        } catch (error: any) {
            console.error('Failed to fetch orders', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchCommerceStats() {
        try {
            const res: any = await api.get('/commerce/stats')
            if (res.success) {
                commerceStats.value = res.data
            }
        } catch (error) {
            console.error('Failed to fetch commerce stats', error)
        }
    }

    async function fetchAnalyticsReport(params: { productId?: string; startDate?: string; endDate?: string } = {}) {
        loading.value = true
        try {
            const res: any = await api.get('/commerce/analytics/report', { params })
            return res.data
        } catch (error: any) {
            console.error('Failed to fetch analytics report', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        assets,
        templates,
        products,
        commerceStats,
        loading,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
        fetchAssets,
        fetchTemplates,
        useTemplate,
        purchaseAsset,
        importTemplate,
        importPptx,
        fetchOrders,
        fetchCommerceStats,
        fetchAnalyticsReport
    }
})
