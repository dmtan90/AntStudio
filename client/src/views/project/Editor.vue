<template>
  <div class="project-editor-layout h-screen bg-black text-white overflow-hidden flex flex-col">
    <!-- Header Bar -->
    <ProjectEditorHeader v-if="editorMode !== 'studio'" :left-visible="isLeftVisible" :right-visible="isRightVisible"
      @toggle-left="isLeftVisible = !isLeftVisible" @toggle-right="isRightVisible = !isRightVisible"
      @export="handleExportAction" @view-mode="handleViewMode" />

    <div class="editor-body">
      <StudioEditor v-if="editorMode === 'studio'" :project="project" />
      <template v-else>
        <!-- Left Sidebar: Navigation -->
        <aside v-show="isLeftVisible" class="left-sidebar-nav" :style="{ width: isLeftVisible ? '180px' : '0' }">
          <div class="p-5 flex flex-col gap-2" style="width: 180px">
            <div
              class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent"
              :class="activeTab === 'storyboard' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
              @click="changeTab('storyboard')">
              <movie-board theme="outline" size="20" />
              <span class="text-sm font-medium">{{ t('projects.editor.storyboard.title') }}</span>
            </div>
            <div
              class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent"
              :class="activeTab === 'timeline' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
              @click="changeTab('timeline')">
              <film theme="outline" size="20" />
              <span class="text-sm font-medium">{{ t('projects.editor.timeline.title') }}</span>
            </div>
          </div>
        </aside>

        <!-- Middle: Main Content -->
        <main class="main-content-panel">
          <div v-if="loading" class="p-10 h-full">
            <el-skeleton :rows="10" animated />
          </div>

          <template v-if="project">
            <ProjectStoryboard v-if="activeTab === 'storyboard'" :project="project" :loading-states="generatingStates"
              @regenerate-character="handleRegenerateCharacter" @upload-character-image="handleUploadCharacterImage"
              @generate-frame="handleGenerateFrame" @generate-video="handleGenerateVideo"
              @upload-image-video="handleUploadImageVideo" @regenerate-all-characters="handleRegenerateAllCharacters"
              @generate-all-frames="handleGenerateAllFrames" @generate-all-videos="handleGenerateAllVideos" />
            <ProjectTimeline :project="project" v-if="activeTab === 'timeline'" />
          </template>
          <div v-else-if="!loading" class="p-10">
            <el-skeleton :rows="10" animated />
          </div>
        </main>
      </template>

      <!-- Resize Handle -->
      <div v-show="isRightVisible" class="resize-handle" @mousedown="startResizing" />

      <!-- Right Sidebar: Chat & AI Assistant -->
      <aside v-show="isRightVisible" class="right-sidebar-panel"
        :style="{ width: isRightVisible ? `${rightWidth}px` : '0' }">
        <div class="px-5 py-4 border-b border-white/5 text-[13px] font-semibold text-[#aaa] flex items-center gap-2">
          <robot theme="outline" size="18" />
          <span>{{ t('projects.editor.assistant') }}</span>
        </div>

        <div class="chat-messages-container custom-scrollbar" ref="chatContainer">
          <div v-for="(msg, index) in localMessages" :key="index"
            :class="['flex flex-col gap-4 w-full', msg.author === 'user' ? 'items-end' : '']">
            <!-- User Message -->
            <ProjectUserMessage v-if="msg.author === 'user'" :content="msg.content" :files="msg.files">
            </ProjectUserMessage>

            <!-- AI Message -->
            <div v-else class="flex flex-col gap-4">
              <!-- Text Content -->
              <div v-if="msg.content"
                class="text-white/90 text-sm leading-relaxed max-w-[85%] bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[24px_24px_24px_8px] shadow-lg"
                v-html="formatContent(msg.content)"></div>

              <!-- Cards -->
              <ProjectAnalysisCard v-if="msg.result?.analysis"
                :msg="{ result: { analysis: msg.result.analysis, language: project?.scriptAnalysis?.language || 'English' }, expandAnalysis: false }" />

              <ProjectBriefCard v-if="msg.result?.creativeBrief"
                :msg="{ result: { creativeBrief: msg.result.creativeBrief, analysis: { overview: { duration: '60s' } }, language: project?.scriptAnalysis?.language || 'English' }, expandBrief: false }"
                :aspect-ratio="project.aspectRatio" />

              <ProjectStoryboardCard v-if="msg.result?.storyboard"
                :msg="{ result: { storyboard: msg.result.storyboard, language: project?.scriptAnalysis?.language || 'English' }, expandStoryboard: false }" />

              <!-- Visual Path & Assets -->
              <VisualGenPathCard v-if="msg.type === 'visual-path' && msg.result?.path" :content="msg.result.path" />

              <VisualAssetsCard v-if="msg.type === 'visual-assets' && msg.result?.assets" :images="msg.result.assets"
                :project-id="projectId" />
            </div>
          </div>
          <!-- Thinking -->
          <div class="flex flex-col gap-4 w-full" v-if="processing">
            <ProjectThinking :message="statusMessage"></ProjectThinking>
          </div>
        </div>

        <div class="p-2.5 border-t border-white/5 bg-black/20 relative">
          <ProjectChatInputEditor v-model="inputMessage" :loading="processing" :selected-files="[]"
            :quick-suggestions="quickSuggestions" @handle-enter="handleSendMessage" @start-analysis="handleSendMessage"
            @apply-suggestion="handleApplySuggestion" />
        </div>
      </aside>
    </div>

    <!-- Export Progress Overlay -->
    <div v-if="isAssembling"
      class="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
      <div class="w-full max-w-md space-y-8 flex flex-col items-center">
        <div class="relative w-32 h-32 flex items-center justify-center">
          <svg class="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
              class="text-white/10" />
            <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
              class="text-blue-500 transition-all duration-300"
              :style="{ strokeDasharray: 376.8, strokeDashoffset: 376.8 * (1 - exportProgress / 100) }" />
          </svg>
          <span class="text-4xl font-black text-white">{{ Math.round(exportProgress) }}%</span>
        </div>

        <div class="text-center space-y-2">
          <h2 class="text-2xl font-black text-white uppercase tracking-widest">{{ t('projects.editor.video.exporting')
          }}
          </h2>
          <p class="text-white/60 font-medium tracking-tight animate-pulse">{{ exportStatus }}</p>
        </div>

        <div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
          <div class="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
            :style="{ width: `${exportProgress}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  MovieBoard, Film, Robot, Peoples, Magic
} from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { useTranslations } from '@/composables/useTranslations'
import { useVideoAssembler } from '@/composables/useVideoAssembler'

// Components
import ProjectEditorHeader from '@/components/projects/editor/ProjectEditorHeader.vue'
import ProjectStoryboard from '@/components/projects/editor/ProjectStoryboard.vue'
import ProjectTimeline from '@/components/projects/editor/ProjectTimeline.vue'
import StudioEditor from '@/components/projects/editor/StudioEditor.vue'
import ProjectUserMessage from '@/components/projects/new/ProjectUserMessage.vue'
import ProjectChatInputEditor from '@/components/projects/editor/ProjectChatInputEditor.vue'
import ProjectThinking from '@/components/projects/new/ProjectThinking.vue'
import ProjectBriefCard from '@/components/projects/new/ProjectBriefCard.vue'
import ProjectStoryboardCard from '@/components/projects/new/ProjectStoryboardCard.vue'
import VisualGenPathCard from '@/components/projects/new/VisualGenPathCard.vue'
import VisualAssetsCard from '@/components/projects/new/VisualAssetsCard.vue'
import ProjectAnalysisCard from '@/components/projects/new/ProjectAnalysisCard.vue'
import { EditorTemplate } from '../video-editor/types/editor'

const { t, currentLocale } = useTranslations()

const route = useRoute()
const projectId = route.params.id as string
const projectStore = useProjectStore()
const userStore = useUserStore()
const { assemble, isAssembling, progress: exportProgress, status: exportStatus } = useVideoAssembler()

let template: EditorTemplate | null = null;
if (route.params?.template) {
  template = JSON.parse(route.params.template as string) as EditorTemplate;
  console.log("template", template);
}

// Layout State
const isLeftVisible = ref(true)
const isRightVisible = ref(true)
const rightWidth = ref(420)
const isResizing = ref(false)

// State from Store
const loading = computed(() => projectStore.isProcessing && !projectStore.currentProject)
const processing = ref(false)
const statusMessage = ref(t('projects.new.flow.analyzing'))
const quickSuggestions = ref<string[]>([])
const currentStage = ref('planning_confirmed')
const project = computed(() => projectStore.currentProject)
const activeTab = ref('storyboard')

const messages = computed(() => projectStore.currentProject?.chatHistory || [])
const inputMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const localMessages = ref<any[]>([])

const changeTab = (tab: string) => {
  activeTab.value = tab
}

const editorMode = computed({
  get: () => projectStore.editorMode,
  set: (val) => projectStore.editorMode = val as any
})

// Resizing Logic
const startResizing = () => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResizing)
  document.addEventListener('mouseup', stopResizing)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResizing = (e: MouseEvent) => {
  if (!isResizing.value) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= 300 && newWidth <= 800) {
    rightWidth.value = newWidth
  }
}

const stopResizing = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResizing)
  document.removeEventListener('mouseup', stopResizing)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Export logic
const handleExportAction = async (command: string) => {
  if (command === 'video') {
    try {
      toast.info(t('projects.editor.video.starting'))
      // Default export options
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
// Helpers
const formatContent = (text: string) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br/>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Lifecycle and Watchers
onMounted(async () => {
  await projectStore.fetchProject(projectId)
  await userStore.fetchProfile()
  projectStore.syncAllAssets()
  scrollToBottom()
})

watch(() => projectStore.currentProject?.chatHistory, (newHistory) => {
  if (newHistory) {
    localMessages.value = [...newHistory]
    scrollToBottom()
  }
}, { deep: true, immediate: true })

const handleSendMessage = async (payload?: any) => {
  let msgContent = inputMessage.value
  if (typeof payload === 'string') {
    msgContent = payload
  }

  if (!msgContent.trim()) return

  const lastMsg = messages.value[messages.value.length - 1];

  // Add user message locally
  if (projectStore.currentProject) {
    if (!projectStore.currentProject.chatHistory) projectStore.currentProject.chatHistory = []
    projectStore.currentProject.chatHistory.push({
      author: 'user',
      content: msgContent,
      timestamp: new Date()
    })
  }

  inputMessage.value = ''
  processing.value = true
  quickSuggestions.value = []
  scrollToBottom()

  try {
    const lowerMsg = msgContent.toLowerCase()

    // Command detection (Language agnostic keywords)
    const keywords = ['start', 'ok', 'yes', 'bắt đầu', 'được', 'triển', 'tiếp']
    const isStartCommand = keywords.some(k => lowerMsg.includes(k)) && lastMsg?.type == "visual-guide"

    if (isStartCommand || lowerMsg.includes('visual plan') || lowerMsg.includes('generate plan')) {
      if (currentStage.value === 'planning_confirmed' || isStartCommand) {
        await generateVisualStrategy()
        return
      }
    }

    await projectStore.chat(projectId, msgContent)

  } catch (error) {
    console.error('Chat API Error', error)
    if (projectStore.currentProject) {
      projectStore.currentProject.chatHistory.push({
        author: 'ai',
        content: t('projects.editor.chat.error'),
        type: 'text',
        timestamp: new Date()
      })
    }
  } finally {
    processing.value = false
    scrollToBottom()
  }
}

const generateVisualStrategy = async () => {
  try {
    const result = await projectStore.generateVisualPlan(projectId)

    if (result.assets) {
      if (!projectStore.currentProject.visualAssets) projectStore.currentProject.visualAssets = []

      result.assets.forEach((a: any) => {
        if (!projectStore.currentProject.visualAssets.some((exist: any) => exist.name === a.name)) {
          projectStore.currentProject.visualAssets.push(a)
        }
        projectStore.syncAssetToElements(a.name, a.s3Key)
      })

      await projectStore.updateProject({
        visualAssets: projectStore.currentProject.visualAssets,
        scriptAnalysis: projectStore.currentProject.scriptAnalysis,
        storyboard: projectStore.currentProject.storyboard
      })
    }

    if (projectStore.currentProject) {
      projectStore.currentProject.chatHistory.push({
        author: 'ai',
        type: 'visual-path',
        result: {
          path: {
            steps: result.plan_steps
          }
        },
        timestamp: new Date()
      })
    }
    scrollToBottom()

    setTimeout(() => {
      if (projectStore.currentProject) {
        projectStore.currentProject.chatHistory.push({
          author: 'ai',
          type: 'visual-assets',
          result: {
            assets: result.assets
          },
          timestamp: new Date()
        })
      }

      // Localized Suggestions
      quickSuggestions.value = [
        t('projects.editor.storyboard.suggestions.generateFrames'),
        t('projects.editor.storyboard.suggestions.generateMotion'),
        t('projects.editor.storyboard.suggestions.generateAudio')
      ]

      scrollToBottom()
    }, 2000)

  } catch (error) {
    console.error('Failed to generate visual plan', error)
    toast.error(t('projects.editor.chat.visualStrategyFailed'))
  } finally {
    processing.value = false
  }
}

const handleApplySuggestion = (sug: string) => {
  handleSendMessage(sug)
}

// Loading States for storyboard items
const generatingStates = ref<Record<string, boolean>>({})

const pollAssetStatus = async (jobId: string, loadingKey: string) => {
  if (!jobId) return;

  const check = async () => {
    try {
      const res = await projectStore.getAssetStatus(projectId, jobId);
      if (res.data?.status === 'completed') {
        await projectStore.fetchProject(projectId);
        generatingStates.value[loadingKey] = false;
        toast.success(t('projects.editor.storyboard.assetReady'))
        return true;
      } else if (res.data?.status === 'failed') {
        generatingStates.value[loadingKey] = false;
        toast.error(res.data?.error || t('common.failed'))
        return true;
      }
      return false;
    } catch (e) {
      console.error('[Polling] Error:', e);
      return false;
    }
  };

  const isDone = await check();
  if (isDone) return;

  const interval = setInterval(async () => {
    const done = await check();
    if (done) clearInterval(interval);
  }, 5000);
};

const handleRegenerateCharacter = async (char: any, index: number) => {
  const id = `char-${index}`
  generatingStates.value[id] = true
  try {
    const responseData = await projectStore.generateAsset(projectId, {
      assetName: `Element_${char.name}.img`,
      description: char.description,
      type: 'image',
      characterNames: [char.name],
      generationType: 'character'
    })

    const data = responseData.data || responseData;
    const jobId = data.jobId || data.video?.veoJobId;

    if (data.s3Key) {
      char.referenceImage = data.s3Key
      projectStore.syncAssetToElements(`Element_${char.name}.img`, data.s3Key)
      await projectStore.fetchProject(projectId)
      generatingStates.value[id] = false
      return true
    } else if (jobId) {
      toast.info(t('projects.editor.storyboard.backgroundJobStarted'));
      pollAssetStatus(jobId, id);
      return true;
    }
  } catch (error) {
    console.error(`Failed to regenerate character ${char.name}:`, error)
    generatingStates.value[id] = false
    return false
  }
}

const handleRegenerateAllCharacters = async () => {
  const chars = project.value?.scriptAnalysis?.characters || []
  if (chars.length === 0) return

  toast.info(`${t('projects.editor.storyboard.batchStart')} ${chars.length} ${t('projects.detail.characters')}...`)
  let successCount = 0
  for (let i = 0; i < chars.length; i++) {
    const success = await handleRegenerateCharacter(chars[i], i)
    if (success) successCount++
  }
  toast.success(`${t('projects.editor.storyboard.batchComplete')} ${successCount}/${chars.length} ${t('projects.editor.storyboard.charsUpdated')}`)
}

const handleGenerateFrame = async (seg: any) => {
  const id = `seg-${seg.order}`
  generatingStates.value[id] = true
  try {
    const responseData = await projectStore.generateAsset(projectId, {
      assetName: `Scene_${seg.order}.img`,
      description: seg.description,
      type: 'image',
      segmentId: seg._id,
      characterNames: seg.characters,
      generationType: 'scene'
    })

    const data = responseData.data || responseData;
    const jobId = data.jobId || data.video?.veoJobId;

    if (data.s3Key) {
      seg.sceneImage = data.s3Key
      projectStore.syncAssetToElements(`Scene_${seg.order}.img`, data.s3Key)
      await projectStore.fetchProject(projectId)
      generatingStates.value[id] = false
      return true
    } else if (jobId) {
      toast.info(t('projects.editor.storyboard.backgroundJobStarted'));
      pollAssetStatus(jobId, id);
      return true;
    }
  } catch (error) {
    console.error(`Failed to generate frame for ${seg.title}:`, error)
    generatingStates.value[id] = false
    return false
  }
}

const handleGenerateAllFrames = async () => {
  const segments = project.value?.storyboard?.segments || []
  if (segments.length === 0) return

  toast.info(`${t('projects.editor.storyboard.batchStart')} ${segments.length} ${t('projects.editor.storyboard.title')}...`)
  let successCount = 0
  for (const seg of segments) {
    const success = await handleGenerateFrame(seg)
    if (success) successCount++
  }
  toast.success(`${t('projects.editor.storyboard.batchComplete')} ${successCount}/${segments.length} ${t('projects.editor.storyboard.framesUpdated')}`)
}

const handleGenerateVideo = async (seg: any) => {
  const id = `video-${seg.order}`
  generatingStates.value[id] = true
  try {
    const responseData = await projectStore.generateAsset(projectId, {
      segmentId: seg._id,
      type: 'video'
    })

    const data = responseData.data || responseData;
    const jobId = data.jobId || data.video?.veoJobId;

    if (data.s3Key) {
      if (!seg.generatedVideo) seg.generatedVideo = {}
      seg.generatedVideo.s3Key = data.s3Key
      projectStore.syncAssetToElements(`segment_${seg.order}.mp4`, data.s3Key)
      await projectStore.fetchProject(projectId)
      generatingStates.value[id] = false
      return true
    } else if (jobId) {
      toast.info(t('projects.editor.storyboard.backgroundJobStarted'));
      pollAssetStatus(jobId, id);
      return true;
    }
  } catch (error: any) {
    console.error(`Failed to generate video for ${seg.title}:`, error)
    toast.error(error.response?.data?.message || t('common.failed'))
    generatingStates.value[id] = false
    return false
  }
}

const handleGenerateAllVideos = async () => {
  if (!project.value || projectStore.isProcessing) return

  try {
    toast.info(t('projects.editor.storyboard.videoBatchStart'))
    await projectStore.generateStoryboardAssetsBatch(projectId)
    await projectStore.fetchProject(projectId)
  } catch (error: any) {
    console.error('Batch generation failed:', error)
    toast.error(error.response?.data?.message || t('common.failed'))
  }
}

// Upload handlers
const handleUploadCharacterImage = async (char: any, index: number) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const id = `char-${index}`
    generatingStates.value[id] = true

    try {
      const responseData = await projectStore.uploadAsset(projectId, file, 'character', index.toString())
      toast.success(t('projects.editor.uploadSuccess'))
      if (responseData.s3Key) {
        projectStore.syncAssetToElements(`Element_${char.name}.img`, responseData.s3Key)
        char.referenceImage = responseData.s3Key
      }
    } catch (error) {
      console.error(`Failed to upload character image:`, error)
    } finally {
      generatingStates.value[id] = false
    }
  }

  input.click()
}

const handleUploadImageVideo = async (seg: any) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,video/*'

  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const id = `seg-${seg.order}`
    generatingStates.value[id] = true

    try {
      const responseData = await projectStore.uploadAsset(projectId, file, 'segment', seg.order.toString())
      toast.success(t('projects.editor.uploadSuccess'))
      if (responseData.s3Key) {
        if (file.type.startsWith('image/')) {
          seg.sceneImage = responseData.s3Key
          projectStore.syncAssetToElements(`Scene_${seg.order}.img`, responseData.s3Key)
        } else if (file.type.startsWith('video/')) {
          if (!seg.generatedVideo) seg.generatedVideo = {}
          seg.generatedVideo.s3Key = responseData.s3Key
          projectStore.syncAssetToElements(`video_${seg.order}.mp4`, responseData.s3Key)
        }
      }
    } catch (error) {
      console.error(`Failed to upload segment asset:`, error)
    } finally {
      generatingStates.value[id] = false
    }
  }

  input.click()
}
</script>

<style lang="scss" scoped>
.project-editor-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0a0a0a; // Cinematic Dark
  color: #e5e5e5;
}

.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.left-sidebar-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #0a0a0a; // Unified bg
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
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
  background-color: #000; // Canvas area strictly black
}

.right-sidebar-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #0a0a0a;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  overflow: hidden;
}

.chat-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.resize-handle {
  width: 4px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  transition: background 0.2s;
  z-index: 10;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 1px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.05);
  }

  &:hover,
  &:active {
    background: rgba(var(--brand-primary-rgb), 0.5); // Brand highlight

    &::after {
      background: transparent;
    }
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.hidden {
  display: none;
}
</style>
