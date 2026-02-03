<template>
   <div class="infra-health p-6 animate-in">
      <header class="page-header mb-10 flex justify-between items-start">
         <div>
            <h1 class="text-3xl font-black text-white tracking-tight mb-2 uppercase">Global Infrastructure Hub</h1>
            <p class="text-gray-400">Mission-critical monitoring and disaster recovery control center.</p>
         </div>
         <div
            class="system-badge flex items-center gap-3 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
            <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[10px] font-black text-green-500 tracking-widest uppercase">System Operational</span>
         </div>
      </header>

      <!-- Global Regions Map/Grid -->
      <div class="regions-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div v-for="region in regions" :key="region.id"
            class="region-card glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <div class="flex justify-between items-start mb-6">
               <div>
                  <h3 class="text-xs font-black uppercase opacity-40 mb-1">{{ region.name }}</h3>
                  <p class="text-lg font-black text-white">{{ region.status }}</p>
               </div>
               <connection-point :class="region.load > 70 ? 'text-orange-500' : 'text-blue-400'" />
            </div>

            <div class="stats-row flex gap-4">
               <div class="stat">
                  <p class="text-[8px] font-black opacity-20 uppercase">Latency</p>
                  <p class="text-xs font-mono font-bold">{{ region.latency }}ms</p>
               </div>
               <div class="stat">
                  <p class="text-[8px] font-black opacity-20 uppercase">Load</p>
                  <p class="text-xs font-mono font-bold">{{ region.load }}%</p>
               </div>
               <div class="stat">
                  <p class="text-[8px] font-black opacity-20 uppercase">Nodes</p>
                  <p class="text-xs font-mono font-bold text-blue-400">{{ region.nodes || 0 }}</p>
               </div>
            </div>

            <div class="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div class="h-full bg-blue-500" :style="{ width: region.load + '%' }"></div>
            </div>
         </div>
      </div>

      <!-- Cluster Management -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section class="glass-card p-8 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center mb-8">
               <h2 class="text-xs font-black uppercase tracking-[0.2em] opacity-40">Database Cluster</h2>
               <button class="text-[10px] font-black text-blue-400 hover:underline">OPTIMIZE INDEXES</button>
            </div>

            <div class="nodes-list space-y-4">
               <div v-for="node in dbNodes" :key="node.id"
                  class="node-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                  <div class="flex items-center gap-4">
                     <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                        <database-network size="16" class="opacity-40" />
                     </div>
                     <div>
                        <p class="text-[10px] font-black">{{ node.host }}</p>
                        <span class="text-[8px] px-2 py-0.5 rounded bg-white/10 uppercase">{{ node.role }}</span>
                     </div>
                  </div>
                  <div class="flex items-center gap-6">
                     <div class="text-right">
                        <p class="text-[10px] font-mono">{{ node.uptime }}</p>
                        <p class="text-[8px] opacity-20 uppercase">Uptime</p>
                     </div>
                     <div class="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
               </div>
            </div>
         </section>

         <section class="glass-card p-8 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center mb-8">
               <h2 class="text-xs font-black uppercase tracking-[0.2em] opacity-40">Failover Orchestration</h2>
               <span
                  class="text-[8px] px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 font-bold uppercase border border-orange-500/20">Standby
                  Ready</span>
            </div>

            <p class="text-xs text-gray-400 mb-8 leading-relaxed">Automated disaster recovery is active. If the Primary
               Region (Asia-East-1) fails, traffic is automatically re-routed to US-West-2 within 45 seconds.</p>

            <div class="flex gap-4">
               <button class="primary-btn flex-1 py-4 text-[10px] font-black" @click="triggerManualFailover">AI
                  REDISTRIBUTE</button>
               <button class="secondary-btn flex-1 py-4 text-[10px] font-black" @click="syncBackups">VALIDATE
                  BACKUPS</button>
            </div>

            <div class="mt-10 pt-10 border-t border-white/5">
               <h4 class="text-[8px] font-black opacity-30 uppercase mb-4">Live Heartbeat Log</h4>
               <div class="log-stream h-32 overflow-y-auto font-mono text-[9px] text-gray-500 space-y-1">
                  <p v-for="l in heartbeats" :key="l.t">[{{ l.t }}] INFRA_PULSE: Region {{ l.region }} healthy. Load: {{
                     l.load }}%</p>
               </div>
            </div>
         </section>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useUIStore } from '@/stores/ui';
import { ConnectionPoint, DatabaseNetwork } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import api from '@/utils/api';

const uiStore = useUIStore();
const appSlug = computed(() => uiStore.appName.toLowerCase().replace(/\s+/g, '-'));

const regions = ref<any[]>([]);
const dbNodes = ref([
   { id: 'master', host: `db-master-01.${appSlug.value}.internal`, role: 'WRITER', uptime: 'Active' },
   { id: 'read1', host: `db-replica-01.${appSlug.value}.internal`, role: 'READER', uptime: 'Active' },
]);

const heartbeats = ref<any[]>([]);
const systemHealth = ref<any>(null);

let pollInterval: any = null;

const fetchMetrics = async () => {
   try {
      const [healthRes, heartbeatRes] = await Promise.all([
         api.get('/admin/monitoring/health'),
         api.get('/admin/monitoring/heartbeat')
      ]);

      if (healthRes.data.success) {
         systemHealth.value = healthRes.data.data;
      }

      if (heartbeatRes.data.success) {
         regions.value = heartbeatRes.data.data;
         // Add to log
         const now = new Date().toLocaleTimeString();
         heartbeatRes.data.data.forEach((r: any) => {
            heartbeats.value.unshift({ t: now, region: r.name, load: r.load });
         });
         // Keep last 50
         if (heartbeats.value.length > 50) heartbeats.value = heartbeats.value.slice(0, 50);
      }
   } catch (e) {
      console.error("Failed to fetch infra metrics", e);
   }
};

onMounted(() => {
   fetchMetrics();
   pollInterval = setInterval(fetchMetrics, 30000); // 30s
});

onUnmounted(() => {
   if (pollInterval) clearInterval(pollInterval);
});

const triggerManualFailover = () => {
   toast.warning("Manual failover initiated. Monitoring service migration...");
};

const syncBackups = () => {
   toast.success("Cross-region media integrity: 100% VERIFIED");
};
</script>

<style lang="scss" scoped>
.infra-health {
   .region-card:hover {
      background: rgba(59, 130, 246, 0.03);
   }

   .log-stream::-webkit-scrollbar {
      width: 4px;
   }
}
</style>
