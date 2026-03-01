<template>
  <div class="project-editor-layout h-screen bg-[#0a0a0c] text-white overflow-hidden flex flex-col relative">
    <!-- Background Animated Glows -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse-slow"></div>
      <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <!-- Header Bar -->
    <ProjectEditorHeader class="relative z-10" :left-visible="isLeftVisible" :right-visible="isRightVisible"
      @toggle-left="isLeftVisible = !isLeftVisible" @toggle-right="isRightVisible = !isRightVisible"
      @export="handleExportAction" @view-mode="switchStudioMode" />

    <div class="editor-body">
      <!-- <StudioEditor v-if="editorMode === 'studio' && project" :project="project" /> -->
      <!-- Left Sidebar: Navigation -->
      <ProjectEditorSidebar :active-tab="activeTab" :is-visible="isLeftVisible" @change-tab="changeTab" />

      <!-- Middle: Main Content -->
      <main class="main-content-panel relative z-10">
        <div v-if="loading" class="p-10 h-full bg-[#0a0a0c]/40 backdrop-blur-xl">
          <el-skeleton :rows="10" animated class="custom-skeleton" />
        </div>

        <template v-if="project">
          <ProjectStoryboard v-if="activeTab === 'storyboard'" :project="project"
            :loading-states="assetGeneration.generatingStates.value"
            :generating-states="assetGeneration.generatingStates.value"
            @regenerate-character="assetGeneration.handleRegenerateCharacter"
            @upload-character-image="assetGeneration.handleUploadCharacterImage"
            @generate-frame="assetGeneration.handleGenerateFrame"
            @generate-video="assetGeneration.handleGenerateVideo"
            @upload-image-video="assetGeneration.handleUploadImageVideo"
            @regenerate-all-characters="() => assetGeneration.handleRegenerateAllCharacters(project)"
            @generate-all-frames="() => assetGeneration.handleGenerateAllFrames(project)"
            @generate-all-videos="() => assetGeneration.handleGenerateAllVideos(project)"
            @generate-all-sequential="() => assetGeneration.handleGenerateAllSequential(project)"
            @generate-music="assetGeneration.handleGenerateMusic"
            @generate-voiceover="assetGeneration.handleGenerateVoiceover"
            @generate-all-voiceovers="() => assetGeneration.handleGenerateAllVoiceovers(project)" />
          <ProjectTimeline :project="project" v-if="activeTab === 'timeline'" />
        </template>
        <div v-else-if="!loading" class="p-10 bg-[#0a0a0c]/40 backdrop-blur-xl">
          <el-skeleton :rows="10" animated class="custom-skeleton" />
        </div>
      </main>

      <!-- Right Sidebar: Chat & AI Assistant -->
      <ProjectEditorChatSidebar :is-visible="isRightVisible" :width="rightWidth"
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
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n';
import { useVideoAssembler } from '@/composables/useVideoAssembler'
import { useProjectAssetGeneration } from '@/composables/useProjectAssetGeneration'
import { useProjectChat } from '@/composables/useProjectChat'

// Components
import ProjectEditorHeader from '@/components/projects/editor/ProjectEditorHeader.vue'
import ProjectStoryboard from '@/components/projects/editor/ProjectStoryboard.vue'
import ProjectTimeline from '@/components/projects/editor/ProjectTimeline.vue'
// import StudioEditor from '@/components/projects/editor/StudioEditor.vue'
import ProjectEditorSidebar from '@/components/projects/editor/ProjectEditorSidebar.vue'
import ProjectEditorChatSidebar from '@/components/projects/editor/ProjectEditorChatSidebar.vue'
import ProjectEditorExportOverlay from '@/components/projects/editor/ProjectEditorExportOverlay.vue'
import { EditorTemplate } from 'video-editor/types/editor'
import { useMarketplaceStore } from '@/stores/marketplace'
// import router from '@/router'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
const projectStore = useProjectStore()
const userStore = useUserStore()
const { assemble, isAssembling, progress: exportProgress, status: exportStatus } = useVideoAssembler()

// const editorMode = computed({
//   get: () => projectStore.editorMode,
//   set: (val) => projectStore.editorMode = val as any
// })

// let template: EditorTemplate | null = null
// if (route.params?.templateId) {
//   template = await useMarketplaceStore().useTemplate(route.params.templateId as string);
//   if (route.params?.templateRatio) {
//     const ratio = route.params.templateRatio as string;
//     template.pages = template.pages.filter((page: any) => {
//       if (page.data.orientation == ratio) {
//         return true;
//       }
//       return false;
//     });
//   }
//   console.log("template", template)
// }

// if (route.query?.mode) {
//   editorMode.value = route.query.mode as any
// }

// Layout State
const isLeftVisible = ref(true)
const isRightVisible = ref(true)
const rightWidth = ref(300)

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

const switchStudioMode = () => {
  router.push({name: 'project-studio', params: {id: projectId}})
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
  background-color: #0a0a0c;
  color: #e5e5e5;
  font-family: 'Inter', sans-serif;
}

.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.main-content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: rgba(10, 10, 12, 0.4);
  backdrop-filter: blur(20px);
}

.custom-skeleton {
  :deep(.el-skeleton__item) {
    background: rgba(255, 255, 255, 0.05);
  }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.animate-pulse-slow {
  animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
