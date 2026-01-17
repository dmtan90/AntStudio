<template>
  <div 
    class="project-editor-layout h-screen bg-black text-white overflow-hidden flex flex-col"
    :style="{
      '--left-width': isLeftVisible ? '180px' : '0px',
      '--right-width': isRightVisible ? `${rightWidth}px` : '0px'
    }"
  >
    <!-- Header Bar -->
    <ProjectEditorHeader 
      :left-visible="isLeftVisible"
      :right-visible="isRightVisible"
      @toggle-left="isLeftVisible = !isLeftVisible"
      @toggle-right="isRightVisible = !isRightVisible"
      @export="handleExportAction"
    />

    <div class="editor-body flex-1 flex overflow-hidden">
      <!-- Left Sidebar: Navigation -->
      <aside 
        v-show="isLeftVisible"
        class="flex flex-col bg-[#141414]/95 border-r border-white/5 w-[var(--left-width)] shrink-0 transition-all duration-300"
      >
        <div class="p-5 flex flex-col gap-2">
          <div 
            class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all" 
            :class="activeTab === 'storyboard' ? 'bg-white/10 text-white' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
            @click="activeTab = 'storyboard'"
          >
            <movie-board theme="outline" size="20" />
            <span class="text-sm font-medium">Storyboard</span>
          </div>
          <div 
            class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all" 
            :class="activeTab === 'timeline' ? 'bg-white/10 text-white' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
            @click="activeTab = 'timeline'"
          >
            <film theme="outline" size="20" />
            <span class="text-sm font-medium">Timeline</span>
          </div>
        </div>
      </aside>

      <!-- Middle: Main Content -->
      <main class="bg-[#0a0a0a] flex-1 flex flex-col overflow-hidden relative">
        <div v-if="loading" class="p-10">
          <el-skeleton :rows="10" animated />
        </div>
        
        <template v-if="project">
          <ProjectStoryboard 
            :project="project"
            :loading-states="generatingStates"
            :class="{ 'hidden': activeTab !== 'storyboard' }"
            @regenerate-character="handleRegenerateCharacter"
            @generate-frame="handleGenerateFrame"
            @generate-video="handleGenerateVideo"
            @regenerate-all-characters="handleRegenerateAllCharacters"
            @generate-all-frames="handleGenerateAllFrames"
            @generate-all-videos="handleGenerateAllVideos"
          />
          <ProjectTimeline 
            :project="project" 
            v-if="activeTab === 'timeline'"
          />
          <!-- <div :class="{ 'hidden': activeTab !== 'timeline' }">
            <el-skeleton :rows="10" animated />
          </div> -->
        </template>
        <div v-else class="p-10">
          <el-skeleton :rows="10" animated />
        </div>
      </main>

      <!-- Resize Handle -->
      <div 
        v-show="isRightVisible"
        class="resize-handle"
        @mousedown="startResizing"
      />

      <!-- Right Sidebar: Chat & AI Assistant -->
      <aside 
        v-show="isRightVisible"
        class="flex flex-col bg-[#141414]/95 border-l border-white/5 overflow-hidden shrink-0"
        :style="{ width: 'var(--right-width)' }"
      >
        <div class="px-5 py-4 border-b border-white/5 text-[13px] font-semibold text-[#aaa] flex items-center gap-2">
          <robot theme="outline" size="18" />
          <span>AI Assistant</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar" ref="chatContainer">
          <div v-for="(msg, index) in localMessages" :key="index" :class="['flex flex-col gap-4 w-full', msg.author === 'user' ? 'items-end' : '']">
            <!-- User Message -->
            <ProjectUserMessage 
              v-if="msg.author === 'user'" 
              :content="msg.content" 
              :files="msg.files" 
            ></ProjectUserMessage>
            
            <!-- AI Message -->
            <div v-else class="flex flex-col gap-4">
              <!-- Text Content -->
              <div v-if="msg.content" class="text-[#ccc] text-sm leading-relaxed max-w-[85%] bg-white/[0.08] border border-white/[0.1] px-6 py-4 rounded-[20px_20px_20px_4px] shadow-lg" v-html="formatContent(msg.content)"></div>

              <!-- Cards -->
              <ProjectAnalysisCard 
                v-if="msg.result?.analysis" 
                :msg="{ result: { analysis: msg.result.analysis, language: 'English' }, expandAnalysis: false }" 
              />

              <ProjectBriefCard 
                v-if="msg.result?.creativeBrief" 
                :msg="{ result: { creativeBrief: msg.result.creativeBrief, analysis: { overview: { duration: '60s' } }, language: 'English' }, expandBrief: false }"
                :aspect-ratio="project.aspectRatio"
              />

              <ProjectStoryboardCard 
                v-if="msg.result?.storyboard" 
                :msg="{ result: { storyboard: msg.result.storyboard, language: 'English' }, expandStoryboard: false }"
              />
              
              <!-- Visual Path & Assets -->
              <VisualGenPathCard 
                v-if="msg.type === 'visual-path' && msg.result?.path" 
                :content="msg.result.path"
              />

              <VisualAssetsCard 
                v-if="msg.type === 'visual-assets' && msg.result?.assets" 
                :images="msg.result.assets"
                :project-id="projectId"
              />
            </div>
          </div>
          <!-- Thinking -->
          <div class="flex flex-col gap-4 w-full" v-if="processing">
            <ProjectThinking :message="statusMessage"></ProjectThinking>
          </div>
        </div>

        <div class="p-2.5 border-t border-white/5 bg-black/20 relative">
          <ProjectChatInput 
            v-model="inputMessage"
            :loading="processing"
            :selected-files="[]"
            :quick-suggestions="quickSuggestions"
            @handle-enter="handleSendMessage"
            @start-analysis="handleSendMessage"
            @apply-suggestion="handleApplySuggestion"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRoute } from '#app'
import { 
  MovieBoard, Film, Robot
} from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import { useProjectStore } from '~/stores/project'
import { useUserStore } from '~/stores/user'
import { useTranslations } from '~/composables/useTranslations'

// Components
import ProjectEditorHeader from '~/components/projects/editor/ProjectEditorHeader.vue'
import ProjectStoryboard from '~/components/projects/editor/ProjectStoryboard.vue'
import ProjectTimeline from '~/components/projects/editor/ProjectTimeline.vue'
import ProjectUserMessage from '~/components/projects/new/ProjectUserMessage.vue'
import ProjectChatInput from '~/components/projects/editor/ProjectChatInput.vue'
import ProjectThinking from '~/components/projects/new/ProjectThinking.vue'
import ProjectBriefCard from '~/components/projects/new/ProjectBriefCard.vue'
import ProjectStoryboardCard from '~/components/projects/new/ProjectStoryboardCard.vue'
import VisualGenPathCard from '~/components/projects/new/VisualGenPathCard.vue'
import VisualAssetsCard from '~/components/projects/new/VisualAssetsCard.vue'
import ProjectAnalysisCard from '~/components/projects/new/ProjectAnalysisCard.vue'

const { t } = useTranslations()
definePageMeta({ layout: false })

const route = useRoute()
const projectId = route.params.id as string
const projectStore = useProjectStore()
const userStore = useUserStore()

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
      toast.info('Starting video assembly...')
      const token = localStorage.getItem('auth-token')
      const { data } = await $fetch(`/api/projects/${projectId}/assemble-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }) as any
      toast.success('Video assembly completed')
      if (data.project?.finalVideo?.s3Url) {
         window.open(data.project.finalVideo.s3Url, '_blank')
      }
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to assemble video')
    }
  } else {
    toast.info(`${command} export coming soon`)
  }
}
// Helpers
const formatContent = (text: string) => {
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
  await userStore.fetchProfile() // Ensure user is loaded for header
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
    console.log("lastMsg", lastMsg);

    // Add user message locally
    messages.value.push({
        author: 'user',
        content: msgContent,
        timestamp: new Date()
    })
    
    inputMessage.value = ''
    processing.value = true
    quickSuggestions.value = [] // Clear suggestions while processing
    scrollToBottom()
    
    // Determine language from project analysis
    const isVietnamese = project.value?.scriptAnalysis?.language === 'Vietnamese' || project.value?.scriptAnalysis?.language === 'vi'

    // --- AI Logic Simulation (Real API Call) ---
    // Update: Now we call the backend chat API for general conversation
    
    // Check for specific commands handled purely on frontend or special endpoints first
    // (e.g. the visual plan generation flow might still be separate or invited by the Chat API)
    
    try {
        const token = localStorage.getItem('auth-token')
        
        // Temporary: logic to distinguish between "Start Plan" (special flow) vs "General Chat"
        // In a real agent, the Chat API should distinguish intent.
        // For now, let's keep the existing "Visual Plan" specific trigger valid, 
        // but route everything else to /api/chat.
        
        const lowerMsg = msgContent.toLowerCase()
        //including thinking message
        const isStartCommand = ['start', 'ok', 'yes', 'bắt đầu', 'được'].some(k => lowerMsg.includes(k)) && lastMsg.type == "visual-guide"
        console.log("isStartCommand", isStartCommand);
        if (isStartCommand || lowerMsg.includes('visual plan') || lowerMsg.includes('generate plan')) {
             // ... Existing Mock/Special Logic for "Start" ...
             // We can keep the "Start" logic or move it to backend. 
             // Requirement says: "Gemini needs to base on project logs... to answer or execute commands"
             // So ideally, we send to Chat API, and Chat API tells us what to do?
             // Or we just use the Chat API for everything.
             
             // Let's TRY to use Chat API for everything, but extracting the "Action" is tricky without structured output for actions.
             // For now, I will preserve the Critical "Visual Plan" flow as a special case if the user explicitly asks or confirms start,
             // BUT I will modify it to use the `generateVisualStrategy` directly if detected, 
             // AND for everything else, call `chat.post.ts`.
             
             if (currentStage.value === 'planning_confirmed' || isStartCommand) {
                  await generateVisualStrategy(isVietnamese)
                  return
             }
        }

        // General Chat API Call
        const { data } = await $fetch(`/api/projects/${projectId}/chat`, {
            method: 'POST',
            body: { message: msgContent },
            headers: { Authorization: `Bearer ${token}` }
        }) as any

        if (data && data.success) {
            messages.value.push({
                author: 'ai',
                content: data.data.content,
                type: data.data.type || 'text',
                timestamp: new Date()
            })
        }

    } catch (error) {
        console.error('Chat API Error', error)
        messages.value.push({
            author: 'ai',
            content: 'Sorry, I encountered an error processing your request.',
            type: 'text',
            timestamp: new Date()
        })
    }
    
    processing.value = false
    scrollToBottom()
}

const generateVisualStrategy = async (isVietnamese: boolean) => {
    try {
        // Call Real API to generate plan data
        const token = localStorage.getItem('auth-token')
        const { data } = await $fetch(`/api/projects/${projectId}/generate-visual-plan`, {
            method: 'POST',
            body: { message: 'Start Visual Generation' }, // Context message
            headers: { Authorization: `Bearer ${token}` }
        }) as any

        const result = data // Contains plan_steps, assets, completion_message
        
        // Update Store with new assets
        if (result.assets) {
            // We need to merge these into the current project state if the API didn't return full project
            // The API does save to DB, so we should ideally refetch or manually push
            // To be safe and quick, let's manually push to store state
            if (!projectStore.currentProject.visualAssets) projectStore.currentProject.visualAssets = []
            
            // Map assets to characters if they match
            const characters = projectStore.currentProject.scriptAnalysis?.characters || []
            
            result.assets.forEach((a: any) => {
                // 1. Add to visualAssets if not exists
                if (!projectStore.currentProject.visualAssets.some((exist: any) => exist.name === a.name)) {
                     projectStore.currentProject.visualAssets.push(a)
                }
                
                // 2. Sync to elements using Store Logic
                projectStore.syncAssetToElements(a.name, a.s3Key)
            })

            // Save the updated project with new assets and links
            await projectStore.updateProject({ 
                visualAssets: projectStore.currentProject.visualAssets,
                scriptAnalysis: projectStore.currentProject.scriptAnalysis,
                storyboard: projectStore.currentProject.storyboard
            })
        }

        // 1. Visual Path Card (Visual Timeline)
        messages.value.push({
            author: 'ai',
            type: 'visual-path',
            result: {
                path: {
                    steps: result.plan_steps // Use real steps from API
                }
            },
            timestamp: new Date()
        })
        scrollToBottom()

        // 2. Simulate processing of steps (optional, or just show them all as pending/done)
        // For now, let's mark the first one as loading/done to give some life
        
        setTimeout(() => {
             // 3. Visual Assets Card (With Real Asset Names/Descriptions)
            console.log("Visual Assets", result.assets);
             messages.value.push({
                author: 'ai',
                type: 'visual-assets',
                result: {
                    assets: result.assets // Use real assets from API
                },
                timestamp: new Date()
            })
            
            // 4. Final Completion Message
            // messages.value.push({
            //     author: 'ai',
            //     content: result.completion_message,
            //     type: 'text',
            //     timestamp: new Date()
            // })
            
            quickSuggestions.value = isVietnamese 
                ? ['Tạo khung hình tĩnh', 'Tạo chuyển động', 'Tạo nhạc nền']
                : ['Generate Frames', 'Generate Motion', 'Generate Audio']
                
            scrollToBottom()
            
        }, 2000) // Delay for assets generation simulation

    } catch (error) {
        console.error('Failed to generate visual plan', error)
        toast.error('Failed to generate visual plan')
    }
    processing.value = false
}

const handleApplySuggestion = (sug: string) => {
    handleSendMessage(sug)
}


// Loading States for storyboard items
const generatingStates = ref<Record<string, boolean>>({})

const handleRegenerateCharacter = async (char: any, index: number) => {
    const id = `char-${index}`
    generatingStates.value[id] = true
    try {
        const token = localStorage.getItem('auth-token')
        const { data } = await $fetch(`/api/projects/${projectId}/assets/generate`, {
            method: 'POST',
            body: { 
                assetName: `Element_${char.name}.img`,
                description: char.description,
                type: 'image'
            },
            headers: { Authorization: `Bearer ${token}` }
        }) as any

        if (data.s3Key) {
            char.referenceImage = data.s3Key
            projectStore.syncAssetToElements(`Element_${char.name}.img`, data.s3Key)
            //sync history
            projectStore.fetchProject(projectId)
            return true
        }
    } catch (error) {
        console.error(`Failed to regenerate character ${char.name}:`, error)
        return false
    } finally {
        generatingStates.value[id] = false
    }
}

const handleRegenerateAllCharacters = async () => {
    const chars = project.value?.scriptAnalysis?.characters || []
    if (chars.length === 0) return
    
    toast.info(`Starting batch regeneration for ${chars.length} characters...`)
    let successCount = 0
    for (let i = 0; i < chars.length; i++) {
        const success = await handleRegenerateCharacter(chars[i], i)
        if (success) successCount++
    }
    toast.success(`Batch complete: ${successCount}/${chars.length} characters updated`)
}

const handleGenerateFrame = async (seg: any) => {
    const id = `seg-${seg.order}`
    generatingStates.value[id] = true
    try {
        const token = localStorage.getItem('auth-token')
        const { data } = await $fetch(`/api/projects/${projectId}/assets/generate`, {
            method: 'POST',
            body: { 
                assetName: `Scene_${seg.order}.img`,
                description: seg.description,
                type: 'image',
                segmentId: seg._id,
                characterNames: seg.characters // Pass for visual consistency
            },
            headers: { Authorization: `Bearer ${token}` }
        }) as any

        if (data.s3Key) {
            seg.sceneImage = data.s3Key
            projectStore.syncAssetToElements(`Scene_${seg.order}.img`, data.s3Key)
            //sync history
            projectStore.fetchProject(projectId)
            return true
        }
    } catch (error) {
        console.error(`Failed to generate frame for ${seg.title}:`, error)
        return false
    } finally {
        generatingStates.value[id] = false
    }
}

const handleGenerateAllFrames = async () => {
    const segments = project.value?.storyboard?.segments || []
    if (segments.length === 0) return

    toast.info(`Starting batch regeneration for ${segments.length} frames...`)
    let successCount = 0
    for (const seg of segments) {
        const success = await handleGenerateFrame(seg)
        if (success) successCount++
    }
    toast.success(`Batch complete: ${successCount}/${segments.length} frames updated`)
}

const handleGenerateVideo = async (seg: any) => {
    const id = `video-${seg.order}`
    generatingStates.value[id] = true
    try {
        const token = localStorage.getItem('auth-token')
        const { data } = await $fetch(`/api/projects/${projectId}/assets/generate`, {
            method: 'POST',
            body: {
                segmentId: seg._id,
                type: 'video'
            },
            headers: { Authorization: `Bearer ${token}` }
        }) as any

        if (data.s3Key) {
            // Update segment data
            seg.generatedVideo.s3Key = data.s3Key
            projectStore.syncAssetToElements(`video_${seg.order}.mp4`, data.s3Key)
            //sync history
            projectStore.fetchProject(projectId)
            return true
        }
    } catch (error: any) {
        console.error(`Failed to generate video for ${seg.title}:`, error)
        toast.error(error.data?.message || `Failed to generate video for ${seg.title}`)
        return false
    } finally {
        generatingStates.value[id] = false
    }
}

const handleGenerateAllVideos = async () => {
    const segments = project.value?.storyboard?.segments || []
    if (segments.length === 0) return

    toast.info(`Starting batch video generation for ${segments.length} segments...`)
    let successCount = 0
    for (const seg of segments) {
        const success = await handleGenerateVideo(seg)
        if (success) successCount++
    }
    toast.success(`Batch complete: ${successCount}/${segments.length} videos requested`)
}
</script>

<style lang="scss" scoped>
.project-editor-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
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

  &:hover, &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
