<template>
  <div class="storyboard-page">
    <div class="container">
      <div v-if="loading" class="loading">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="project" class="storyboard-content">
        <div class="page-header">
          <div>
            <h1>{{ project.title }} - Storyboard</h1>
            <p>{{ storyboard?.segments.length || 0 }} segments • {{ storyboard?.totalDuration || 0 }}s total</p>
          </div>
          <div class="header-actions">
            <el-button @click="navigateTo(`/projects/${projectId}`)">← Back</el-button>
            <el-button
              v-if="!storyboard?.segments.length"
              type="primary"
              :loading="generating"
              @click="generateStoryboard"
            >
              Generate Storyboard
            </el-button>
          </div>
        </div>

        <!-- Storyboard Timeline -->
        <div v-if="storyboard?.segments.length" class="storyboard-timeline">
          <div
            v-for="(segment, index) in storyboard.segments"
            :key="segment._id"
            class="segment-card"
            @click="selectedSegment = segment"
          >
            <div class="segment-header">
              <div class="segment-number">{{ index + 1 }}</div>
              <el-tag :type="getCameraAngleType(segment.cameraAngle)">
                {{ segment.cameraAngle.toUpperCase() }}
              </el-tag>
            </div>
            <h3>{{ segment.title }}</h3>
            <p class="segment-desc">{{ segment.description }}</p>
            <div class="segment-meta">
              <span>📍 {{ segment.location }}</span>
              <span>⏱️ {{ segment.duration }}s</span>
            </div>
            <div v-if="segment.characters.length" class="segment-characters">
              <el-tag
                v-for="char in segment.characters"
                :key="char"
                size="small"
                type="info"
              >
                {{ char }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <el-empty
          v-else
          description="Storyboard not generated yet"
        >
          <el-button type="primary" :loading="generating" @click="generateStoryboard">
            Generate Storyboard
          </el-button>
        </el-empty>

        <!-- Segment Detail Drawer -->
        <el-drawer
          v-model="drawerVisible"
          title="Segment Details"
          direction="rtl"
          size="50%"
        >
          <div v-if="selectedSegment" class="segment-detail">
            <el-form :model="selectedSegment" label-position="top">
              <el-form-item label="Title">
                <el-input v-model="selectedSegment.title" />
              </el-form-item>

              <el-form-item label="Description">
                <el-input v-model="selectedSegment.description" type="textarea" :rows="3" />
              </el-form-item>

              <el-form-item label="Voiceover / Dialogue">
                <el-input v-model="selectedSegment.voiceover" type="textarea" :rows="4" />
              </el-form-item>

              <el-form-item label="Camera Angle">
                <el-select v-model="selectedSegment.cameraAngle">
                  <el-option label="Wide" value="wide" />
                  <el-option label="Medium" value="medium" />
                  <el-option label="Closeup" value="closeup" />
                  <el-option label="Overhead" value="overhead" />
                  <el-option label="POV" value="pov" />
                </el-select>
              </el-form-item>

              <el-form-item label="Mood">
                <el-input v-model="selectedSegment.mood" />
              </el-form-item>

              <el-form-item label="Style">
                <el-input v-model="selectedSegment.style" />
              </el-form-item>

              <el-form-item label="Location">
                <el-input v-model="selectedSegment.location" />
              </el-form-item>

              <el-form-item label="Characters">
                <el-select v-model="selectedSegment.characters" multiple placeholder="Select characters">
                  <el-option
                    v-for="char in availableCharacters"
                    :key="char"
                    :label="char"
                    :value="char"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="Duration">
                <el-input-number v-model="selectedSegment.duration" :min="1" :max="300" /> seconds
              </el-form-item>
            </el-form>

            <div class="drawer-actions">
              <el-button @click="drawerVisible = false">Cancel</el-button>
              <el-button type="primary" @click="updateSegment">Save Changes</el-button>
            </div>
          </div>
        </el-drawer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const projectId = route.params.id as string

const loading = ref(true)
const generating = ref(false)
const project = ref<any>(null)
const storyboard = ref<any>(null)
const selectedSegment = ref<any>(null)
const drawerVisible = computed(() => !!selectedSegment.value)

const availableCharacters = computed(() => {
  return project.value?.scriptAnalysis?.characters?.map((c: any) => c.name) || []
})

const fetchProject = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const { data } = await $fetch(`/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    project.value = (data as any).project
    storyboard.value = project.value.storyboard
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load project')
  } finally {
    loading.value = false
  }
}

const generateStoryboard = async () => {
  if (!project.value?.scriptAnalysis) {
    toast.warning('Please analyze the script first')
    return
  }

  generating.value = true
  try {
    const token = localStorage.getItem('auth-token')
    const { data } = await $fetch(`/api/projects/${projectId}/generate-storyboard`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    project.value = (data as any).project
    storyboard.value = project.value.storyboard
    toast.success('Storyboard generated successfully!')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to generate storyboard')
  } finally {
    generating.value = false
  }
}

const updateSegment = async () => {
  if (!selectedSegment.value) return

  try {
    const token = localStorage.getItem('auth-token')
    await $fetch(
      `/api/projects/${projectId}/${selectedSegment.value._id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: selectedSegment.value
      }
    )
    
    toast.success('Segment updated successfully!')
    await fetchProject()
    selectedSegment.value = null
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to update segment')
  }
}

const getCameraAngleType = (angle: string) => {
  const types: Record<string, string> = {
    wide: '',
    medium: 'success',
    closeup: 'warning',
    overhead: 'danger',
    pov: 'info'
  }
  return types[angle] || ''
}

watch(drawerVisible, (visible) => {
  if (!visible) {
    selectedSegment.value = null
  }
})

onMounted(() => {
  fetchProject()
})
</script>

<style lang="scss" scoped>
.storyboard-page {
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-xl;
  
  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 $spacing-sm 0;
    letter-spacing: -1px;
  }

  p {
    color: $text-secondary;
    margin: 0;
  }
}

.storyboard-timeline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $spacing-lg;
}

.segment-card {
  @include glass-card;
  background: rgba(255, 255, 255, 0.03);
  padding: $spacing-lg;
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    @include glass-card-hover;
    background: rgba(255, 255, 255, 0.05);
  }
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.segment-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, $brand-accent 0%, #764ba2 100%);
  color: white;
  @include flex-center;
  font-weight: bold;
}

.segment-card h3 {
  font-size: 16px;
  margin: 0 0 $spacing-sm 0;
  color: #fff;
}

.segment-desc {
  color: $text-secondary;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 $spacing-md 0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.segment-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: $text-muted;
  margin-bottom: $spacing-md;
}

.segment-characters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.segment-detail {
  padding: 0 0 60px 0;
}

.drawer-actions {
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  padding: $spacing-md $spacing-lg;
  background: rgba($bg-dark, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid $border-glass;
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
}
</style>
