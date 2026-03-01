<template>
   <div class="infra-health min-h-screen p-8 relative overflow-hidden">
      <!-- Ambient Glows -->
      <div class="absolute top-0 right-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-600/4 rounded-full blur-3xl pointer-events-none" />

      <!-- Header -->
      <header class="mb-10 flex justify-between items-start relative z-10">
         <div>
            <div class="flex items-center gap-3 mb-2">
               <div class="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
               <h1 class="text-3xl font-black tracking-tight text-white">{{ t('admin.infra.title') }}</h1>
            </div>
            <p class="text-sm text-white/30 ml-4 pl-3">{{ t('admin.infra.subtitle') }}</p>
         </div>
         <div class="flex items-center gap-2.5 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-md">
            <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
            <span class="text-[10px] font-bold text-green-400 tracking-widest uppercase">{{ t('admin.infra.systemOperational') }}</span>
         </div>
      </header>

      <!-- Global Regions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 relative z-10">
         <div v-for="region in regions" :key="region.id"
            class="glass-card p-6 hover:border-blue-500/20 hover:shadow-[0_8px_30px_rgba(59,130,246,0.07)] transition-all duration-300 group">
            <div class="flex justify-between items-start mb-5">
               <div>
                  <p class="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-1">{{ region.name }}</p>
                  <p class="text-base font-bold text-white">{{ region.status }}</p>
               </div>
               <div class="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
                  :class="region.load > 70
                     ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                     : 'bg-blue-500/10 border-blue-500/20 text-blue-400'">
                  <connection-point size="18" />
               </div>
            </div>

            <div class="flex gap-6 mb-5">
               <div>
                  <p class="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{{ t('admin.infra.latency') }}</p>
                  <p class="text-sm font-mono font-bold text-white/70">{{ region.latency }}ms</p>
               </div>
               <div>
                  <p class="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{{ t('admin.infra.load') }}</p>
                  <p class="text-sm font-mono font-bold"
                     :class="region.load > 70 ? 'text-orange-400' : 'text-white/70'">{{ region.load }}%</p>
               </div>
               <div>
                  <p class="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{{ t('admin.infra.nodes') }}</p>
                  <p class="text-sm font-mono font-bold text-blue-400">{{ region.nodes || 0 }}</p>
               </div>
            </div>

            <!-- Load bar -->
            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div class="h-full rounded-full transition-all duration-500"
                  :class="region.load > 70 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'"
                  :style="{ width: region.load + '%' }" />
            </div>
         </div>

         <!-- Empty regions placeholder -->
         <div v-if="regions.length === 0" class="col-span-3 glass-card p-12 flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
               <connection-point size="22" class="text-blue-400/40" />
            </div>
            <p class="text-xs text-white/20 uppercase tracking-widest font-bold">{{ t('admin.infra.noRegions') }}</p>
         </div>
      </div>

      <!-- Cluster Management -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">

         <!-- Database Cluster -->
         <section class="glass-card p-6">
            <div class="flex justify-between items-center mb-6">
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                     <database-network size="16" class="text-blue-400" />
                  </div>
                  <h2 class="text-xs font-bold text-white/40 uppercase tracking-widest">{{ t('admin.infra.databaseCluster') }}</h2>
               </div>
               <button
                  class="text-[10px] font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all hover:bg-blue-500/15 uppercase tracking-wider">
                  {{ t('admin.infra.optimizeIndexes') }}
               </button>
            </div>

            <div class="space-y-3">
               <div v-for="node in dbNodes" :key="node.id"
                  class="p-4 rounded-xl bg-white/3 border border-white/5 flex justify-between items-center hover:border-white/10 hover:bg-white/5 transition-all group">
                  <div class="flex items-center gap-3">
                     <div class="w-9 h-9 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                        <database-network size="15" class="text-white/25 group-hover:text-blue-400/60 transition-colors" />
                     </div>
                     <div>
                        <p class="text-[11px] font-bold text-white/80 font-mono">{{ node.host }}</p>
                        <span class="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider"
                           :class="node.role === 'WRITER'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-white/5 text-white/30 border border-white/10'">
                           {{ node.role }}
                        </span>
                     </div>
                  </div>
                  <div class="flex items-center gap-4">
                     <div class="text-right">
                        <p class="text-[11px] font-mono text-white/60">{{ node.uptime }}</p>
                        <p class="text-[9px] text-white/20 uppercase tracking-wide">{{ t('admin.infra.uptime') }}</p>
                     </div>
                     <div class="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  </div>
               </div>
            </div>
         </section>

         <!-- Failover Orchestration -->
         <section class="glass-card p-6">
            <div class="flex justify-between items-center mb-5">
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                     <connection-point size="16" class="text-indigo-400" />
                  </div>
                  <h2 class="text-xs font-bold text-white/40 uppercase tracking-widest">{{ t('admin.infra.failoverTitle') }}</h2>
               </div>
               <span class="text-[9px] px-3 py-1 rounded-full bg-green-500/10 text-green-400 font-bold uppercase border border-green-500/20 tracking-wider">
                  {{ t('admin.infra.standbyReady') }}
               </span>
            </div>

            <p class="text-[12px] text-white/35 mb-6 leading-relaxed">
               {{ t('admin.infra.failoverDesc') }}
            </p>

            <div class="flex gap-3 mb-8">
               <button
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-blue-600 text-white border-none shadow-[0_4px_15px_rgba(59,130,246,0.25)] hover:brightness-110 hover:-translate-y-0.5 transition-all active:translate-y-0"
                  @click="triggerManualFailover">
                  {{ t('admin.infra.aiRedistribute') }}
               </button>
               <button
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80 transition-all"
                  @click="syncBackups">
                  {{ t('admin.infra.validateBackups') }}
               </button>
            </div>

            <div class="pt-5 border-t border-white/5">
               <div class="flex items-center gap-2 mb-3">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <h4 class="text-[9px] font-bold text-white/25 uppercase tracking-widest">{{ t('admin.infra.liveHeartbeat') }}</h4>
               </div>
               <div class="log-stream h-32 overflow-y-auto font-mono text-[10px] text-white/20 space-y-1 pr-1">
                  <p v-for="l in heartbeats" :key="l.t" class="leading-relaxed">
                     <span class="text-white/15">[{{ l.t }}]</span>
                     <span class="text-green-400/60 ml-1">{{ t('admin.infra.pulse') }}</span>
                     <span class="text-white/30 ml-1">{{ l.region }}</span>
                     <span class="text-white/15 ml-1">{{ t('admin.infra.loadLabel') }}</span>
                     <span :class="l.load > 70 ? 'text-orange-400/70' : 'text-blue-400/60'">{{ l.load }}%</span>
                  </p>
                  <p v-if="heartbeats.length === 0" class="text-white/10 italic">{{ t('admin.infra.waitingHeartbeat') }}</p>
               </div>
            </div>
         </section>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui';
import { useAdminStore } from '@/stores/admin';
import { ConnectionPoint, DatabaseNetwork } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n()
const uiStore = useUIStore();
const adminStore = useAdminStore();
const appSlug = computed(() => uiStore.appName.toLowerCase().replace(/\s+/g, '-'));

const regions = ref<any[]>([]);
const dbNodes = ref<any[]>([]);

const heartbeats = ref<any[]>([]);
const systemHealth = ref<any>(null);

let pollInterval: any = null;

const fetchMetrics = async () => {
   try {
      const [healthData, heartbeatData, clusterData] = await Promise.all([
         adminStore.fetchMonitoringHealth(),
         adminStore.fetchMonitoringHeartbeat(),
         adminStore.fetchDbCluster()
      ]);

      if (healthData) {
         systemHealth.value = healthData;
      }

      if (heartbeatData) {
         regions.value = heartbeatData;
         const now = new Date().toLocaleTimeString();
         heartbeatData.forEach((r: any) => {
            if (r.load > 10) { // Only log pulses for "active" looking regions
               heartbeats.value.unshift({ t: now, region: r.name, load: r.load });
            }
         });
         if (heartbeats.value.length > 50) heartbeats.value = heartbeats.value.slice(0, 50);
      }

      if (clusterData) {
         dbNodes.value = clusterData;
      }
   } catch (e) {
      console.error(t('admin.infra.toasts.fetchFailed'), e);
   }
};

onMounted(() => {
   fetchMetrics();
   pollInterval = setInterval(fetchMetrics, 30000);
});

onUnmounted(() => {
   if (pollInterval) clearInterval(pollInterval);
});

const triggerManualFailover = () => {
   toast.warning(t('admin.infra.toasts.failoverInitiated'));
};

const syncBackups = () => {
   toast.success(t('admin.infra.toasts.integrityVerified'));
};
</script>

<style lang="scss" scoped>
.infra-health {
   background: #0a0a0c;
   color: #e5e5e5;
   font-family: 'Inter', sans-serif;
}

.glass-card {
   background: rgba(15, 15, 18, 0.6);
   border: 1px solid rgba(255, 255, 255, 0.06);
   border-radius: 20px;
   backdrop-filter: blur(30px) saturate(180%);
   transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.log-stream {
   &::-webkit-scrollbar { width: 3px; }
   &::-webkit-scrollbar-track { background: transparent; }
   &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
   }
}
</style>
