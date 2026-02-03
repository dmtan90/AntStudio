import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/api';

export const useLicenseStore = defineStore('license', () => {
    const key = ref('');
    const status = ref<'valid' | 'expired' | 'invalid' | 'none'>('none');
    const tier = ref<'trial' | 'free' | 'pro' | 'enterprise'>('free');
    const limits = ref({
        maxUsers: 5,
        maxProjects: 10
    });
    const endDate = ref<Date | null>(null);

    const isValid = computed(() => status.value === 'valid');
    const isPro = computed(() => tier.value === 'pro' || tier.value === 'enterprise');
    const isEnterprise = computed(() => tier.value === 'enterprise');

    async function fetchLicenseStatus() {
        try {
            const res = await api.get('/admin/settings');
            if (res.data.success && res.data.data.license) {
                const lic = res.data.data.license;
                key.value = lic.key;
                status.value = lic.info?.status || 'none';
                tier.value = lic.info?.type || 'free';
                limits.value = {
                    maxUsers: lic.info?.maxUsers || 5,
                    maxProjects: lic.info?.maxProjects || 10
                };
                endDate.value = lic.info?.endDate ? new Date(lic.info.endDate) : null;
            }
        } catch (error) {
            console.error('Failed to fetch license status', error);
        }
    }

    function checkFeature(featureId: string): boolean {
        // Example feature map
        const featureTiers: Record<string, string> = {
            'god-mode': 'pro',
            'custom-branding': 'enterprise',
            'unlimited-guests': 'enterprise',
            'advanced-analytics': 'pro'
        };

        const requiredTier = featureTiers[featureId];
        if (!requiredTier) return true; // Public feature

        if (!isValid.value) return false;

        const tiers = ['free', 'trial', 'pro', 'enterprise'];
        return tiers.indexOf(tier.value) >= tiers.indexOf(requiredTier);
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

    async function fetchAllLicenses() {
        loading.value = true
        try {
            const response = await api.get('/license/all')
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchMyLicenses() {
        try {
            const res = await api.get('/license/my-licenses');
            return res.data;
        } catch (error: any) {
            console.error('Failed to fetch licenses', error);
        }
    }

    async function fetchPackages() {
        try {
            const res = await api.get('/license/packages');
            return res.data;
        } catch (error: any) {
            console.error('Failed to fetch packages', error);
        }
    }

    async function activateLicense(payload: { key: string }) {
        try {
            const res = await api.post('/license/activate', payload);
            await fetchLicenseStatus(); // Upgrade state immediately
            return res.data;
        } catch (error: any) {
            throw error; // Let caller handle UI feedback if needed
        }
    }

    return {
        key,
        status,
        tier,
        limits,
        endDate,
        isValid,
        isPro,
        isEnterprise,
        fetchLicenseStatus,
        checkFeature,
        fetchMyLicenses,
        fetchPackages,
        activateLicense,
        fetchAllLicenses
    };
});
