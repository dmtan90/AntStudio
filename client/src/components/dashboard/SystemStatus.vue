<template>
  <div class="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
     <h3 class="text-sm font-black uppercase tracking-widest text-gray-500 mb-6">{{ t('dashboard.systemStatus.title') }}</h3>
     <div class="space-y-4">
         <div class="flex items-center justify-between">
             <span class="text-sm font-medium text-gray-400">{{ t('dashboard.systemStatus.aiEngine') }}</span>
             <span class="text-xs font-black text-green-400 px-2 py-1 bg-green-500/10 rounded uppercase">{{ t('dashboard.systemStatus.status.operational') }}</span>
         </div>
         <div class="flex items-center justify-between">
             <span class="text-sm font-medium text-gray-400">{{ t('dashboard.systemStatus.renderingNodes') }}</span>
             <span class="text-xs font-black text-green-400 px-2 py-1 bg-green-500/10 rounded uppercase">{{ t('dashboard.systemStatus.status.idle') }}</span>
         </div>
         <div class="flex items-center justify-between">
             <span class="text-sm font-medium text-gray-400">{{ t('dashboard.systemStatus.storage') }}</span>
             <span class="text-xs font-black text-blue-400 px-2 py-1 bg-blue-500/10 rounded uppercase">{{ t('dashboard.systemStatus.status.healthy') }}</span>
         </div>
     </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
// Static component for now, but ready for future dynamic data
</script>
