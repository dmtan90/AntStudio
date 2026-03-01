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
    const licenses = ref<any[]>([]);
    const loading = ref(false);

    const isValid = computed(() => status.value === 'valid');
    const isPro = computed(() => tier.value === 'pro' || tier.value === 'enterprise');
    const isEnterprise = computed(() => tier.value === 'enterprise');

    async function fetchLicenseStatus() {
        try {
            const res: any = await api.get('/admin/settings');
            if (res && res.data.license) {
                const lic = res.data.license;
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
            await api.delete(`/license/${id}`)
            licenses.value = licenses.value.filter(l => l._id !== id)
            toast.success('License deleted successfully')
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    async function fetchAllLicenses() {
        loading.value = true
        try {
            const res: any = await api.get('/license/all')
            licenses.value = res?.data?.licenses || [];
            console.log(res)
            return res.data
        } catch (error) {
            console.error(error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchMyLicenses() {
        try {
            const res: any = await api.get('/license/my-licenses');
            return res.data;
        } catch (error: any) {
            console.error('Failed to fetch license', error);
        }
    }

    async function fetchPackages() {
        try {
            const res: any = await api.get('/license/packages');
            return res.data;
        } catch (error: any) {
            console.error('Failed to fetch packages', error);
        }
    }

    async function activateLicense(payload: { key: string }) {
        try {
            const res: any = await api.post('/license/activate', payload);
            await fetchLicenseStatus(); // Upgrade state immediately
            return res.data;
        } catch (error: any) {
            throw error; // Let caller handle UI feedback if needed
        }
    }

    async function addLicense(payload: any) {
        try {
            const res: any = await api.post('/license/generate', payload);
            await fetchAllLicenses();
            return res.data;
        } catch (error) {
            throw error;
        }
    }

    async function updateLicense(id: string, payload: any) {
        try {
            const res: any = await api.put(`/license/${id}`, payload);
            await fetchAllLicenses();
            return res.data;
        } catch (error) {
            throw error;
        }
    }

    async function fetchLicenses(type?: string) {
        // Alias to fetchAllLicenses for now, filtering can be done client side or implemented later
        return fetchAllLicenses();
    }

    return {
        key,
        status,
        tier,
        limits,
        endDate,
        licenses,
        loading,
        isValid,
        isPro,
        isEnterprise,
        fetchLicenseStatus,
        checkFeature,
        fetchMyLicenses,
        fetchPackages,
        activateLicense,
        fetchAllLicenses,
        addLicense,
        updateLicense,
        deleteLicense,
        fetchLicenses
    };
});
