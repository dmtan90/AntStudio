<template>
  <div class="project-detail-page">
    <div class="container">
      <div v-if="loading" class="loading">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="project" class="project-content">
        <div class="project-header">
          <div class="header-content">
            <h1 class="glow-title">
              <el-button @click="goBack" text circle>
                <left :size="32"/>
              </el-button>
              <el-divider direction="vertical"/>
              <span>{{ project.title }}</span>
            </h1>
            <p v-if="project.description" class="subtitle">{{ project.description }}</p>
            <div class="meta">
              <el-tag :type="statusType">{{ project.status.toUpperCase() }}</el-tag>
              <span class="date">{{ t('projects.detail.created') }}: {{ formatDate(project.createdAt) }}</span>
            </div>
          </div>
          <div class="header-actions">
            <!-- <el-button @click="goBack">{{ t('projects.detail.backDashboard') }}</el-button> -->
            <el-button class="ant-btn-primary" @click="continueProject">{{ t('projects.detail.continue') }}</el-button>
          </div>
        </div>

        <el-divider />

        <div class="project-workflow">
          <el-steps :active="workflowStep" align-center class="cinematic-steps">
            <el-step :title="t('projects.detail.scriptInput')">
              <template #icon><doc-detail theme="outline" size="20" /></template>
            </el-step>
            <el-step :title="t('projects.detail.analysis')">
              <template #icon><magic theme="outline" size="20" /></template>
            </el-step>
            <el-step :title="t('projects.detail.storyboard')">
              <template #icon><pic theme="outline" size="20" /></template>
            </el-step>
            <el-step title="Edit & Export">
              <template #icon><edit theme="outline" size="20" /></template>
            </el-step>
          </el-steps>
        </div>

        <div class="project-sections">
          <!-- Input Section -->
          <div class="section-card glass">
            <div class="card-header">
              <span>📝 {{ t('projects.detail.scriptInput') }}</span>
              <el-tag v-if="hasInput" type="success">✓ {{ t('projects.detail.ready') }}</el-tag>
            </div>
            <div class="card-body">
              <div v-if="project.mode === 'topic' && project.input?.topic">
                <p><strong>{{ t('projects.detail.topic') }}:</strong></p>
                <p class="script-content">{{ project.input.topic }}</p>
              </div>
              <div v-else-if="project.mode === 'upload' && project.input?.scriptFile">
                <p><strong>{{ t('projects.detail.uploadedFile') }}:</strong> {{ project.input.scriptFile.originalName }}</p>
                <p><strong>{{ t('projects.detail.fileType') }}:</strong> {{ project.input.scriptFile.fileType.toUpperCase() }}</p>
                <p><strong>{{ t('projects.detail.uploaded') }}:</strong> {{ formatDate(project.input.scriptFile.uploadedAt) }}</p>
              </div>
              <div v-else class="empty-section">
                <p>{{ t('projects.detail.noInput') }}</p>
              </div>
            </div>
          </div>

          <!-- Script Analysis Section -->
          <div class="section-card glass">
            <div class="card-header">
              <span>🔍 {{ t('projects.detail.analysis') }}</span>
              <el-tag v-if="project.scriptAnalysis" type="success">✓ {{ t('projects.detail.complete') }}</el-tag>
              <el-tag v-else type="info">{{ t('projects.detail.pending') }}</el-tag>
            </div>
            <div class="card-body">
              <div v-if="project.scriptAnalysis">
                <p><strong>{{ t('projects.detail.summary') }}:</strong> {{ project.scriptAnalysis.summary }}</p>
                <p><strong>{{ t('projects.detail.genre') }}:</strong> {{ project.scriptAnalysis.genre }}</p>
                <p><strong>{{ t('projects.detail.mood') }}:</strong> {{ project.scriptAnalysis.mood }}</p>
                <p><strong>{{ t('projects.detail.characters') }}:</strong> {{ project.scriptAnalysis.characters?.length || 0 }}</p>
                <p><strong>{{ t('projects.detail.locations') }}:</strong> {{ project.scriptAnalysis.locations?.length || 0 }}</p>
                <div class="card-actions">
                  <el-button
                    class="ant-btn-primary"
                    size="small"
                    :loading="loadingImages"
                    @click="generateImages"
                  >
                    {{ t('projects.detail.generateImages') }}
                  </el-button>
                </div>
              </div>
              <div v-else class="empty-section">
                <p>{{ t('projects.detail.analysisNotStarted') }}</p>
                <el-button
                  class="ant-btn-primary"
                  :disabled="!hasInput"
                  :loading="loadingAnalysis"
                  @click="analyzeScript"
                >
                  {{ t('projects.detail.startAnalysis') }}
                </el-button>
              </div>
            </div>
          </div>

          <!-- Storyboard Section -->
          <div class="section-card glass">
            <div class="card-header">
              <span>🎬 {{ t('projects.detail.storyboard') }}</span>
              <el-tag v-if="project.storyboard?.segments?.length" type="success">
                {{ project.storyboard.segments.length }} {{ t('projects.detail.segments') }}
              </el-tag>
              <el-tag v-else type="info">{{ t('projects.detail.notCreated') }}</el-tag>
            </div>
            <div class="card-body">
              <div v-if="project.storyboard?.segments?.length">
                <p><strong>{{ t('projects.detail.totalDuration') }}:</strong> {{ project.storyboard.totalDuration }}s</p>
                <p><strong>{{ t('projects.detail.segments') }}:</strong> {{ project.storyboard.segments.length }}</p>
                <div class="card-actions">
                  <el-button @click="navigateTo(`/projects/${projectId}/storyboard`)">
                    {{ t('projects.detail.viewStoryboard') }}
                  </el-button>
                  <el-button
                    class="ant-btn-primary"
                    :loading="loadingVideos"
                    @click="generateAllVideos"
                  >
                    {{ t('projects.detail.generateVideos') }}
                  </el-button>
                </div>
              </div>
              <div v-else class="empty-section">
                <p>{{ t('projects.detail.storyboardNotCreated') }}</p>
                <el-button
                  class="ant-btn-primary"
                  :disabled="!project.scriptAnalysis"
                  :loading="loadingStoryboard"
                  @click="generateStoryboard"
                >
                  {{ t('projects.detail.generateStoryboard') }}
                </el-button>
              </div>
            </div>
          </div>

          <!-- Final Video Section -->
          <div class="section-card glass">
            <div class="card-header">
              <span>🎥 {{ t('projects.detail.finalVideo') }}</span>
              <el-tag v-if="project.finalVideo?.s3Url" type="success">✓ {{ t('projects.detail.ready') }}</el-tag>
              <el-tag v-else-if="project.status === 'generating'" type="warning">{{ t('projects.detail.assembling') }}</el-tag>
              <el-tag v-else type="info">{{ t('projects.detail.notGenerated') }}</el-tag>
            </div>
            <div class="card-body">
              <div v-if="project.finalVideo?.s3Url">
                <p><strong>{{ t('projects.detail.duration') }}:</strong> {{ project.finalVideo.duration }}s</p>
                <p><strong>{{ t('projects.detail.resolution') }}:</strong> {{ project.finalVideo.resolution }}</p>
                <div class="card-actions">
                  <el-button class="ant-btn-primary" @click="navigateTo(`/projects/${projectId}/editor`)">
                    {{ t('projects.detail.openEditor') }}
                  </el-button>
                </div>
              </div>
              <div v-else class="empty-section">
                <p>{{ t('projects.detail.videoNotAssembled') }}</p>
                <el-button
                  class="ant-btn-primary"
                  :disabled="!project.storyboard?.segments?.length"
                  @click="navigateTo(`/projects/${projectId}/editor`)"
                >
                  {{ t('projects.detail.goEditor') }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="error">
        <el-result icon="error" :title="t('projects.detail.notFound')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, navigateTo } from '#app'
import { useTranslations } from '~/composables/useTranslations'
import { toast } from 'vue-sonner'
import {
  DocDetail,
  Magic,
  Pic,
  VideoTwo,
  Edit, 
  Left
} from '@icon-park/vue-next'

const { t } = useTranslations()

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const projectId = route.params.id as string

const loading = ref(true)
const loadingAnalysis = ref(false)
const loadingStoryboard = ref(false)
const loadingImages = ref(false)
const loadingVideos = ref(false)
const project = ref<any>(null)

const statusType = computed(() => {
  const statusMap: Record<string, any> = {
    draft: 'info',
    analyzing: 'warning',
    storyboard: 'primary',
    generating: 'warning',
    editing: 'primary',
    completed: 'success'
  }
  return statusMap[project.value?.status] || 'info'
})

const workflowStep = computed(() => {
  const statusStep: Record<string, number> = {
    draft: 0,
    analyzing: 1,
    storyboard: 2,
    generating: 3,
    editing: 4,
    completed: 4
  }
  return statusStep[project.value?.status] || 0
})

const hasInput = computed(() => {
  return project.value?.input?.topic || project.value?.input?.scriptFile
})

const fetchProject = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const { data } = await $fetch(`/api/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    project.value = (data as any).project
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load project')
  } finally {
    loading.value = false
  }
}

const analyzeScript = async () => {
  loadingAnalysis.value = true
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch(`/api/projects/${projectId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    toast.success('Script analyzed successfully!')
    await fetchProject()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to analyze script')
  } finally {
    loadingAnalysis.value = false
  }
}

const generateStoryboard = async () => {
  loadingStoryboard.value = true
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch(`/api/projects/${projectId}/generate-storyboard`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    toast.success('Storyboard generated successfully!')
    await fetchProject()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to generate storyboard')
  } finally {
    loadingStoryboard.value = false
  }
}

const generateImages = async () => {
  loadingImages.value = true
  try {
    const token = localStorage.getItem('auth-token')
    
    // Generate character images
    const charPromise = $fetch(`/api/projects/${projectId}/generate-character-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Generate location images
    const locPromise = $fetch(`/api/projects/${projectId}/generate-location-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    await Promise.all([charPromise, locPromise])
    toast.success('Images generated successfully!')
    await fetchProject()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to generate images')
  } finally {
    loadingImages.value = false
  }
}

const generateAllVideos = async () => {
  if (!project.value?.storyboard?.segments) return
  
  loadingVideos.value = true
  try {
    const token = localStorage.getItem('auth-token')
    const segments = project.value.storyboard.segments
    
    // Generate videos for all segments
    const promises = segments.map((seg: any) => 
      $fetch(`/api/projects/${projectId}/assets/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { segmentId: seg._id, type: 'video' }
      })
    )
    
    await Promise.all(promises)
    toast.success(`Generated ${segments.length} videos!`)
    await fetchProject()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to generate videos')
  } finally {
    loadingVideos.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const continueProject = () => {
  // Navigate based on project status
  if (!hasInput.value) {
    toast.warning('Please add script input first')
  } else if (!project.value.scriptAnalysis) {
    // Navigate to analysis page (to be created)
    toast.info('Script analysis will be implemented next')
  } else if (!project.value.storyboard) {
    toast.info('Storyboard generation will be implemented next')
  } else {
    handleNavigate(`/projects/${projectId}/storyboard`)
  }
}

const goBack = () => handleNavigate('/projects')
const handleNavigate = (path: string) => navigateTo(path)

onMounted(() => {
  fetchProject()
})
</script>

<style lang="scss" scoped>
.project-detail-page {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.project-content {
  @include glass-card;
  padding: 40px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-xl;
}

.header-content {
  flex: 1;
}

.meta {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  margin-top: $spacing-md;
}

.date {
  color: $text-muted;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: $spacing-md;
}

.project-workflow {
  margin: 40px 0;
}

/* Cinematic Steps - Complete Dark Theme */
.cinematic-steps {
  :deep(.el-step__head) {
    &.is-wait {
      color: $text-muted;
      border-color: $border-glass;
    }
    
    &.is-process {
      color: #fff;
      border-color: #fff;
    }
    
    &.is-success {
      color: #4ade80;
      border-color: #4ade80;
    }
  }
  
  :deep(.el-step__title) {
    color: $text-muted !important;
    font-size: 13px;
    font-weight: 600;
    
    &.is-wait {
      color: $text-muted !important;
    }
    
    &.is-process {
      color: #fff !important;
    }
    
    &.is-success {
      color: #4ade80 !important;
    }
  }
  
  :deep(.el-step__icon) {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid $border-glass;
    border-radius: 50%;
    
    .el-step__icon-inner {
      color: $text-muted;
    }
  }
  
  :deep(.el-step__head.is-process .el-step__icon) {
    background: #fff;
    border-color: #fff;
    
    .el-step__icon-inner {
      color: #000;
    }
  }
  
  :deep(.el-step__head.is-success .el-step__icon) {
    background: rgba(74, 222, 128, 0.1);
    border-color: #4ade80;
    
    .el-step__icon-inner {
      color: #4ade80;
    }
  }
  
  :deep(.el-step__line) {
    background-color: $border-glass !important;
    
    .el-step__line-inner {
      border-color: #4ade80 !important;
    }
  }
  
  :deep(.el-step.is-simple .el-step__arrow::before),
  :deep(.el-step.is-simple .el-step__arrow::after) {
    background-color: $border-glass;
  }
}

.project-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-lg;
  margin-top: $spacing-xl;
}

.section-card {
  @include glass-card;
  background: rgba(255, 255, 255, 0.02);
  border-radius: $radius-lg;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $border-glass;
  font-weight: 600;
  color: #fff;
}

.card-body {
  padding: $spacing-lg;
  
  p {
    margin: 0 0 $spacing-sm 0;
    color: $text-secondary;
    font-size: 14px;
    
    strong {
      color: $text-primary;
    }
  }
}

.script-content {
  background: rgba(255, 255, 255, 0.03);
  padding: $spacing-md;
  border-radius: $radius-sm;
  white-space: pre-wrap;
  line-height: 1.6;
  color: $text-secondary;
  border: 1px solid $border-glass;
  margin-top: $spacing-sm !important;
}

.empty-section {
  text-align: center;
  padding: $spacing-lg 0;
  
  p {
    color: $text-muted;
    margin-bottom: $spacing-md;
  }
}

.card-actions {
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $border-glass;
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

/* El Divider */
:deep(.el-divider) {
  border-color: $border-glass;
}

/* El Tag - Cinematic Dark Theme */
:deep(.el-tag) {
  border-radius: 20px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 12px;
  border: 1px solid;
  
  &.el-tag--success {
    background: rgba(74, 222, 128, 0.1);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
  }
  
  &.el-tag--info {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    color: $text-secondary;
  }
  
  &.el-tag--warning {
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
  }
  
  &.el-tag--primary {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
  }
  
  &.el-tag--danger {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
}

/* Status Tag in Header */
.meta :deep(.el-tag) {
  padding: 6px 16px;
  font-size: 12px;
}
</style>
