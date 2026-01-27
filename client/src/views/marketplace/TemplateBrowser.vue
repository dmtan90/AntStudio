<template>
  <div class="marketplace-view min-h-screen bg-[#0a0a0c] text-white">
    <!-- Header Section -->
    <header class="relative py-20 px-8 overflow-hidden border-b border-white/5">
      <div class="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none"></div>
      <div class="max-w-7xl mx-auto relative z-10">
        <h1 class="text-6xl font-black mb-4 tracking-tighter">
          AntFlow <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Marketplace</span>
        </h1>
        <p class="text-xl text-gray-400 max-w-2xl leading-relaxed">
          Unlock your productivity with premium AI video templates. Import from CapCut, Canva, or discover our native creative library.
        </p>
        
        <div class="flex gap-4 mt-8">
          <button @click="openImport('capcut')" class="px-8 py-4 bg-gradient-to-r from-[#FF0050] to-[#00F2EA]/20 rounded-2xl font-black hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
            Import from CapCut
          </button>
          <button @click="openImport('canva')" class="px-8 py-4 bg-gradient-to-r from-[#00C4CC] to-blue-500/20 rounded-2xl font-black hover:scale-105 transition-transform shadow-lg shadow-cyan-500/20">
            Import from Canva
          </button>
        </div>
      </div>
    </header>

    <!-- Content Section -->
    <main class="max-w-7xl mx-auto py-12 px-8">
      <!-- Filters -->
      <div class="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div class="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            @click="filters.category = cat.id"
            :class="[
              'px-6 py-2.5 rounded-xl font-bold text-sm transition-all',
              filters.category === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'
            ]"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative min-w-[300px]">
            <i class="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input 
              v-model="filters.search"
              placeholder="Search templates..." 
              class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
            />
          </div>
          <select v-model="filters.sort" class="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold outline-none focus:border-blue-500/50">
            <option value="featured">Featured</option>
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-20">
        <div v-for="i in 8" :key="i" class="aspect-[9/16] bg-white/5 animate-pulse rounded-2xl"></div>
      </div>

      <!-- Grid -->
      <div v-else-if="templates.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <TemplateCard 
          v-for="tpl in templates" 
          :key="tpl._id" 
          :template="tpl" 
          @use="useTemplate"
          @view="viewTemplate"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-32 border border-dashed border-white/10 rounded-3xl">
        <i class="ri-ghost-line text-6xl text-gray-600 mb-4 block"></i>
        <h3 class="text-xl font-black mb-2">No templates found</h3>
        <p class="text-gray-500">Try adjusting your filters or import your first template!</p>
      </div>
    </main>

    <!-- Import Dialog -->
    <ImportDialog 
      v-if="importDialog.show" 
      :platform="importDialog.platform"
      @close="importDialog.show = false"
      @imported="handleImported"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import TemplateCard from '@/components/marketplace/TemplateCard.vue'
import ImportDialog from '@/components/marketplace/ImportDialog.vue'

const router = useRouter()
const loading = ref(false)
const templates = ref<any[]>([])

const categories = [
  { id: '', name: 'All' },
  { id: 'full-video', name: 'Full Video' },
  { id: 'intro', name: 'Intro' },
  { id: 'social-media', name: 'Social Media' },
  { id: 'tutorial', name: 'Tutorial' }
]

const filters = reactive({
  category: '',
  search: '',
  sort: 'featured'
})

const importDialog = reactive<{show: boolean, platform: 'capcut' | 'canva'}>({
  show: false,
  platform: 'capcut'
})

const fetchTemplates = async () => {
  loading.value = true
  try {
    const response = await api.get('/marketplace/templates', { params: filters })
    templates.value = response.data.data.templates
  } catch (e) {
    console.error('Failed to fetch templates:', e)
  } finally {
    loading.value = false
  }
}

const openImport = (platform: 'capcut' | 'canva') => {
  importDialog.platform = platform
  importDialog.show = true
}

const handleImported = (newTemplate: any) => {
  importDialog.show = false
  templates.value.unshift(newTemplate)
  // Optionally view detail or go to editor
}

const useTemplate = async (template: any) => {
  try {
    // Record download/use
    await api.post(`/marketplace/templates/${template._id}/use`)
    
    // Create new project from template structure
    const projectResponse = await api.post('/projects', {
      title: `Copy of ${template.name}`,
      description: template.description,
      aspectRatio: template.structure.aspectRatio,
      mode: 'topic',
      storyboard: template.structure
    })
    
    router.push(`/editor/${projectResponse.data.data.id}`)
  } catch (e) {
    console.error('Failed to use template:', e)
  }
}

const viewTemplate = (template: any) => {
  // Navigation to detail view if implemented
  console.log('View template:', template._id)
}

watch(filters, () => fetchTemplates())

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.marketplace-view {
  background-image: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.05) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.05) 0, transparent 50%);
}
</style>
