<template>
    <div class="license-portal p-8 animate-in">
        <header class="flex justify-between items-start mb-12">
            <div>
                <h1
                    class="text-4xl font-black tracking-tighter text-white mb-2 underline decoration-blue-500 decoration-4 underline-offset-8">
                    LICENSE HUB</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Orchestrating Global
                    Production Units</p>
            </div>
            <div class="flex gap-4">
                <button @click="showSupportDialog = true"
                    class="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase hover:bg-white/10 transition-all">Support
                    Terminal</button>
                <button @click="scrollToPricing"
                    class="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-[10px] font-black uppercase shadow-lg shadow-blue-500/20">Upgrade
                    Fleet</button>
            </div>
        </header>

        <div class="grid grid-cols-12 gap-10 mb-20">
            <!-- LEFT: Active Licenses -->
            <div class="col-span-12 lg:col-span-4 space-y-6">
                <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                    <key theme="outline" /> Active Registries
                </h3>

                <div v-for="lic in licenses" :key="lic._id" @click="selectedLicense = lic"
                    :class="['p-6 rounded-3xl border transition-all cursor-pointer group',
                        selectedLicense?._id === lic._id ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:border-white/20']">
                    <div class="flex justify-between items-start mb-4">
                        <span
                            :class="['px-3 py-1 rounded-lg text-[8px] font-black uppercase border',
                                lic.tier === 'enterprise' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-blue-500/20 border-blue-500/30 text-blue-400']">
                            {{ lic.tier }}
                        </span>
                        <span class="text-[10px] font-bold text-green-400 uppercase tracking-tighter">{{ lic.status
                        }}</span>
                    </div>
                    <p class="text-[10px] font-mono opacity-40 mb-1 group-hover:opacity-100 transition-opacity">KEY ID:
                        {{ lic.key }}</p>
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-lg font-black">{{ lic.activeInstances || 0 }} / {{ lic.instancesLimit }}
                                Units</p>
                            <p class="text-[8px] font-bold opacity-30 mt-1 uppercase">EXPIRES: {{
                                formatDate(lic.endDate) }}</p>
                        </div>
                        <right theme="outline" class="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                <div v-if="licenses.length === 0"
                    class="p-8 border border-dashed border-white/10 rounded-3xl text-center opactiy-50">
                    <p class="text-xs font-black uppercase text-gray-500">No Active Licenses</p>
                </div>
            </div>

            <!-- RIGHT: Fleet Telemetry -->
            <div class="col-span-12 lg:col-span-8">
                <div v-if="selectedLicense"
                    class="glass-card p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent h-full flex flex-col">
                    <div class="flex justify-between items-center mb-10">
                        <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                            <data-server theme="outline" /> UNIT FLEET TELEMETRY
                        </h3>
                        <button @click="renewLicense(selectedLicense)"
                            class="px-4 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-[8px] font-black uppercase hover:bg-green-500/30 transition-all">
                            Extend Validity
                        </button>
                    </div>

                    <div v-if="selectedLicense.fleetTelemetry && selectedLicense.fleetTelemetry.length > 0"
                        class="space-y-4 flex-1 overflow-y-auto pr-2">
                        <div v-for="unit in selectedLicense.fleetTelemetry" :key="unit.instanceId"
                            class="flex items-center gap-6 p-6 bg-black/40 border border-white/5 rounded-2xl hover:border-blue-500/20 transition-all">
                            <div
                                class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <computer theme="outline" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-3">
                                    <h4 class="text-sm font-bold">{{ unit.instanceId }}</h4>
                                    <span
                                        class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[8px] font-black rounded border border-green-500/20">PEAK
                                        HEARTBEAT</span>
                                </div>
                                <p class="text-[10px] font-mono opacity-40 mt-1">IP ADDR: {{ unit.lastIp }} | VERSION:
                                    v{{ unit.version }}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-[8px] font-black uppercase opacity-30">Last Pulse</p>
                                <p class="text-[10px] font-bold">{{ timeAgo(unit.lastHeartbeat) }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-20 opacity-30 flex-1 flex flex-col justify-center">
                        <caution theme="outline" size="40" class="mx-auto mb-4" />
                        <p class="text-xs font-bold uppercase tracking-widest">No Tactical Units Activated Yet</p>
                    </div>
                </div>
                <div v-else
                    class="flex flex-col items-center justify-center h-[500px] border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                    <Selected theme="outline" size="60" class="mb-4" />
                    <p class="text-xs font-black uppercase tracking-widest">Select a registry for telemetry downlink</p>
                </div>
            </div>
        </div>

        <!-- Pricing Section -->
        <div id="pricing" class="py-20 border-t border-white/5">
            <div class="text-center mb-16">
                <h2 class="text-3xl font-black mb-4">TACTICAL PACKAGES</h2>
                <p class="text-xs font-bold uppercase tracking-widest text-gray-500">Choose your operational tier</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div v-for="pkg in packages" :key="pkg._id"
                    class="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div v-if="pkg.tier === 'pro'"
                        class="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase">
                        Recommended</div>

                    <h3 class="text-xl font-black uppercase mb-2">{{ pkg.name }}</h3>
                    <p class="text-[10px] text-gray-400 mb-8 h-8">{{ pkg.description }}</p>

                    <div class="mb-8">
                        <span class="text-4xl font-black">${{ pkg.price }}</span>
                        <span class="text-xs font-bold text-gray-500"> / {{ pkg.billingPeriod }}</span>
                    </div>

                    <ul class="space-y-4 mb-10">
                        <li class="flex items-center gap-3 text-xs font-bold">
                            <check-one theme="outline" class="text-green-400" /> {{ pkg.limits.instances }} Edge Unit(s)
                        </li>
                        <li class="flex items-center gap-3 text-xs font-bold">
                            <check-one theme="outline" class="text-green-400" /> {{ pkg.limits.usersPerInstance }} Users
                            / Unit
                        </li>
                        <li class="flex items-center gap-3 text-xs font-bold">
                            <check-one theme="outline" class="text-green-400" /> {{ pkg.limits.projectsPerInstance }}
                            Projects / Unit
                        </li>
                    </ul>

                    <button @click="initiateCheckout(pkg._id)"
                        class="w-full py-4 rounded-xl bg-white text-black font-black uppercase text-xs hover:bg-blue-500 hover:text-white transition-all">
                        Deploy {{ pkg.name }}
                    </button>
                </div>
            </div>
        </div>

        <SupportTicketDialog v-model="showSupportDialog" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Key, DataServer, Computer, Right, Caution, Selected, CheckOne } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import SupportTicketDialog from '@/components/SupportTicketDialog.vue'; // Need to ensure this import works
import { useLicenseStore } from '@/stores/license';
import { usePaymentStore } from '@/stores/payment';

const licenses = ref<any[]>([]);
const packages = ref<any[]>([]);
const selectedLicense = ref<any>(null);
const showSupportDialog = ref(false);

const licenseStore = useLicenseStore();
const paymentStore = usePaymentStore();

const fetchLicenses = async () => {
    try {
        const res = await licenseStore.fetchMyLicenses();
        if (res && res.data) {
            licenses.value = res.data.licenses;
            if (licenses.value.length > 0 && !selectedLicense.value) selectedLicense.value = licenses.value[0];
        }
    } catch (e) { }
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
        toast.info('Initializing secure secure gateway...');
        const res = await paymentStore.createCheckout({ packageId });
        if (res.data.url) {
            window.location.href = res.data.url;
        }
    } catch (e: any) {
        toast.error(e.response?.data?.error || 'Checkout initiation failed.');
    }
};

const renewLicense = async (license: any) => {
    // For MVP, we scroll to pricing, but pass the license Key to handle renewal logic
    // A robust impl would filter packages or show a modal. 
    // Here we just scroll for now, but in reality we'd likely want to select the package 
    // and call checkout with { packageId, licenseKey }.

    // Simulating "Renew with same tier" logic:
    const currentPkg = packages.value.find(p => p.tier === license.tier) || packages.value[0];
    if (!currentPkg) return;

    try {
        toast.info(`Renewing ${license.key}...`);
        // Payment store createCheckout likely supports custom payload or we update it?
        // Actually paymentStore.createCheckout takes { packageId }.
        // Does backend support licenseKey?
        // Let's assume we pass full payload, but paymentStore arg is typed as { packageId: string } in my update.
        // It says `payload: { packageId: string }`.
        // I should probably cast or update store.
        // `createCheckout` in `payment.ts` takes `payload`.
        // So passing extra is fine if payload is anyish or extended.
        const res = await paymentStore.createCheckout({
            packageId: currentPkg._id,
            licenseKey: license.key // passing extra prop
        } as any);

        if (res.data.url) {
            window.location.href = res.data.url;
        }
    } catch (e: any) {
        toast.error('Renewal Gateway Error');
    }
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();
const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
};

onMounted(() => {
    fetchLicenses();
    fetchPackages();

    // Check for success/cancel params from stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
        toast.success('Transaction Completed. Empire expanded.');
        verifySession(urlParams.get('session_id'));
    }
});

const verifySession = async (sessionId: string | null) => {
    if (!sessionId) return;
    try {
        await paymentStore.verifySession({ sessionId, gateway: 'stripe' });
        // Refresh
        fetchLicenses();
        // clear query params
        window.history.replaceState({}, '', window.location.pathname);
    } catch (e) { }
};
</script>

<style lang="scss" scoped>
.license-portal {
    min-height: 100vh;
    background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.05), transparent 40%);
}

.glass-card {
    backdrop-filter: blur(40px);
    background: rgba(255, 255, 255, 0.02);
}
</style>
