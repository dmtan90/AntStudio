<template>
  <div id="tour-stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
     <!-- Credits -->
     <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.08] transition-colors">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <star size="64" />
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('dashboard.stats.credits') }}</div>
        <div class="text-3xl font-black text-white mb-1">{{ user?.credits?.balance || 0 }}</div>
        <div class="text-xs text-gray-400 font-bold uppercase tracking-wider"><span class="text-green-400">{{ user?.subscription?.plan || t('dashboard.stats.free') }}</span> {{ t('dashboard.stats.plan') }}</div>
     </div>

     <!-- Active Projects -->
     <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.08] transition-colors cursor-pointer" @click="router.push('/projects')">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <video-file size="64" />
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('dashboard.stats.activeProjects') }}</div>
        <div class="text-3xl font-black text-white mb-1">{{ pagination?.total || 0 }}</div>
        <div class="text-xs text-blue-400 font-bold uppercase tracking-wider">{{ t('dashboard.stats.viewAll') }}</div>
     </div>

     <!-- Platforms -->
     <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.08] transition-colors cursor-pointer" @click="router.push('/platforms')">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <share-three size="64" />
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('dashboard.stats.connectedPlatforms') }}</div>
        <div class="text-3xl font-black text-white mb-1">{{ platformAccounts.length }}</div>
        <div class="text-xs text-purple-400 font-bold uppercase tracking-wider">{{ t('dashboard.stats.manageConnections') }}</div>
     </div>

     <!-- Commerce (Conditional) -->
     <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.08] transition-colors cursor-pointer" @click="router.push('/merchants')">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <shopping size="64" />
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('dashboard.stats.commerce') }}</div>
        <div class="text-3xl font-black text-white mb-1 flex gap-1 items-baseline">
           <span class="text-sm text-gray-500">{{ commerceStats?.currency || '$' }}</span>
           {{ commerceStats?.totalRevenue?.toLocaleString() || 0 }}
        </div>
        <div class="text-xs text-green-400 font-bold uppercase tracking-wider">{{ commerceStats?.pendingOrders || 0 }} {{ t('dashboard.stats.pendingOrders') }}</div>
     </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Star, VideoFile, ShareThree, Shopping } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
defineProps<{
  user: any;
  pagination: any;
  platformAccounts: any[];
  commerceStats: any;
}>();

const router = useRouter();
</script>
