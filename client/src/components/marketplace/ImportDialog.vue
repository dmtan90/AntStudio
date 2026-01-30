<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl"></div>

      <div class="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h2 class="text-3xl font-black text-white tracking-tight">Import Template</h2>
          <p class="text-gray-400 text-sm mt-2 flex items-center gap-2">
            <Info class="text-blue-400" />
            Supports Canva designs and CapCut templates
          </p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Close class="text-2xl text-gray-400" />
        </button>
      </div>

      <div class="space-y-8 relative z-10">
        <div class="group">
          <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">Paste Template
            URL</label>
          <div class="relative">
            <input v-model="url" type="text" placeholder="https://www.capcut.com/... or https://www.canva.com/..."
              class="w-full pl-5 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-lg group-hover:border-white/20"
              :disabled="loading" />
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
              <Edit v-if="detectedPlatform === 'canva'" class="text-[#00C4CC] text-2xl animate-in zoom-in" />
              <VideoOne v-if="detectedPlatform === 'capcut'" class="text-[#FF0050] text-2xl animate-in zoom-in" />
            </div>
          </div>
        </div>

        <div v-if="loading"
          class="flex flex-col items-center py-10 bg-white/5 rounded-3xl border border-white/5 animate-pulse">
          <div class="w-16 h-16 border-[6px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <p class="text-blue-400 font-black text-lg tracking-tight">Processing Template...</p>
          <p class="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">Connecting to {{ detectedPlatform ||
            'Platform' }}</p>
        </div>

        <div v-if="error"
          class="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in shake duration-500">
          <Attention class="text-red-400 text-xl mt-0.5" />
          <p class="text-red-400/90 text-sm leading-relaxed font-medium">{{ error }}</p>
        </div>

        <button @click="handleImport" :disabled="!url || loading"
          class="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95">
          <span v-if="!loading" class="flex items-center justify-center gap-2">
            <Magic />
            Start Magic Import
          </span>
          <span v-else>Importing...</span>
        </button>

        <p class="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          Privacy Protected & Safe Scrape
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMarketplaceStore } from '@/stores/marketplace'
import { Close, Info, Magic, Attention, Edit, VideoOne } from '@icon-park/vue-next';

const emit = defineEmits(['close', 'imported'])

const marketplaceStore = useMarketplaceStore()
const url = ref('')
const loading = ref(false)
const error = ref('')

const detectedPlatform = computed(() => {
  if (url.value.includes('canva.com')) return 'canva'
  if (url.value.includes('capcut.com')) return 'capcut'
  return null
})

const handleImport = async () => {
  if (!url.value) return
  if (!detectedPlatform.value) {
    error.value = 'Unsupported URL. Please enter a valid Canva or CapCut template link.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const template = await marketplaceStore.importTemplate(url.value)
    emit('imported', template)
  } catch (e: any) {
    console.error('Import error:', e)
    error.value = e.message || 'Failed to import template. The template might be private or the platform is blocking our access.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
}

.shake {
  animation: shake 0.5s ease-in-out;
}
</style>
