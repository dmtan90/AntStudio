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
            const res: any = await api.get('/configs/plans')
            const resData = res.data
            console.log(resData);

            if (res.success && res.data) {
                plans.value = res.data.plans || []
                creditPackages.value = res.data.creditPackages || []
                aiSettings.value = res.data.aiSettings || { defaults: {}, models: [] }
            } else if (res.plans) { // Fallback if structure is flat (unexpected but for safety)
                plans.value = res.plans
                creditPackages.value = res.creditPackages || []
                aiSettings.value = res.aiSettings || { defaults: {}, models: [] }
            }
            return res.data
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
