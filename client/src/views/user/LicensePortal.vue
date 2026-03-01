<template>
    <div class="license-portal min-h-screen bg-[#0a0a0c] text-white font-outfit p-8 animate-in fade-in duration-700">
        <!-- Header -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 relative z-10">
            <div>
                <h1 class="text-5xl font-black tracking-tighter text-white mb-2 relative inline-block">
                    {{ t('licensePortal.header.title') }}
                    <div class="absolute -bottom-2 left-0 w-1/3 h-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                </h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mt-4 pl-1">{{ t('licensePortal.header.subtitle') }}</p>
            </div>
            <div class="flex gap-4">
                <button @click="showSupportDialog = true"
                    class="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 group">
                    <help theme="outline" size="14" class="group-hover:text-blue-400 transition-colors" />
                    {{ t('licensePortal.actions.support') }}
                </button>
                <button @click="scrollToPricing"
                    class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                    <rocket theme="outline" size="14" />
                    {{ t('licensePortal.actions.upgrade') }}
                </button>
            </div>
        </header>

        <div class="grid grid-cols-12 gap-8 mb-20 max-w-[1600px] mx-auto">
            <!-- LEFT: Active Licenses -->
            <div class="col-span-12 lg:col-span-4 space-y-6">
                <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-3 mb-6 text-gray-400">
                    <key theme="filled" size="16" class="text-blue-500" /> {{ t('licensePortal.sidebar.registries') }}
                </h3>

                <div v-for="lic in licenses" :key="lic._id" @click="selectedLicense = lic"
                    :class="['p-8 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden',
                        selectedLicense?._id === lic._id ? 'bg-blue-900/10 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]']">
                    
                    <div class="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <key theme="outline" size="64" />
                    </div>

                    <div class="flex justify-between items-start mb-6 relative z-10">
                        <span
                            :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border backdrop-blur-md',
                                lic.tier === 'enterprise' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400']">
                            {{ lic.tier }}
                        </span>
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full animate-pulse" :class="lic.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'"></div>
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ t('licensePortal.status.' + lic.status) }}</span>
                        </div>
                    </div>
                    
                    <div class="mb-6 relative z-10">
                        <p class="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-1">{{ t('licensePortal.license.keyId') }}</p>
                        <p class="text-xs font-mono text-gray-400 group-hover:text-white transition-colors truncate">{{ lic.key }}</p>
                    </div>

                    <div class="flex justify-between items-end relative z-10 pt-4 border-t border-white/5">
                        <div>
                            <div class="flex items-baseline gap-1 mb-1">
                                <span class="text-2xl font-black text-white">{{ lic.activeInstances || 0 }}</span>
                                <span class="text-sm font-bold text-gray-500">/ {{ lic.instancesLimit }} {{ t('licensePortal.license.units') }}</span>
                            </div>
                            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{{ t('licensePortal.license.expires', { date: formatDate(lic.endDate) }) }}</p>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all transform group-hover:rotate-[-45deg]">
                            <arrow-right theme="outline" size="14" />
                        </div>
                    </div>
                </div>

                <div v-if="licenses.length === 0"
                    class="p-12 border border-dashed border-white/10 rounded-[2rem] text-center bg-white/[0.02]">
                    <div class="text-4xl mb-4 opacity-20 grayscale">📭</div>
                    <p class="text-xs font-black uppercase text-gray-500 tracking-widest">{{ t('licensePortal.empty.title') }}</p>
                </div>
            </div>

            <!-- RIGHT: Fleet Telemetry -->
            <div class="col-span-12 lg:col-span-8 flex flex-col h-full">
                <div v-if="selectedLicense"
                    class="glass-panel p-10 rounded-[3rem] border border-white/5 bg-[#0f0f12] relative overflow-hidden flex-1 flex flex-col shadow-2xl">
                    
                    <!-- Decor -->
                    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                    <div class="flex justify-between items-center mb-10 relative z-10">
                        <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-gray-300">
                            <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <data-server theme="filled" />
                            </div>
                            {{ t('licensePortal.telemetry.title') }}
                        </h3>
                        <div class="flex items-center gap-4">
                            <div class="px-4 py-1.5 bg-black/40 rounded-lg border border-white/5 flex items-center gap-2">
                                <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ t('licensePortal.telemetry.operational') }}</span>
                            </div>
                            <button @click="renewLicense(selectedLicense)"
                                class="px-5 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/10 hover:shadow-green-500/30">
                                {{ t('licensePortal.telemetry.extend') }}
                            </button>
                        </div>
                    </div>

                    <div v-if="selectedLicense.fleetTelemetry && selectedLicense.fleetTelemetry.length > 0"
                        class="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                        <div v-for="unit in selectedLicense.fleetTelemetry" :key="unit.instanceId"
                            class="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                            <div
                                class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center text-blue-400 border border-white/5 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-shadow">
                                <computer theme="filled" size="20" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-3 mb-1">
                                    <h4 class="text-sm font-bold text-white font-mono truncate">{{ unit.instanceId }}</h4>
                                    <span
                                        class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-black rounded border border-green-500/20 uppercase tracking-widest">
                                        {{ t('licensePortal.telemetry.active') }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                                    <span class="flex items-center gap-1"><global-icon theme="outline" /> {{ unit.lastIp }}</span>
                                    <span class="w-1 h-1 bg-gray-700 rounded-full"></span>
                                    <span>v{{ unit.version }}</span>
                                </div>
                            </div>
                            <div class="text-right pl-4 border-l border-white/5">
                                <p class="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">{{ t('licensePortal.telemetry.lastHeartbeat') }}</p>
                                <p class="text-xs font-bold text-white font-mono">{{ timeAgo(unit.lastHeartbeat) }}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else class="text-center py-20 opacity-30 flex-1 flex flex-col justify-center items-center relative z-10">
                        <div class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <radar theme="outline" size="40" class="mx-auto animate-spin-slow" />
                        </div>
                        <p class="text-xs font-bold uppercase tracking-widest text-white">{{ t('licensePortal.telemetry.empty.title') }}</p>
                        <p class="text-[10px] text-gray-500 mt-2 max-w-xs mx-auto">{{ t('licensePortal.telemetry.empty.desc') }}</p>
                    </div>
                </div>
                
                <div v-else
                    class="flex flex-col items-center justify-center h-full min-h-[500px] border-2 border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                    <div class="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mb-8 animate-pulse">
                        <doc-search theme="filled" size="48" class="text-gray-600" />
                    </div>
                    <p class="text-sm font-black uppercase tracking-widest text-gray-400">{{ t('licensePortal.telemetry.selectRegistry') }}</p>
                </div>
            </div>
        </div>

        <!-- Pricing Section -->
        <div id="pricing" class="py-32 border-t border-white/5 relative">
            <div class="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>
            
            <div class="text-center mb-20 relative z-10">
                <span class="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 inline-block">
                    {{ t('licensePortal.pricing.operationalTiers') }}
                </span>
                <h2 class="text-5xl font-black mb-4">{{ t('licensePortal.pricing.title') }}</h2>
                <p class="text-sm font-medium text-gray-500 uppercase tracking-widest">{{ t('licensePortal.pricing.subtitle') }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto relative z-10 px-4">
                <div v-for="pkg in packages" :key="pkg._id"
                    class="p-10 rounded-[3rem] bg-[#0f0f12] border border-white/5 hover:border-blue-500/30 hover:bg-blue-900/5 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden flex flex-col">
                    
                    <div v-if="pkg.tier === 'pro'"
                        class="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-6 py-2 rounded-bl-2xl uppercase tracking-widest shadow-lg shadow-blue-600/20 z-20">
                        {{ t('licensePortal.pricing.popular') }}
                    </div>

                    <div class="mb-8">
                        <h3 class="text-2xl font-black uppercase tracking-tighter mb-2 text-white group-hover:text-blue-400 transition-colors">{{ pkg.name }}</h3>
                        <p class="text-xs text-gray-500 font-medium h-10 leading-relaxed">{{ pkg.description }}</p>
                    </div>

                    <div class="mb-10 p-6 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                        <span class="text-5xl font-black text-white block mb-1">${{ pkg.price }}</span>
                        <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">{{ t('licensePortal.pricing.billed', { period: pkg.billingPeriod }) }}</span>
                    </div>

                    <ul class="space-y-5 mb-12 flex-1">
                        <li class="flex items-center gap-4 text-xs font-bold text-gray-300">
                            <div class="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
                                <check-one theme="filled" size="12" />
                            </div>
                            {{ pkg.limits.instances }} {{ t('licensePortal.pricing.edgeUnits') }}
                        </li>
                        <li class="flex items-center gap-4 text-xs font-bold text-gray-300">
                            <div class="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
                                <check-one theme="filled" size="12" />
                            </div>
                            {{ pkg.limits.usersPerInstance }} {{ t('licensePortal.pricing.usersPerUnit') }}
                        </li>
                        <li class="flex items-center gap-4 text-xs font-bold text-gray-300">
                            <div class="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
                                <check-one theme="filled" size="12" />
                            </div>
                            {{ pkg.limits.projectsPerInstance }} {{ t('licensePortal.pricing.projectsPerUnit') }}
                        </li>
                    </ul>

                    <button @click="initiateCheckout(pkg._id)"
                        class="w-full py-5 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-white/5 hover:shadow-blue-600/30 group-hover:scale-[1.02]">
                        {{ t('licensePortal.pricing.deployAction', { name: pkg.name }) }}
                    </button>
                    
                    <!-- Background Glow -->
                    <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
                </div>
            </div>
        </div>

        <SupportTicketDialog v-model="showSupportDialog" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
    Key, DataServer, Computer, ArrowRight, Caution, 
    CheckOne, Help, Rocket, DocSearch, Earth as GlobalIcon, Radar
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import SupportTicketDialog from '@/components/SupportTicketDialog.vue';
import { useLicenseStore } from '@/stores/license';
import { usePaymentStore } from '@/stores/payment';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const licenses = ref<any[]>([]);
const packages = ref<any[]>([]);
const selectedLicense = ref<any>(null);
const showSupportDialog = ref(false);

const licenseStore = useLicenseStore();
const paymentStore = usePaymentStore();

const fetchLicenses = async () => {
    try {
        const res = await licenseStore.fetchMyLicenses();
        console.log("fetchLicenses", res);
        if (res && res.data) {
            licenses.value = res.data.licenses;
            if (licenses.value.length > 0 && !selectedLicense.value) selectedLicense.value = licenses.value[0];
        }
    } catch (e) { 
        toast.error(t('licensePortal.toasts.fetchLicensesFailed'));
        console.log(e);
    }
};

const fetchPackages = async () => {
    try {
        const res = await licenseStore.fetchPackages();
        if (res && res.data) {
            packages.value = res.data.packages;
        }
    } catch (e) { }
};

const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
};

const initiateCheckout = async (packageId: string) => {
    try {
        toast.info(t('licensePortal.toasts.initiateCheckout'));
        const res = await paymentStore.createCheckout({ packageId });
        if (res.data.url) {
            window.location.href = res.data.url;
        }
    } catch (e: any) {
        toast.error(e.response?.data?.error || t('licensePortal.toasts.checkoutFailed'));
    }
};

const renewLicense = async (license: any) => {
    const currentPkg = packages.value.find(p => p.tier === license.tier) || packages.value[0];
    if (!currentPkg) return;

    try {
        toast.info(t('licensePortal.toasts.renewing', { key: license.key }));
        const res = await paymentStore.createCheckout({
            packageId: currentPkg._id,
            licenseKey: license.key
        } as any);

        if (res.data.url) {
            window.location.href = res.data.url;
        }
    } catch (e: any) {
        toast.error(t('licensePortal.toasts.renewalError'));
    }
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();
const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return t('common.time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('common.time.minutesAgo', { n: String(minutes) });
    return t('common.time.hoursAgo', { n: String(Math.floor(minutes / 60)) });
};

onMounted(() => {
    fetchLicenses();
    fetchPackages();
    handlePaymentCallback();
});

const handlePaymentCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const gateway = urlParams.get('gateway');
    const reason = urlParams.get('reason');

    if (!payment) return;

    if (payment === 'success') {
        const gatewayName = gateway === 'stripe' ? 'Stripe' : gateway === 'paypal' ? 'PayPal' : t('licensePortal.payment.gateway');
        toast.success(t('licensePortal.toasts.paymentSuccess', { gateway: gatewayName }), { duration: 5000 });
        setTimeout(() => fetchLicenses(), 1000);
    }

    if (payment === 'failed') {
        let errorMessage = t('licensePortal.toasts.paymentFailed');
        switch (reason) {
            case 'missing_session':
            case 'missing_token': errorMessage = t('licensePortal.toasts.paymentExpired'); break;
            case 'verification_failed':
            case 'capture_failed': errorMessage = t('licensePortal.toasts.paymentVerificationFailed'); break;
            case 'error': errorMessage = t('licensePortal.toasts.paymentProcessingError'); break;
        }
        toast.error(errorMessage, { duration: 7000 });
    }

    if (payment === 'cancelled') {
        toast.info(t('licensePortal.toasts.paymentCancelled'), { duration: 4000 });
    }

    if (payment) {
        setTimeout(() => {
            window.history.replaceState({}, '', window.location.pathname);
        }, 500);
    }
};
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

.animate-spin-slow {
    animation: spin 3s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
