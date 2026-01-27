<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h2 class="text-2xl font-black text-white">Import from {{ platform === 'capcut' ? 'CapCut' : 'Canva' }}</h2>
          <p class="text-gray-400 text-sm mt-1">Paste the template URL to start importing</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-white/5 rounded-full transition-colors">
          <i class="ri-close-line text-xl text-gray-400"></i>
        </button>
      </div>

      <div class="space-y-6">
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Template URL</label>
          <input 
            v-model="url" 
            type="text" 
            :placeholder="platform === 'capcut' ? 'https://www.capcut.com/template-detail/...' : 'https://www.canva.com/design/...'"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
            :disabled="loading"
          />
        </div>

        <div v-if="loading" class="flex flex-col items-center py-8">
          <div class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p class="text-blue-400 font-bold animate-pulse">Analyzing External Template...</p>
          <p class="text-gray-500 text-xs mt-2">Puppeteer is fetching actual timeline data</p>
        </div>

        <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p class="text-red-400 text-sm">{{ error }}</p>
        </div>

        <button 
          @click="handleImport" 
          :disabled="!url || loading"
          class="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          {{ loading ? 'Importing...' : 'Start Import' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import api from '@/utils/api'

const props = defineProps<{
  platform: 'capcut' | 'canva'
}>()

const emit = defineEmits(['close', 'imported'])

const url = ref('')
const loading = ref(false)
const error = ref('')

const handleImport = async () => {
  if (!url.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const endpoint = props.platform === 'capcut' ? '/marketplace/import/capcut' : '/marketplace/import/canva'
    const response = await api.post(endpoint, { url: url.value })
    
    if (response.data.success) {
      emit('imported', response.data.data.template)
    } else {
      error.value = response.data.error || 'Failed to import template'
    }
  } catch (e: any) {
    console.error('Import error:', e)
    error.value = e.response?.data?.error || 'Target platform blocked scraping or URL is invalid.'
  } finally {
    loading.value = false
  }
}
</script>
