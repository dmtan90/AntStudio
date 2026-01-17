<template>
  <div class="projects-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('projects.title') }}</h1>
          <p class="subtitle">{{ t('projects.description') }}</p>
        </div>
        <GButton type="primary" size="lg" @click="navigateTo('/projects/new')">
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
          @click="navigateTo(`/projects/${project._id}/editor`)"
          bodyStyle="padding: 0px !important"
        >
          <div class="project-thumbnail">
            <div class="status-badge" :class="project.status?.toLowerCase()">
              {{ t(`projects.status.${project.status?.toLowerCase()}`) }}
            </div>
            <el-image class="project-image" :src="getFileUrl(project.storyboard?.segments?.[0]?.sceneImage)" alt="Project Thumbnail" fit="cover">
              <template #error>
                <div class="image-placeholder">
                  <play-one theme="filled" size="32" fill="#fff" />
                </div>
              </template>
            </el-image>
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
                    <el-dropdown-item command="edit" :icon="Edit">{{ t('projects.edit') }}</el-dropdown-item>
                    <el-dropdown-item command="duplicate" :icon="Copy">{{ t('projects.duplicate') }}</el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="is-danger" :icon="Delete">{{ t('projects.delete') }}</el-dropdown-item>
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
          <GButton type="primary" size="lg" @click="navigateTo('/projects/new')">
            {{ t('projects.newProject') }}
          </GButton>
        </GCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, More, PlayOne } from '@icon-park/vue-next'
import { useTranslations } from '~/composables/useTranslations'
import { toast } from 'vue-sonner'
import { ElMessageBox } from 'element-plus'
import { 
  Edit, Delete, Copy
} from '@icon-park/vue-next'
import GDropdown from '~/components/ui/GDropdown.vue'
import GButton from '~/components/ui/GButton.vue'
import GCard from '~/components/ui/GCard.vue'
import GInput from '~/components/ui/GInput.vue'
import GSegmented from '~/components/ui/GSegmented.vue'

const { t } = useTranslations()

definePageMeta({
  layout: 'app'
})

const loading = ref(true)
const projects = ref<any[]>([])
const searchQuery = ref('')
const currentStatus = ref('all')

const statusFilters = computed(() => [
  { value: 'all', label: t('projects.filterAll') },
  { value: 'draft', label: t('projects.filterDraft') },
  { value: 'completed', label: t('projects.filterCompleted') }
])

const filteredProjects = computed(() => {
  let filtered = projects.value

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

const fetchProjects = async () => {
  try {
    loading.value = true
    const { data } = await $fetch('/api/projects/list', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    projects.value = data.projects
  } catch (error: any) {
    toast.error(error.data?.message || t('projects.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleAction = async (command: string, project: any) => {
  if (command === 'edit') {
    navigateTo(`/projects/${project._id}/editor`)
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
        await deleteProject(project._id)
      })
      .catch(() => {
        // Canceled
      })
  }
}

const deleteProject = async (projectId: string) => {
  try {
    await $fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    toast.success(t('projects.deleteSuccess'))
    fetchProjects()
  } catch (error: any) {
    toast.error(error.data?.message || t('projects.deleteFailed'))
  }
}

const duplicateProject = async (project: any) => {
  try {
    const { data } = await $fetch('/api/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: {
        title: `${project.title} (${t('common.copy')})`,
        description: project.description,
        mode: project.mode
      }
    })
    toast.success(t('projects.duplicateSuccess'))
    fetchProjects()
  } catch (error: any) {
    toast.error(error.data?.message || t('projects.duplicateFailed'))
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

onMounted(() => {
  fetchProjects()
})

// Helper to get S3 file URL
const getFileUrl = (key: string) => {
  if (!key) return ''
  if (key.startsWith('http')) return key
  return `/api/s3/${key}`
}
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
  margin-bottom: $spacing-xl;
}

.filters-bar {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
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
  gap: $spacing-lg;
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
    border-radius: $radius-md;
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
  border-radius: $radius-sm;
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
  padding: $spacing-lg;

  h3 {
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 $spacing-sm 0;
    color: #fff;
  }

  .description {
    font-size: 13px;
    color: $text-secondary;
    margin: 0 0 $spacing-md 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .project-meta {
    font-size: 12px;
    color: $text-muted;
  }
}

.project-actions {
  position: absolute;
  top: 12px;
  left: 12px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: $radius-sm;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    @include flex-center;
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
  p { color: $text-secondary; margin-bottom: 32px; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
