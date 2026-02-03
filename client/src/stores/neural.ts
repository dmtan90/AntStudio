import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useNeuralStore = defineStore('neural', () => {
    const archives = ref<any[]>([])
    const activeSoul = ref<any>(null)
    const loading = ref(false)

    async function fetchBioDoubles() {
        loading.value = true
        try {
            const { data } = await api.get('/neural/list')
            archives.value = data.archives || []
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch bio doubles')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchSoulManifest(id: string) {
        loading.value = true
        try {
            const { data } = await api.get(`/neural/archive/${id}?name=${id}`)
            activeSoul.value = data.archive
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch soul manifest')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function updateArchive(id: string, payload: any) {
        try {
            const { data } = await api.post(`/neural/archive/${id}/update`, payload)
            toast.success('Archive updated successfully')
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to update archive')
            throw error
        }
    }

    async function createDigitalDouble(id: string, formData: FormData) {
        try {
            const { data } = await api.post(`/neural/archive/${id}/digital-double`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success('Digital double created successfully')
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to create digital double')
            throw error
        }
    }

    return {
        archives,
        activeSoul,
        loading,
        fetchBioDoubles,
        fetchSoulManifest,
        updateArchive,
        createDigitalDouble
    }
})
