<template>
  <div class="publish-page">
    <div class="container" v-if="project">
      <div class="page-header">
        <GButton circle @click="navigateTo(`/projects/${projectId}/editor`)">
          <arrow-left theme="outline" size="20" />
        </GButton>
        <h1>Publish: {{ project.title }}</h1>
      </div>

      <div class="publish-layout">
        <!-- Preview -->
        <div class="preview-card">
          <GCard>
            <template #header>
              <div class="card-title"><play theme="outline" size="18" /> Video Preview</div>
            </template>
            <div v-if="project.finalVideo?.s3Url" class="video-container">
              <video controls :src="project.finalVideo.s3Url" width="100%"></video>
            </div>
            <div v-else class="no-video">
              <p>No final video found. Please assemble the video first.</p>
              <GButton type="primary" @click="navigateTo(`/projects/${projectId}/editor`)">Go to Editor</GButton>
            </div>
          </GCard>

          <div class="published-links" v-if="hasPublished">
            <h3>🚀 Published Links</h3>
            <div v-if="project.publishing.youtube?.url" class="link-item">
              <youtube-icon theme="filled" size="20" />
              <a :href="project.publishing.youtube.url" target="_blank">View on YouTube</a>
            </div>
            <div v-if="project.publishing.facebook?.url" class="link-item">
              <facebook-icon theme="filled" size="20" />
              <a :href="project.publishing.facebook.url" target="_blank">View on Facebook</a>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="settings-card">
          <el-form :model="form" label-position="top">
            <el-form-item label="Platforms">
              <el-checkbox-group v-model="form.platforms">
                <GCheckbox label="youtube" :disabled="!isYouTubeConnected">
                  <youtube-icon theme="filled" size="16" /> YouTube
                  <span v-if="!isYouTubeConnected" class="not-connected">(Not connected)</span>
                </GCheckbox>
                <GCheckbox label="facebook" :disabled="!isFacebookConnected">
                  <facebook-icon theme="filled" size="16" /> Facebook
                  <span v-if="!isFacebookConnected" class="not-connected">(Not connected)</span>
                </GCheckbox>
              </el-checkbox-group>
              <div class="connect-links" v-if="!isYouTubeConnected || !isFacebookConnected">
                <router-link to="/settings/integrations">Manage Integrations</router-link>
              </div>
            </el-form-item>

            <el-form-item label="Video Title">
              <GInput v-model="form.title" placeholder="Enter video title" />
            </el-form-item>

            <el-form-item label="Description">
              <GInput 
                v-model="form.description" 
                type="textarea" 
                :rows="4" 
                placeholder="Write a catchy description..."
              />
            </el-form-item>

            <el-form-item label="Keywords / Tags">
              <GSelect
                v-model="form.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="Add tags"
              >
                <el-option
                  v-for="item in existingTags"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </GSelect>
            </el-form-item>

            <div class="advanced-settings" v-if="form.platforms.includes('youtube')">
              <h4>YouTube Settings</h4>
              <el-form-item label="Privacy">
                <GSelect v-model="form.privacy">
                  <el-option label="Public" value="public" />
                  <el-option label="Unlisted" value="unlisted" />
                  <el-option label="Private" value="private" />
                </GSelect>
              </el-form-item>
            </div>

            <div class="form-actions">
              <GButton 
                type="primary" 
                size="lg" 
                :loading="publishing" 
                :disabled="form.platforms.length === 0"
                @click="handlePublish"
              >
                <send theme="outline" size="18" /> Publish Now
              </GButton>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, navigateTo, useHead } from '#app'

import { 
  ArrowLeft, 
  Youtube as YoutubeIcon, 
  Facebook as FacebookIcon,
  Play,
  Send
} from '@icon-park/vue-next'
definePageMeta({
  layout: 'app'
})

const route = useRoute()
const projectId = route.params.id as string

const loading = ref(true)
const publishing = ref(false)
const project = ref<any>(null)
const user = ref<any>(null)

const form = ref({
  platforms: [] as string[],
  title: '',
  description: '',
  tags: [] as string[],
  privacy: 'public',
  categoryId: '22'
})

const existingTags = ref(['AI', 'Technology', 'Storytelling', 'Video Generation'])

const isYouTubeConnected = computed(() => !!user.value?.socialAccounts?.youtube?.channelId)
const isFacebookConnected = computed(() => !!user.value?.socialAccounts?.facebook?.pageId)
const hasPublished = computed(() => project.value?.publishing?.youtube?.url || project.value?.publishing?.facebook?.url)

const fetchProject = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const res: any = await $fetch(`/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    project.value = res.data.project
    
    // Set initial form values
    form.value.title = project.value.title
    form.value.description = project.value.description || ''
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load project')
  }
}

const fetchUser = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const { data } = await $fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = (data as any).user
  } catch (error) {
    console.error('Failed to load user info')
  }
}

const handlePublish = async () => {
  publishing.value = true
  try {
    const token = localStorage.getItem('auth-token')
    const res: any = await $fetch(`/api/projects/${projectId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form.value
    })
    
    toast.success('Video published successfully!')
    fetchProject() // Refresh to get publish links
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to publish video')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchProject(), fetchUser()])
  loading.value = false
})

useHead({
  title: project.value ? `${project.value.title} | Publish - AntFlow` : 'Publish Video - AntFlow',
  meta: [
    { name: 'description', content: 'Publish your AI-generated video to YouTube and Facebook.' }
  ]
})
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: $spacing-xl;
  
  h1 {
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 $spacing-sm 0;
    letter-spacing: -1px;
  }
}

.publish-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: $spacing-lg;
}

.preview-card .video-container {
  background: #000;
  border-radius: $radius-md;
  overflow: hidden;
  aspect-ratio: 16/9;
  @include flex-center;
}

.no-video {
  padding: 40px;
  text-align: center;
  color: $text-muted;
}

.card-title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
}

.published-links {
  margin-top: $spacing-lg;
  
  h3 {
    font-size: 18px;
    margin-bottom: $spacing-md;
  }
}

.link-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  @include glass-card;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: $spacing-md;
}

.link-item a {
  color: $brand-accent;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.settings-card {
  @include glass-card;
  padding: 32px;
}

.not-connected {
  font-size: 12px;
  color: $text-muted;
  margin-left: $spacing-sm;
}

.connect-links {
  margin-top: $spacing-sm;

  a {
    font-size: 13px;
    color: $brand-accent;
    text-decoration: none;
  }
}

.advanced-settings {
  margin-top: $spacing-xl;
  padding-top: $spacing-lg;
  border-top: 1px solid $border-glass;

  h4 {
    margin: 0 0 $spacing-md 0;
    font-size: 16px;
    color: $text-secondary;
  }
}

.form-actions {
  margin-top: $spacing-xl;
}

.el-button--large {
  width: 100%;
}
</style>
