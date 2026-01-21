import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'

export const useConfigStore = defineStore('config', () => {
    const plans = ref<any[]>([])
    const creditPackages = ref<any[]>([])
    const aiSettings = ref<any>({ defaults: {}, models: [] })
    const loading = ref(false)

    async function fetchPlans() {
        loading.value = true
        try {
            const response = await api.get('/configs/plans')
            const resData = response.data
            console.log(resData);

            if (resData.success && resData.data) {
                plans.value = resData.data.plans || []
                creditPackages.value = resData.data.creditPackages || []
                aiSettings.value = resData.data.aiSettings || { defaults: {}, models: [] }
            } else if (resData.plans) { // Fallback if structure is flat (unexpected but for safety)
                plans.value = resData.plans
                creditPackages.value = resData.creditPackages || []
                aiSettings.value = resData.aiSettings || { defaults: {}, models: [] }
            }
            return resData
        } catch (error) {
            console.error('Fetch plans error:', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        plans,
        creditPackages,
        aiSettings,
        loading,
        fetchPlans,
    }
})
