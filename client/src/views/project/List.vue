<template>
  <div class="projects-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('projects.title') }}</h1>
          <p class="subtitle">{{ t('projects.description') }}</p>
        </div>
        <GButton type="primary" size="lg" @click="router.push('/projects/new')">
          {{ t('projects.newProject') }}
        </GButton>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <GInput
          v-model="searchQuery"
          :placeholder="t('projects.search')"
          class="search-input"
        >
          <template #prefix>
            <search theme="outline" size="18" />
          </template>
        </GInput>

        <div class="filter-tabs">
          <GSegmented
            v-model="currentStatus"
            :options="statusFilters"
            class="status-segmented"
          />
        </div>
      </div>

      <!-- Projects Grid -->
      <div v-if="loading" class="projects-grid">
        <GCard v-for="i in 6" :key="i" class="project-card skeleton"></GCard>
      </div>

      <div v-else-if="filteredProjects.length > 0" class="projects-grid">
        <GCard
          v-for="project in filteredProjects"
          :key="project._id"
          class="project-card"
          @click="router.push(`/projects/${project._id}/editor`)"
          :bodyStyle="{ padding: '0px !important' }"
        >
          <div class="project-thumbnail">
            <div class="status-badge" :class="project.status?.toLowerCase()">
              {{ t(`projects.status.${project.status?.toLowerCase()}`) }}
            </div>
            <GMedia 
              class="project-image" 
              :src="project.storyboard?.segments?.[0]?.sceneImage" 
              alt="Project Thumbnail"
            >
              <template #error>
                <div class="image-placeholder">
                  <play-one theme="filled" size="32" fill="#fff" />
                </div>
              </template>
            </GMedia>
          </div>
          <div class="project-info">
            <h3>{{ project.title }}</h3>
            <p v-if="project.description" class="description">{{ project.description }}</p>
            <div class="project-meta">
              <span class="date">{{ formatDate(project.createdAt) }}</span>
            </div>
          </div>
          <div class="project-actions" @click.stop>
              <GDropdown placement="bottom-end" @command="(cmd: string) => handleAction(cmd, project)">
                <button class="action-btn">
                  <more theme="outline" size="20" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit" :icon="EditIcon">{{ t('projects.edit') }}</el-dropdown-item>
                    <el-dropdown-item command="duplicate" :icon="CopyIcon">{{ t('projects.duplicate') }}</el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="is-danger" :icon="DeleteIcon">{{ t('projects.delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </GDropdown>
          </div>
        </GCard>
      </div>

      <div v-else class="empty-state">
        <GCard class="empty-card">
          <div class="empty-icon">🎬</div>
          <h3>{{ t('projects.noProjects') }}</h3>
          <p>{{ t('projects.noProjectsDesc') }}</p>
          <GButton type="primary" size="lg" @click="router.push('/projects/new')">
            {{ t('projects.newProject') }}
          </GButton>
        </GCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Search, 
  More, 
  PlayOne,
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Copy as CopyIcon 
} from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import GDropdown from '@/components/ui/GDropdown.vue'
import GButton from '@/components/ui/GButton.vue'
import GCard from '@/components/ui/GCard.vue'
import GInput from '@/components/ui/GInput.vue'
import GSegmented from '@/components/ui/GSegmented.vue'
import GMedia from '@/components/ui/GMedia.vue'
import { useProjectStore } from '@/stores/project'
import { storeToRefs } from 'pinia'
import { getFileUrl } from '@/utils/api'

const { t } = useTranslations()
const router = useRouter()
const projectStore = useProjectStore()

const { projects, loadingList: loading } = storeToRefs(projectStore)
const searchQuery = ref('')
const currentStatus = ref('all')

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
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    )
      .then(async () => {
        await projectStore.deleteProject(project._id)
        toast.success(t('projects.deleteSuccess'))
      })
      .catch(() => {
        // Canceled
      })
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

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

onMounted(() => {
  projectStore.fetchProjects()
})

</script>

<style lang="scss" scoped>
.projects-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.filters-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  align-items: center;

  .search-input {
    max-width: 300px;
  }
}

.status-segmented {
  max-width: 400px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  position: relative;
  :deep(.g-card__body) {
    padding: 0;
  }

  &.skeleton {
    height: 280px;
    animation: pulse 1.5s infinite;
  }
}

.project-thumbnail {
  height: 180px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  position: relative;

  .project-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    }
  }
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.draft { color: #fbbf24; }
  &.completed { color: #34d399; }
  &.generating { color: #60a5fa; }
}

.project-info {
  padding: 24px;

  h3 {
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #fff;
  }

  .description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 16px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .project-meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
  }
}

.project-actions {
  position: absolute;
  top: 12px;
  left: 12px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(255, 255, 255, 0.1); }
  }
}

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon { font-size: 64px; margin-bottom: 24px; }
  h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
  p { color: rgba(255, 255, 255, 0.6); margin-bottom: 32px; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
