<template>
    <div class="fleet-manager p-8 animate-in">
        <header class="flex justify-between items-start mb-12">
            <div>
                <h1 class="text-4xl font-black tracking-tighter text-white mb-2">FLEET COMMAND</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Global Production
                    Infrastructure Monitoring</p>
            </div>
            <div class="flex items-center gap-6">
                <div class="text-right">
                    <p class="text-[8px] font-black opacity-40 uppercase">Total Active Units</p>
                    <p class="text-2xl font-black text-green-400">{{ stats.activeInstances }}</p>
                </div>
                <button
                    class="px-8 py-3 bg-white text-black rounded-full text-[10px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
                    @click="fetchFleet">Refresh
                    Command</button>
            </div>
        </header>

        <div v-if="loading" class="p-20 text-center text-blue-400 font-bold animate-pulse">ESTABLISHING DOWNLINK...
        </div>

        <div v-else class="grid grid-cols-12 gap-8 shadow-inner">
            <!-- STAT PANELS -->
            <div class="col-span-12 md:col-span-3 glass-card p-8 rounded-3xl border border-white/5">
                <p class="text-[10px] font-black opacity-30 uppercase mb-4 tracking-widest">Active Registries</p>
                <h2 class="text-3xl font-black">{{ licenses.length }}</h2>
                <p class="text-[8px] opacity-40 mt-2">Enterprise Tiers: {{ stats.enterpriseCount }}</p>
            </div>
            <div class="col-span-12 md:col-span-3 glass-card p-8 rounded-3xl border border-white/5">
                <p class="text-[10px] font-black opacity-30 uppercase mb-4 tracking-widest">Fleet Integrity</p>
                <h2 class="text-3xl font-black text-green-400">{{ stats.stability }}%</h2>
                <p class="text-[8px] opacity-40 mt-2">Status: OPTIMAL</p>
            </div>
            <div class="col-span-12 md:col-span-3 glass-card p-8 rounded-3xl border border-white/5">
                <p class="text-[10px] font-black opacity-30 uppercase mb-4 tracking-widest">Global Ingest</p>
                <h2 class="text-3xl font-black">4.2PB</h2>
                <p class="text-[8px] opacity-40 mt-2">S3 Throughput: OPTIMAL</p>
            </div>
            <div class="col-span-12 md:col-span-3 glass-card p-8 rounded-3xl border border-white/5">
                <p class="text-[10px] font-black opacity-30 uppercase mb-4 tracking-widest">Latest Engine</p>
                <h2 class="text-3xl font-black">v1.4.2</h2>
                <button class="text-[8px] font-black text-blue-400 uppercase mt-2 hover:underline">Orchestrate
                    Release</button>
            </div>

            <!-- MAIN TABLE: Fleet Registry -->
            <div class="col-span-12 glass-card rounded-[3rem] border border-white/5 overflow-hidden">
                <div class="p-10 border-b border-white/5 flex justify-between items-center">
                    <h3 class="text-sm font-black uppercase tracking-widest">Global Registry Database</h3>
                    <div class="flex gap-4">
                        <el-input placeholder="Filter by Owner/Key..." class="tac-search" size="small" />
                    </div>
                </div>

                <div class="fleet-table overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                            <tr>
                                <th class="p-6">License Identity</th>
                                <th class="p-6">Owner Context</th>
                                <th class="p-6">Tactical Tier</th>
                                <th class="p-6">Active Units</th>
                                <th class="p-6">Mission Status</th>
                                <th class="p-6 text-right">Operational Actions</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr v-for="lic in licenses" :key="lic._id"
                                class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td class="p-6">
                                    <p class="font-mono text-[10px] text-blue-400">{{ lic.key }}</p>
                                    <p class="text-[8px] opacity-30 mt-1 uppercase">EXPIRES: {{ formatDate(lic.endDate)
                                        }}</p>
                                </td>
                                <td class="p-6 font-bold">{{ lic.owner }}</td>
                                <td class="p-6">
                                    <span
                                        :class="['px-3 py-1 text-[8px] font-black rounded-lg uppercase border',
                                            lic.tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20']">
                                        {{ lic.tier }}
                                    </span>
                                </td>
                                <td class="p-6 font-black">{{ lic.activeInstances || 0 }} / {{ lic.instancesLimit }}
                                    Units</td>
                                <td class="p-6">
                                    <span class="flex items-center gap-2">
                                        <span
                                            :class="['w-1.5 h-1.5 rounded-full animate-pulse', lic.status === 'valid' ? 'bg-green-400' : 'bg-red-400']"></span>
                                        <span
                                            :class="['text-[10px] font-bold uppercase', lic.status === 'valid' ? 'text-green-400' : 'text-red-400']">{{
                                                lic.status }}</span>
                                    </span>
                                </td>
                                <td class="p-6 text-right">
                                    <button
                                        class="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors mr-6">Telemetry</button>
                                    <button @click="terminateLicense(lic)"
                                        class="text-[10px] font-black uppercase text-red-500/60 hover:text-red-400 transition-colors">Terminate</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

import { useLicenseStore } from '@/stores/license';
import { toast } from 'vue-sonner';

const licenseStore = useLicenseStore();

const licenses = ref<any[]>([]);
const loading = ref(true);

const stats = computed(() => {
    const total = licenses.value.reduce((acc, lic) => acc + (lic.instancesLimit || 0), 0);
    const active = licenses.value.reduce((acc, lic) => acc + (lic.activeInstances || 0), 0);
    const enterpriseCount = licenses.value.filter(l => l.tier === 'enterprise').length;

    return {
        totalInstances: total,
        activeInstances: active,
        enterpriseCount,
        stability: active > 0 ? 99.9 : 0
    };
});

const fetchFleet = async () => {
    try {
        loading.value = true;
        const data = await licenseStore.fetchAllLicenses();
        if (data.success) {
            licenses.value = data.licenses;
        }
    } catch (e) {
        toast.error('Tactical Downlink Failure: Could not reach Registry Hub.');
    } finally {
        loading.value = false;
    }
};

const formatDate = (date: string) => new Date(date).toISOString().split('T')[0];

const terminateLicense = async (lic: any) => {
    if (!confirm(`CRITICAL ACTION: Terminate license registry ${lic.key}?`)) return;
    toast.info('Initiating termination sequence...');
    // Impl delete route if needed, for now just placeholder
};

onMounted(fetchFleet);
</script>

<style lang="scss" scoped>
.fleet-manager {
    min-height: 100vh;
    background: radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.05), transparent 40%);
}

.glass-card {
    backdrop-filter: blur(40px);
    background: rgba(255, 255, 255, 0.02);
}

.tac-search {
    :deep(.el-input__wrapper) {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: none;
    }
}
</style>
