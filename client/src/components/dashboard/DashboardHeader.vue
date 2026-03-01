<template>
  <header class="relative py-12 px-8 overflow-hidden border-b border-white/5 bg-[#0a0a0c]">
    <div class="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-transparent pointer-events-none"></div>
    
    <!-- Ambient Glows -->
    <div class="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse"></div>
    <div class="absolute top-1/2 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="max-w-7xl mx-auto relative z-10">
      <div class="flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            <span class="text-[10px] font-black uppercase tracking-widest text-green-400">{{ t('dashboard.header.systemOperational') }}</span>
          </div>
          
          <h1 id="tour-welcome" class="text-6xl font-black mb-4 tracking-tighter leading-[0.9] text-white">
            {{ t('dashboard.header.welcomeBack') }} <br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
              {{ user?.name || t('common.creator') }}
            </span>
          </h1>
          <p class="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
            {{ t('dashboard.header.subtitle') }}
          </p>
        </div>

        <!-- Quick Actions -->
        <div id="tour-actions" class="flex gap-4">
            <button @click="$emit('create')" class="whitespace-nowrap group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <plus theme="outline" size="20" />
              {{ t('dashboard.header.newProject') }}
            </button>
            <button @click="router.push('/live/studio')" class="whitespace-nowrap group px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-3">
              <broadcast theme="outline" size="20" class="text-red-500" />
              {{ t('dashboard.header.goLive') }}
            </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Plus, Broadcast } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const props = defineProps<{
  user: any;
}>();

defineEmits(['create']);

const router = useRouter();
</script>
