<template>
  <div class="marketplace-view min-h-screen bg-[#0a0a0c] text-white">
    <!-- Header Section -->
    <header class="relative py-24 px-8 overflow-hidden border-b border-white/5">
      <div
        class="absolute inset-0 bg-gradient-to-br from-blue-600/15 via-purple-600/5 to-transparent pointer-events-none">
      </div>
      <!-- Animated background glow -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse"
        style="animation-delay: 1s"></div>

      <div class="max-w-7xl mx-auto relative z-10">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <div class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">{{ t('marketplace.badge') }}</span>
        </div>
        <h1 class="text-7xl font-black mb-6 tracking-tighter leading-[0.9]">
          {{ t('marketplace.magic') }} <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">{{ t('marketplace.template') }}</span><br />
          {{ t('marketplace.hub') }}
        </h1>
        <p class="text-xl text-gray-400 max-w-2xl leading-relaxed mb-10 font-medium">
          {{ t('marketplace.subtitle') }}
        </p>

        <div class="flex flex-wrap gap-4">
          <button @click="importDialog.show = true"
            class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden">
            <div
              class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity">
            </div>
            <Magic theme="filled" class="text-xl" />
            {{ t('marketplace.importUrl') }}
          </button>

          <button @click="triggerPptxUpload" :disabled="isImportingPptx"
            class="group px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-3 relative overflow-hidden disabled:opacity-50">
            <div
              class="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 opacity-0 group-hover:opacity-10 transition-opacity">
            </div>
            <component :is="isImportingPptx ? Loading : 'div'" :class="{ 'animate-spin': isImportingPptx }">
              <DocDetail v-if="!isImportingPptx" theme="filled" class="text-xl text-orange-400" />
            </component>
            {{ isImportingPptx ? t('marketplace.importingPptx') : t('marketplace.importPptx') }}
          </button>

          <!-- Hidden File Input -->
          <input type="file" ref="pptxInput" class="hidden" accept=".pptx" @change="handlePptxFile" />

          <div class="flex -space-x-4">
            <div v-for="i in 3" :key="i"
              class="w-12 h-12 rounded-2xl border-2 border-[#0a0a0c] overflow-hidden bg-white/5 backdrop-blur-md">
              <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`"
                class="w-full h-full object-cover" />
            </div>
            <div
              class="w-12 h-12 rounded-2xl border-2 border-[#0a0a0c] bg-white/10 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white">
              +2k
            </div>
          </div>
          <div class="flex flex-col justify-center ml-2">
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('marketplace.trustedBy') }}</div>
            <div class="text-xs font-bold text-gray-300">{{ t('marketplace.globalCreators') }}</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Content Section -->
    <main class="max-w-7xl mx-auto py-16 px-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <el-segmented v-model="activeTab" :options="tabs"
          class="premium-segmented h-14 rounded-2xl bg-white/5 p-1.5 border border-white/5">
          <template #default="scope">
            <div class="flex items-center gap-2.5 px-5 h-full transition-all">
              <Earth v-if="scope.item.value === 'public'" class="text-blue-400" />
              <VideoOne v-if="scope.item.value === 'capcut'" class="text-[#FF0050]" />
              <Edit v-if="scope.item.value === 'canva'" class="text-[#00C4CC]" />
              <User v-if="scope.item.value === 'private'" class="text-purple-400" />
              <span class="font-black text-sm tracking-tight">{{ t('marketplace.tabs.' + scope.item.value) }}</span>
            </div>
          </template>
        </el-segmented>

        <div class="relative group min-w-[320px]">
          <Search
            class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-lg group-focus-within:text-blue-400 transition-colors" />
          <input v-model="filters.search" :placeholder="t('marketplace.search')"
            class="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] transition-all outline-none text-base" />
        </div>
      </div>

      <!-- Canva Discovery UI -->
      <div v-if="activeTab === 'canva'" class="mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div class="flex flex-col gap-10">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-[#00C4CC]/10 flex items-center justify-center">
                  <Edit theme="filled" class="text-[#00C4CC] text-xl" />
                </div>
                <span class="text-sm font-black text-[#00C4CC] uppercase tracking-[0.2em]">{{ t('marketplace.canva.title') }}</span>
              </div>
              <h2 class="text-5xl font-black tracking-tight leading-tight">{{ t('marketplace.canva.professionalVideo') }} <br /> <span
                  class="text-[#00C4CC]">{{ t('marketplace.template') }}s</span></h2>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <button
              class="px-6 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-black flex items-center gap-3 hover:bg-white/20 hover:scale-105 transition-all text-white">
              <Equalizer /> {{ t('marketplace.canva.allFilters') }}
            </button>
            <div class="h-10 w-px bg-white/10 mx-2"></div>
            <button v-for="tag in ['style', 'theme', 'price', 'color']" :key="tag"
              class="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold flex items-center gap-4 hover:border-white/20 transition-all text-gray-300">
              {{ t('marketplace.filters.' + tag) }}
              <Down class="text-gray-600" />
            </button>
            <div class="h-10 w-px bg-white/10 mx-2"></div>
            <button v-for="pill in ['peaceVideos', 'birthday', 'education', 'nature', 'business']" :key="pill"
              @click="filters.category = pill" :class="['px-6 py-3 rounded-2xl text-sm font-black transition-all border outline-none',
                filters.category === pill
                  ? 'bg-[#00C4CC] text-white border-[#00C4CC] shadow-xl shadow-teal-500/20 scale-105'
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white']">
              {{ t('marketplace.categories.' + pill) }}
            </button>
          </div>
        </div>
      </div>

      <!-- CapCut Discovery UI -->
      <div v-if="activeTab === 'capcut'" class="mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div class="flex flex-col gap-10">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-[#FF0050]/10 flex items-center justify-center">
                  <VideoOne theme="filled" class="text-[#FF0050] text-xl" />
                </div>
                <span class="text-sm font-black text-[#FF0050] uppercase tracking-[0.2em]">{{ t('marketplace.capcut.title') }}</span>
              </div>
              <div class="flex items-center gap-10">
                <button @click="filters.category = 'video'"
                  :class="['text-5xl font-black transition-all pb-2', (filters.category === 'video' || !filters.category) ? 'text-white border-b-4 border-[#FF0050]' : 'text-gray-600 hover:text-gray-400']">{{ t('marketplace.types.video') }}</button>
                <button @click="filters.category = 'image'"
                  :class="['text-5xl font-black transition-all pb-2', filters.category === 'image' ? 'text-white border-b-4 border-[#FF0050]' : 'text-gray-600 hover:text-gray-400']">{{ t('marketplace.types.image') }}</button>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button v-for="cat in ['forYou', 'trending', 'newYear', 'business', 'tiktok', 'vlog', 'student']"
              :key="cat" @click="filters.category = cat" :class="['px-8 py-3.5 rounded-2xl text-sm font-black transition-all border outline-none',
                (filters.category === cat || (cat === 'forYou' && !filters.category))
                  ? 'bg-[#FF0050] text-white border-[#FF0050] shadow-xl shadow-pink-500/20 scale-105'
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white']">
              {{ t('marketplace.categories.' + cat) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Private/Public Title -->
      <div v-if="activeTab === 'public' || activeTab === 'private'" class="mb-12">
        <div class="flex items-center gap-4 mb-2">
          <div class="w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <span class="text-sm font-black uppercase tracking-widest text-gray-500">
            {{ activeTab === 'public' ? t('marketplace.sections.featured') : t('marketplace.sections.personal') }}
          </span>
        </div>
        <h2 class="text-5xl font-black tracking-tight">
          {{ activeTab === 'public' ? t('marketplace.sections.community') : t('marketplace.sections.myLibrary') }}
        </h2>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-20">
        <div v-for="i in 8" :key="i" class="aspect-[9/16] bg-white/5 animate-pulse rounded-2xl"></div>
      </div>

      <!-- Grid -->
      <div v-else-if="templates.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <TemplateCard v-for="tpl in templates" :key="tpl._id" :template="tpl" @use="useTemplate" @view="viewTemplate" />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-32 border border-dashed border-white/10 rounded-3xl">
        <Ghost class="text-6xl text-gray-600 mb-4 block" />
        <h3 class="text-xl font-black mb-2">{{ t('marketplace.empty.noTemplates') }}</h3>
        <p class="text-gray-500">
          {{
            activeTab === 'private' ?
              t('marketplace.empty.privateDesc') :
              t('marketplace.empty.publicDesc') }}
        </p>
      </div>

      <el-pagination class="mt-12 w-full flex justify-center" v-model:current-page="filters.page"
        v-model:page-size="filters.limit" :total="filters.total" :page-sizes="[12, 24, 48]"
        layout="total, prev, pager, next" @update:current-page="handlePageChange" @update:page-size="handleSizeChange" />
    </main>

    <!-- Import Dialog -->
    <ImportDialog v-if="importDialog.show" @close="importDialog.show = false" @imported="handleImported" />

    <!-- Preview Dialog -->
    <TemplatePreviewDialog v-if="previewDialog.show" :show="previewDialog.show" :template="previewDialog.template"
      @close="previewDialog.show = false" @use="useTemplate" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Magic,
  Earth,
  VideoOne,
  Edit,
  User,
  Search,
  Equalizer,
  Down,
  Ghost,
  DocDetail,
  Loading
} from '@icon-park/vue-next'
import TemplateCard from '@/components/marketplace/TemplateCard.vue'
import ImportDialog from '@/components/marketplace/ImportDialog.vue'
import TemplatePreviewDialog from '@/components/marketplace/TemplatePreviewDialog.vue'
import { useMarketplaceStore } from '@/stores/marketplace'
import { useProjectStore } from '@/stores/project'
import { useI18n } from 'vue-i18n';

const router = useRouter()
const marketplaceStore = useMarketplaceStore()
const projectStore = useProjectStore()
const { t } = useI18n()

const loading = ref(false)
const templates = ref<any[]>([])

const activeTab = ref('public');

const tabs = [
  { value: 'public', name: 'Public' },
  { value: 'canva', name: 'Canva' },
  { value: 'capcut', name: 'Capcut' },
  { value: 'private', name: 'My Templates' },
];

const filters = reactive({
  category: '',
  search: '',
  sort: 'featured',
  page: 1,
  limit: 12,
  total: 0,
  tab: 'public'
})

const importDialog = reactive<{ show: boolean }>({
  show: false
})

const previewDialog = reactive<{ show: boolean, template: any }>({
  show: false,
  template: null
})

const pptxInput = ref<HTMLInputElement | null>(null)
const isImportingPptx = ref(false)

const triggerPptxUpload = () => {
  pptxInput.value?.click()
}

const handlePptxFile = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return

  isImportingPptx.value = true
  try {
    const newTemplate = await marketplaceStore.importPptx(file)
    handleImported(newTemplate)
  } catch (e) {
    console.error('Failed to import PPTX:', e)
  } finally {
    isImportingPptx.value = false
    if (pptxInput.value) pptxInput.value.value = ''
  }
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    filters.tab = activeTab.value
    const data = await marketplaceStore.fetchTemplates(filters)
    templates.value = data.templates || []
    filters.total = data.total || 0
    filters.page = data.page || 1
  } catch (e) {
    console.error('Failed to fetch templates:', e)
  } finally {
    loading.value = false
  }
}

const handleImported = (newTemplate: any) => {
  importDialog.show = false
  if (activeTab.value === 'private') {
    templates.value.unshift(newTemplate)
  } else {
    activeTab.value = 'private'
  }
}

const useTemplate = async (template: any) => {
  try {
    // If triggered from preview dialog, close it
    previewDialog.show = false;

    console.log('Using template with variant/page:', template, template.selectedPageId || 'default');

    await marketplaceStore.useTemplate(template._id)
    const selectedPage = template.pages.find((page: any) => page.id === template.selectedPageId)
    console.log('Selected page:', selectedPage)
    const duration = (selectedPage?.duration ?? 0) / 1000;
    const aspectRatio = selectedPage?.data?.orientation == 'square' ? '1:1' : (selectedPage?.data?.orientation == 'portrait' ? '9:16' : '16:9');
    const templateData = { ...template, pages: [selectedPage] };

    const data = await projectStore.createProject({
      title: `${template.name}`,
      description: template.description,
      mode: "template",
      targetDuration: duration,
      aspectRatio: aspectRatio,
      videoStyle: 'ads',
      pages: [selectedPage]
    });



    // const payload = {
    //   objective: 'E-commerce Ad',
    //   adapter: 'edit',//create
    //   ratio: aspectRatio,
    //   template: templateData,
    //   headless: false
    // };

    // const encodedState = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const project = data.project;
    router.push({name: 'project-studio', params: {id: project._id}});
  } catch (e) {
    console.error('Failed to use template:', e)
  }
}

const handleSizeChange = (val: number) => {
  filters.limit = val
  fetchTemplates()
}
const handlePageChange = (val: number) => {
  filters.page = val
  fetchTemplates()
}

const viewTemplate = (template: any) => {
  console.log('View template:', template._id)
  previewDialog.template = template
  previewDialog.show = true
}

watch(activeTab, () => {
  filters.page = 1
  fetchTemplates()
})

watch(() => filters.search, () => {
  filters.page = 1
  fetchTemplates()
})

watch(() => filters.category, () => {
  filters.page = 1
  fetchTemplates()
})

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped lang="postcss">
.marketplace-view {
  background-color: #0a0a0a;
  background-image:
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.08) 0, transparent 50%);
  font-family: 'Outfit', sans-serif;
}

:deep(.premium-segmented) {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.03);
  --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.1);
  --el-segmented-item-selected-color: #fff;
  --el-segmented-item-active-color: #fff;
  --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.premium-segmented .el-segmented__item) {
  @apply px-0;
}

:deep(.premium-segmented .el-segmented__item-selected) {
  @apply shadow-xl shadow-black/20;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.animate-pulse {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.1);
  }
}
</style>
