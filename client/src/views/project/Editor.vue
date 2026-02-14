<template>
  <div class="project-editor-layout h-screen bg-black text-white overflow-hidden flex flex-col">
    <!-- Header Bar -->
    <ProjectEditorHeader v-if="editorMode !== 'studio'" :left-visible="isLeftVisible" :right-visible="isRightVisible"
      @toggle-left="isLeftVisible = !isLeftVisible" @toggle-right="isRightVisible = !isRightVisible"
      @export="handleExportAction" @view-mode="handleViewMode" />

    <div class="editor-body">
      <StudioEditor v-if="editorMode === 'studio' && project" :project="project" />
      <template v-else>
        <!-- Left Sidebar: Navigation -->
        <ProjectEditorSidebar :active-tab="activeTab" :is-visible="isLeftVisible" @change-tab="changeTab" />

        <!-- Middle: Main Content -->
        <main class="main-content-panel">
          <div v-if="loading" class="p-10 h-full">
            <el-skeleton :rows="10" animated />
          </div>

          <template v-if="project">
            <ProjectStoryboard v-if="activeTab === 'storyboard'" :project="project"
              :loading-states="assetGeneration.generatingStates.value"
              @regenerate-character="assetGeneration.handleRegenerateCharacter"
              @upload-character-image="assetGeneration.handleUploadCharacterImage"
              @generate-frame="assetGeneration.handleGenerateFrame"
              @generate-video="assetGeneration.handleGenerateVideo"
              @upload-image-video="assetGeneration.handleUploadImageVideo"
              @regenerate-all-characters="() => assetGeneration.handleRegenerateAllCharacters(project)"
              @generate-all-frames="() => assetGeneration.handleGenerateAllFrames(project)"
              @generate-all-videos="() => assetGeneration.handleGenerateAllVideos(project)" />
            <ProjectTimeline :project="project" v-if="activeTab === 'timeline'" />
          </template>
          <div v-else-if="!loading" class="p-10">
            <el-skeleton :rows="10" animated />
          </div>
        </main>
      </template>

      <!-- Right Sidebar: Chat & AI Assistant -->
      <ProjectEditorChatSidebar v-if="editorMode !== 'studio'" :is-visible="isRightVisible" :width="rightWidth"
        :messages="chat.localMessages.value" :processing="chat.processing.value"
        :status-message="chat.statusMessage.value" :quick-suggestions="chat.quickSuggestions.value"
        :project-id="projectId" :project="project" :input-message="chat.inputMessage.value"
        :format-content="chat.formatContent" @update:width="rightWidth = $event" @send-message="chat.handleSendMessage"
        @apply-suggestion="chat.handleApplySuggestion" @update:input-message="chat.inputMessage.value = $event"
        ref="chatSidebarRef" />
    </div>

    <!-- Export Progress Overlay -->
    <ProjectEditorExportOverlay :is-visible="isAssembling" :progress="exportProgress" :status="exportStatus" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { useTranslations } from '@/composables/useTranslations'
import { useVideoAssembler } from '@/composables/useVideoAssembler'
import { useProjectAssetGeneration } from '@/composables/useProjectAssetGeneration'
import { useProjectChat } from '@/composables/useProjectChat'

// Components
import ProjectEditorHeader from '@/components/projects/editor/ProjectEditorHeader.vue'
import ProjectStoryboard from '@/components/projects/editor/ProjectStoryboard.vue'
import ProjectTimeline from '@/components/projects/editor/ProjectTimeline.vue'
import StudioEditor from '@/components/projects/editor/StudioEditor.vue'
import ProjectEditorSidebar from '@/components/projects/editor/ProjectEditorSidebar.vue'
import ProjectEditorChatSidebar from '@/components/projects/editor/ProjectEditorChatSidebar.vue'
import ProjectEditorExportOverlay from '@/components/projects/editor/ProjectEditorExportOverlay.vue'
import { EditorTemplate } from '../video-editor/types/editor'

const { t } = useTranslations()

const route = useRoute()
const projectId = route.params.id as string
const projectStore = useProjectStore()
const userStore = useUserStore()
const { assemble, isAssembling, progress: exportProgress, status: exportStatus } = useVideoAssembler()

const editorMode = computed({
  get: () => projectStore.editorMode,
  set: (val) => projectStore.editorMode = val as any
})

let template: EditorTemplate | null = null
if (route.params?.template) {
  template = JSON.parse(route.params.template as string) as EditorTemplate
  console.log("template", template)
}

if (route.query?.mode) {
  editorMode.value = route.query.mode as any
}

// Layout State
const isLeftVisible = ref(true)
const isRightVisible = ref(true)
const rightWidth = ref(420)

// State from Store
const loading = computed(() => projectStore.isProcessing && !projectStore.currentProject)
const project = computed(() => projectStore.currentProject)
const activeTab = ref('storyboard')

const changeTab = (tab: string) => {
  activeTab.value = tab
}

// Chat sidebar ref
const chatSidebarRef = ref<any>(null)

// Composables
const assetGeneration = useProjectAssetGeneration(projectId)
const chat = useProjectChat(projectId, computed(() => chatSidebarRef.value?.chatContainer))

// Export logic
const handleExportAction = async (command: string) => {
  if (command === 'video') {
    try {
      toast.info(t('projects.editor.video.starting'))
      await assemble({
        format: 'mp4',
        codec: 'h264',
        resolution: '1080p',
        fps: 30,
        bitrate: 'medium',
        includeAudio: true
      })
    } catch (error: any) {
      toast.error(error.message || t('projects.editor.video.error'))
    }
  } else {
    toast.info(`${command} ${t('projects.editor.header.exportComingSoon')}`)
  }
}

const handleViewMode = (command: string) => {
  editorMode.value = command as any
  if (command == 'studio') {
    isRightVisible.value = false
  }
}

// Lifecycle and Watchers
onMounted(async () => {
  await projectStore.fetchProject(projectId)
  await userStore.fetchProfile()
  projectStore.syncAllAssets()
  chat.scrollToBottom()
})

watch(() => projectStore.currentProject?.chatHistory, (newHistory) => {
  if (newHistory) {
    chat.localMessages.value = [...newHistory]
    chat.scrollToBottom()
  }
}, { deep: true, immediate: true })
</script>

<style lang="scss" scoped>
.project-editor-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0a0a0a;
  color: #e5e5e5;
}

.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.main-content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background-color: #000;
}
</style>
