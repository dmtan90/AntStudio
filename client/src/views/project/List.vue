<template>
  <div class="projects-page min-h-screen bg-[#0a0a0c] text-white font-outfit">
    <div class="max-w-7xl mx-auto py-12 px-8">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 class="text-5xl font-black mb-4 tracking-tighter">
            My <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">Projects</span>
          </h1>
          <p class="text-xl text-gray-400 font-medium max-w-2xl">
            Manage your video creations. Edit, duplicate, or publish your AI-generated content.
          </p>
        </div>
        
        <button 
          id="tour-new-project"
          @click="showCreationDialog = true" 
          class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <plus theme="outline" size="20" />
          {{ t('projects.newProject') }}
        </button>
      </div>

      <!-- Tour -->
      <AppTour v-model="showTour" :steps="tourSteps" @finish="onTourFinish" />

      <!-- Filters & Search -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-white/5 p-2 rounded-3xl border border-white/5 backdrop-blur-sm">
        
        <!-- Search -->
        <div class="relative w-full md:max-w-md group">
          <search class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size="18" />
          <input 
            v-model="searchQuery" 
            :placeholder="t('projects.search')" 
            class="w-full pl-12 pr-6 py-3 bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 font-medium outline-none"
          />
        </div>

        <!-- Filter Tabs -->
        <div class="flex p-1 bg-black/20 rounded-2xl" id="tour-filters">
           <button 
              v-for="status in statusFilters" 
              :key="status.value"
              @click="currentStatus = status.value"
              class="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              :class="currentStatus === status.value ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'"
           >
              {{ status.label }}
           </button>
        </div>
      </div>

      <!-- Projects Grid -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div v-for="i in 8" :key="i" class="aspect-video bg-white/5 rounded-3xl animate-pulse"></div>
      </div>

      <div v-else-if="filteredProjects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div 
          v-for="project in filteredProjects" 
          :key="project._id" 
          class="project-card group relative bg-black rounded-3xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/20"
          @click="handleProjectClick(project)"
        >
          <!-- Thumbnail -->
          <div class="aspect-video relative overflow-hidden">
             <el-image :src="getFileUrl(project.publish?.thumbnailKey || project.storyboard?.segments?.[0]?.sceneImage || '/placeholder-project.png')"
              class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" fit="cover">
              <template #error>
                <div class="w-full h-full flex items-center justify-center">
                  <Pic theme="filled" size="48" fill="#9ca3af" />
                </div>
              </template>
             </el-image>
             
             <!-- Gradient Overlay -->
             <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

             <!-- Status Badge -->
             <div class="absolute top-4 left-4">
                <span 
                   class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md border shadow-lg"
                   :class="{
                      'bg-green-500/20 border-green-500/30 text-green-400': project.status === 'completed',
                      'bg-yellow-500/20 border-yellow-500/30 text-yellow-400': project.status === 'processing' || project.status === 'generating',
                      'bg-blue-500/20 border-blue-500/30 text-blue-400': project.status === 'draft'
                   }"
                >
                   {{ t(`projects.status.${project.status?.toLowerCase()}`) || project.status }}
                </span>
             </div>

             <!-- Play Icon (Hover) -->
             <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div class="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                   <play-one theme="filled" size="28" />
                </div>
             </div>
          </div>

          <!-- Info -->
          <div class="p-6 relative">
             <div class="flex justify-between items-start mb-2">
                <el-tooltip placement="top" :content="project.title">
                  <h4 class="font-bold text-white leading-tight line-clamp-1 pr-8">{{ project.title }}</h4>
                </el-tooltip>
                <!-- Actions Menu -->
                <div class="absolute top-6 right-4" @click.stop>
                   <el-dropdown trigger="click" @command="(cmd: string) => handleAction(cmd, project)">
                      <button class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                         <more theme="outline" size="20" />
                      </button>
                      <template #dropdown>
                         <el-dropdown-menu class="glass-dropdown">
                            <el-dropdown-item command="edit" :icon="EditIcon">{{ t('projects.edit') }}</el-dropdown-item>
                            <el-dropdown-item command="duplicate" :icon="CopyIcon">{{ t('projects.duplicate') }}</el-dropdown-item>
                            <el-dropdown-item command="delete" divided class="text-red-500" :icon="DeleteIcon">{{ t('projects.delete') }}</el-dropdown-item>
                         </el-dropdown-menu>
                      </template>
                   </el-dropdown>
                </div>
             </div>

             <p class="text-xs text-gray-500 font-medium line-clamp-2 h-8 mb-4">
                {{ project.description || 'No description' }}
             </p>

             <div class="flex items-center justify-between pt-4 border-t border-white/5">
                <div class="text-[10px] font-mono text-gray-600 uppercase">{{ formatDate(project.createdAt) }}</div>
                <div class="text-[10px] font-black uppercase tracking-widest text-blue-500/50 group-hover:text-blue-400 transition-colors">
                   {{ project.mode || 'Video' }}
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && filteredProjects.length > 0 && pagination.total > pagination.limit" class="flex justify-center mt-12 pb-12">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[12, 24, 48, 96]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
          class="cinematic-pagination"
        />
      </div>

       <!-- Empty State (Only when not loading and no projects found) -->
      <div v-if="!loading && filteredProjects.length === 0" class="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
        <div class="text-7xl mb-6 grayscale opacity-20">🎬</div>
        <h3 class="text-2xl font-black text-white mb-2">{{ t('projects.noProjects') || 'No projects found' }}</h3>
        <p class="text-gray-500 mb-8 max-w-md mx-auto">{{ t('projects.noProjectsDesc') || 'Start by creating your first cinematic masterpiece' }}</p>
        <button @click="showCreationDialog = true" class="px-8 py-4 bg-blue-600 rounded-2xl font-black text-sm uppercase tracking-wide hover:bg-blue-500 hover:scale-105 transition-all shadow-lg shadow-blue-600/20">
          {{ t('projects.newProject') }}
        </button>
      </div>
    </div>

    <ProjectCreationDialog v-model="showCreationDialog" />
    <VideoPreviewModal v-model="showPreviewModal" :project="selectedProject" />
  </div>
</template>

<script setup lang="ts">
import {
  Search,
  More,
  PlayOne,
  Plus,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Copy as CopyIcon,
  Pic
} from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import { ElMessageBox } from 'element-plus'
import { ref, computed, onMounted } from 'vue'
import AppTour from '@/components/ui/AppTour.vue'
import ProjectCreationDialog from '@/components/projects/ProjectCreationDialog.vue'
import { useProjectStore } from '@/stores/project'
import VideoPreviewModal from '@/components/projects/VideoPreviewModal.vue'
import { useUIStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { getFileUrl } from '@/utils/api'

const { t } = useTranslations()
const router = useRouter()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { projects, loadingList: loading, pagination } = storeToRefs(projectStore)
const searchQuery = ref('')
const currentStatus = ref('all')
const showCreationDialog = ref(false)
const showPreviewModal = ref(false)
const selectedProject = ref<any>(null)

const showTour = ref(false)
const tourSteps = [
  {
    target: '#tour-new-project',
    title: 'Create Your Masterpiece',
    description: 'Launch the AI assistance to start a new video project in seconds.',
    placement: 'bottom'
  },
  {
    target: '#tour-filters',
    title: 'Smart Filtering',
    description: 'Switch between Drafts and Completed projects to stay organized.',
    placement: 'bottom-end'
  }
]

const onTourFinish = () => {
  localStorage.setItem(`${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_projects_tour_completed`, 'true')
}

const handleProjectClick = (project: any) => {
  if (project.mode === 'livestream') {
    selectedProject.value = project
    showPreviewModal.value = true
  } else if(project.mode === 'topic' || project.mode === 'upload') {
    router.push({name: 'project-editor', params: {id: project._id}})
  }
  else{
    router.push({name: 'project-studio', params: {id: project._id}})
  }
}

const statusFilters = computed(() => [
  { value: 'all', label: t('projects.filterAll') },
  { value: 'draft', label: t('projects.filterDraft') },
  { value: 'completed', label: t('projects.filterCompleted') }
])

const filteredProjects = computed(() => {
  let filtered = projects.value || []

  if (currentStatus.value !== 'all') {
    filtered = filtered.filter(p => p.status === currentStatus.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  return filtered
})

const handleAction = async (command: string, project: any) => {
  if (command === 'edit') {
    router.push(`/projects/${project._id}/editor`)
  } else if (command === 'duplicate') {
    await duplicateProject(project)
  } else if (command === 'delete') {
    ElMessageBox.confirm(
      t('projects.confirmDelete'),
      t('common.warning'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        customClass: 'glass-message-box'
      }
    )
      .then(async () => {
        await projectStore.deleteProject(project._id)
        toast.success(t('projects.deleteSuccess'))
      })
      .catch(() => {})
  }
}

const duplicateProject = async (project: any) => {
  try {
    await projectStore.createProject({
      title: `${project.title} (${t('common.copy')})`,
      description: project.description,
      mode: project.mode
    })
    toast.success(t('projects.duplicateSuccess'))
  } catch (error: any) {
    toast.error(error.response?.data?.message || t('projects.duplicateFailed'))
  }
}

const handlePageChange = (page: number) => {
  projectStore.pagination.page = page
  projectStore.fetchProjects()
  // Scroll to top of the main container when changing page
  const mainContent = document.querySelector('.app-main')
  if (mainContent) mainContent.scrollTop = 0
}

const handleSizeChange = (size: number) => {
  projectStore.pagination.limit = size
  projectStore.pagination.page = 1
  projectStore.fetchProjects()
}

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, {
     year: 'numeric',
     month: 'short',
     day: 'numeric'
  })
}

onMounted(() => {
  projectStore.fetchProjects()
  if (!localStorage.getItem(`${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_projects_tour_completed`)) {
    setTimeout(() => { showTour.value = true }, 1000)
  }
})
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* Custom Dropdown Style override */
:global(.glass-dropdown) {
   background: rgba(20, 20, 25, 0.95) !important;
   backdrop-filter: blur(20px) !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 16px !important;
   overflow: hidden;
   padding: 8px !important;
}

:global(.glass-dropdown .el-dropdown-menu__item) {
   border-radius: 8px !important;
   margin-bottom: 2px !important;
   color: #ccc !important;
}

:global(.glass-dropdown .el-dropdown-menu__item:hover) {
   background: rgba(255, 255, 255, 0.1) !important;
   color: #fff !important;
}

:global(.glass-dropdown .el-dropdown-menu__item.text-red-500) {
   color: #ef4444 !important;
}

:global(.glass-dropdown .el-dropdown-menu__item.text-red-500:hover) {
   background: rgba(239, 68, 68, 0.2) !important;
}

:global(.glass-message-box) {
   background: #111 !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   backdrop-filter: blur(20px);
}

:global(.glass-message-box .el-message-box__title) {
   color: white;
}
:global(.glass-message-box .el-message-box__message) {
   color: #999;
}

/* Cinematic Pagination Styles */
:deep(.cinematic-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: rgba(255, 255, 255, 0.6);
  --el-pagination-button-color: rgba(255, 255, 255, 0.6);
  --el-pagination-button-disabled-bg-color: transparent;
  --el-pagination-button-bg-color: rgba(255, 255, 255, 0.05);
  --el-pagination-hover-color: #fff;

  .el-pager li {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin: 0 4px;
    font-weight: 700;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.is-active {
      background: #fff;
      color: #000;
      border-color: #fff;
    }
  }

  .btn-prev, .btn-next {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 0 12px;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }

  .el-pagination__total, .el-pagination__sizes {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .el-select .el-input__wrapper {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
  }
}
</style>
