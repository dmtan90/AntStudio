import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useDeveloperStore = defineStore('developer', () => {
    const keys = ref<any[]>([])
    const webhooks = ref<any[]>([])
    const loading = ref(false)

    async function fetchKeys() {
        loading.value = true
        try {
            const { data } = await api.get('/developer/keys')
            keys.value = data.keys || []
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch API keys')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function createKey(payload: { name: string, scopes: string[] }) {
        try {
            const { data } = await api.post('/developer/keys', payload)
            toast.success('API Key created')
            await fetchKeys()
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to create API key')
            throw error
        }
    }

    async function deleteKey(id: string) {
        try {
            await api.delete(`/developer/keys/${id}`)
            await fetchKeys()
            toast.success('API Key deleted')
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete API key')
            throw error
        }
    }

    async function fetchWebhooks() {
        loading.value = true
        try {
            const { data } = await api.get('/developer/webhooks')
            webhooks.value = data.webhooks || []
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch webhooks')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function createWebhook(payload: { url: string, events: string[] }) {
        try {
            const { data } = await api.post('/developer/webhooks', payload)
            toast.success('Webhook created')
            await fetchWebhooks()
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to create webhook')
            throw error
        }
    }

    async function deleteWebhook(id: string) {
        try {
            await api.delete(`/developer/webhooks/${id}`)
            await fetchWebhooks()
            toast.success('Webhook deleted')
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete webhook')
            throw error
        }
    }

    return {
        keys,
        webhooks,
        loading,
        fetchKeys,
        createKey,
        deleteKey,
        fetchWebhooks,
        createWebhook,
        deleteWebhook
    }
})
