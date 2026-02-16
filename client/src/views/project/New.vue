<template>
  <div class="flow-creation-page">
    <!-- Setup Modes (Scrollable) -->
    <div v-if="mode !== 'chat'" class="setup-layout-wrapper">
      <ProjectBlankSetup v-if="mode === 'blank'" />
      <ProjectProductAdsSetup v-else-if="mode === 'product-ads'" />
      <ProjectAvatarSetup v-else-if="mode === 'avatar'" />
      <ProjectPresentationSetup v-else-if="mode === 'presentation'" />
      <ProjectLiveStreamSetup v-else-if="mode === 'live-stream'" />
    </div>

    <!-- Chat Flow Mode (Default) -->
    <template v-else>
      <div class="flow-container" ref="containerRef" @mousedown="floatingComment.show = false"
        @scroll="floatingComment.show = false">
        <ProjectWelcome v-if="messages.length === 0 && !loading" />

        <div class="chat-timeline">
          <div v-for="(msg, idx) in messages" :key="idx" :class="['message-row', msg.author]">
            <!-- User Message -->
            <ProjectUserMessage v-if="msg.author === 'user'" :content="msg.content" :files="msg.files" />

            <!-- AI Greeting -->
            <ProjectGreeting v-else-if="msg.type === 'text'" :content="msg.content" />

            <!-- AI Results -->
            <div v-else class="ai-content-wrapper">
              <!-- Result Grid -->
              <div v-if="msg.result" class="analysis-grid doc-style-flow">
                <ProjectAnalysisCard :msg="msg" @text-selection="handleTextSelection" @comment="commentOn" />

                <ProjectBriefCard :msg="msg" :aspect-ratio="form.aspectRatio" @text-selection="handleTextSelection"
                  @comment="commentOn" />

                <ProjectStoryboardCard :msg="msg" @text-selection="handleTextSelection" @comment="commentOn" />

                <ProjectClosingMessage :msg="msg" :index="idx" :creating="creating" @apply-suggestion="applySuggestion"
                  @finalize="finalizeProject" @re-generate="reGenerate" />
              </div>
            </div>
          </div>
          <div class="message-row" v-if="loading">
            <div class="ai-content-wrapper">
              <!-- Thinking -->
              <ProjectThinking :message="statusMessage" />
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <ProjectChatInputNew v-model="prompt" v-model:form="form" :selected-files="selectedFiles" :loading="loading"
        :quick-suggestions="quickSuggestions" :has-results="hasResults" :show-mentions="showMentions" ref="chatInputRef"
        @handle-enter="handleEnter" @on-file-selected="onFileSelected" @remove-file="removeFile"
        @start-analysis="startAnalysis" @cancel-analysis="cancelAnalysis" @reset-flow="resetFlow"
        @apply-suggestion="applySuggestion" @insert-mention="insertMention" />

      <!-- Tooltip -->
      <ProjectFloatingComment v-bind="floatingComment" @comment="commentOn" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useTranslations } from '@/composables/useTranslations'
import { useProjectStore } from '@/stores/project'
import { storeToRefs } from 'pinia'

// Components
import ProjectWelcome from '@/components/projects/new/ProjectWelcome.vue'
import ProjectUserMessage from '@/components/projects/new/ProjectUserMessage.vue'
import ProjectGreeting from '@/components/projects/new/ProjectGreeting.vue'
import ProjectThinking from '@/components/projects/new/ProjectThinking.vue'
import ProjectAnalysisCard from '@/components/projects/new/ProjectAnalysisCard.vue'
import ProjectBriefCard from '@/components/projects/new/ProjectBriefCard.vue'
import ProjectStoryboardCard from '@/components/projects/new/ProjectStoryboardCard.vue'
import ProjectBlankSetup from '@/components/projects/new/ProjectBlankSetup.vue'
import ProjectProductAdsSetup from '@/components/projects/new/ProjectProductAdsSetup.vue'
import ProjectAvatarSetup from '@/components/projects/new/ProjectAvatarSetup.vue'
import ProjectPresentationSetup from '@/components/projects/new/ProjectPresentationSetup.vue'
import ProjectLiveStreamSetup from '@/components/projects/new/ProjectLiveStreamSetup.vue'
import { onMounted } from 'vue'

const { t } = useTranslations()
const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()

const { isGenerating: loading, isProcessing: creating } = storeToRefs(projectStore)

const mode = computed(() => route.query.mode as string || 'chat')

// Clone Mode Logic
onMounted(() => {
  if (route.query.mode === 'clone') {
    prompt.value = "I want to create a video similar to this style: [Paste URL here]. Requirements: "
    // Auto-focus the input after a short delay
    setTimeout(() => {
      chatInputRef.value?.focus()
    }, 300)
  }
})

// UI State
const prompt = ref('')
const statusMessage = ref(t('projects.new.flow.analyzing'))
const hasResults = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const chatInputRef = ref<any>(null)
const selectedFiles = ref<File[]>([])
const showMentions = ref(false)

// Commenting State
const floatingComment = reactive({
  show: false,
  top: 0,
  left: 0,
  text: '',
  context: ''
})

// Chat History State
interface ChatMessage {
  author: 'user' | 'ai';
  type?: 'thinking' | 'result' | 'text' | 'visual-guide';
  content?: string;
  files?: Array<{ name: string }>;
  result?: any;
  timestamp?: Date;
}
const messages = ref<ChatMessage[]>([])
const abortController = ref<AbortController | null>(null)
const lastInput = reactive({ prompt: '', files: [] as File[] })

const quickSuggestions = [
  'Create a 30s marketing ad',
  'Write a short film script',
  'Convert @script into a video',
  'Clone style from @reference',
  'MC presentation for report data'
]

// Form Data
const form = reactive({
  aspectRatio: '16:9',
  videoStyle: 'Cinematic',
  targetDuration: 60,
  title: ''
})

const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = [...selectedFiles.value, ...Array.from(target.files)]
  }
}

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1)
}

const applySuggestion = (sug: string) => {
  prompt.value = sug
  chatInputRef.value?.focus()
}

const handleEnter = (e?: KeyboardEvent) => {
  if (e?.shiftKey) return
  startAnalysis()
}

// @Mention Logic
watch(prompt, (newVal) => {
  const input = chatInputRef.value?.inputRef
  if (!input) return
  const cursor = input.selectionStart || 0
  const textBefore = newVal.slice(0, cursor)

  if (textBefore.endsWith('@') && selectedFiles.value.length > 0) {
    showMentions.value = true
  } else {
    showMentions.value = false
  }
})

const insertMention = (fileName: string) => {
  const input = chatInputRef.value?.inputRef
  if (!input) return
  const cursor = input.selectionStart || 0
  const before = prompt.value.slice(0, cursor - 1)
  const after = prompt.value.slice(cursor)
  prompt.value = before + '@' + fileName + ' ' + after
  showMentions.value = false
  chatInputRef.value?.focus()
}

const cancelAnalysis = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
  projectStore.isGenerating = false
  prompt.value = lastInput.prompt
  selectedFiles.value = [...lastInput.files]
  messages.value.splice(-2)
}

const commentOn = (part: string, selectedText?: string) => {
  if (selectedText) {
    prompt.value = `Refine selected text: "${selectedText}" in ${part}: `
  } else {
    prompt.value = `Adjust ${part}: `
  }

  floatingComment.show = false
  chatInputRef.value?.focus()
  setTimeout(() => {
    const input = chatInputRef.value?.inputRef
    if (input) input.selectionStart = input.selectionEnd = prompt.value.length
  }, 0)
}

const handleTextSelection = (e: MouseEvent, part: string) => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0) {
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    floatingComment.text = selection.toString().trim()
    floatingComment.context = part
    floatingComment.top = rect.top - 40
    floatingComment.left = rect.left + (rect.width / 2)
    floatingComment.show = true
  } else {
    floatingComment.show = false
  }
}

const removeMessage = (idx: number) => {
  messages.value.splice(idx, 1)
}

const reGenerate = (idx: number) => {
  if (!prompt.value.trim() && lastInput.prompt) {
    prompt.value = lastInput.prompt
  }
  if (selectedFiles.value.length === 0 && lastInput.files.length > 0) {
    selectedFiles.value = [...lastInput.files]
  }
  removeMessage(idx)
  startAnalysis()
}

const startAnalysis = async () => {
  if ((!prompt.value.trim() && !selectedFiles.value.length) || loading.value) return

  lastInput.prompt = prompt.value
  lastInput.files = [...selectedFiles.value]

  messages.value.push({
    author: 'user',
    content: prompt.value,
    files: selectedFiles.value.map(f => ({ name: f.name }))
  })

  const userMessageCount = messages.value.filter(m => m.author === 'user').length
  if (userMessageCount <= 1) {
    const isScript = prompt.value.toLowerCase().includes('phim') || prompt.value.toLowerCase().includes('kịch bản') || selectedFiles.value.length > 0
    const key = isScript ? 'script' : 'topic'

    const greeting = `
      ${t(`ai.greetings.${key}.title`)}<br><br>
      ${t(`ai.greetings.${key}.steps`)}<br>
      <ol style="margin: 12px 0; padding-left: 20px; line-height: 2;">
        <li><b>${t(`ai.greetings.${key}.step1`)}</b></li>
        <li><b>${t(`ai.greetings.${key}.step2`)}</b></li>
        <li><b>${t(`ai.greetings.${key}.step3`)}</b></li>
      </ol>
      ${t(`ai.greetings.${key}.footer`)}
    `

    messages.value.push({
      author: 'ai',
      content: greeting,
      type: 'text'
    })
  }

  const currentPrompt = prompt.value
  const currentFiles = [...selectedFiles.value]
  prompt.value = ''

  statusMessage.value = t('projects.new.flow.thinking')
  scrollToBottom()

  try {
    const formData = new FormData()
    formData.append('topic', currentPrompt)
    const historyData = messages.value
      .filter(m => m.type !== 'thinking')
      .slice(-10)
      .map(m => ({
        author: m.author,
        content: m.content || (m.result ? `[AI ANALYSIS RESULT: ${m.result.summary}]` : '')
      }))
    formData.append('history', JSON.stringify(historyData))
    formData.append('aspectRatio', form.aspectRatio)
    formData.append('videoStyle', form.videoStyle)
    formData.append('targetDuration', form.targetDuration.toString())

    currentFiles.forEach(file => {
      formData.append('files', file)
    })

    const res = await projectStore.getPreview(formData)

    if (res && res.creativeBrief) {
		res.expandAnalysis = true;
		res.expandBrief = true;
		res.expandStoryboard = true;
	  }
	  messages.value.push({
		author: 'ai',
		type: 'result',
		result: res
	  })
	  hasResults.value = true
	  scrollToBottom()
  } catch (error: any) {
    if (error.name === 'AbortError') return
    toast.error(error.response?.data?.message || 'AI Analysis failed')
  } finally {
    scrollToBottom()
  }
}

const finalizeProject = async (resultData: any) => {
  projectStore.isProcessing = true
  try {
    const title = form.title || resultData.creativeBrief?.title || 'Project ' + new Date().toLocaleDateString()

    const projectRes = await projectStore.createProject({
      title, aspectRatio: form.aspectRatio, videoStyle: form.videoStyle, targetDuration: form.targetDuration
    })

    const project = projectRes.project

    await projectStore.updateProject({
      'input.topic': lastInput.prompt,
      scriptAnalysis: resultData.analysis,
      'storyboard.segments': resultData.storyboard,
      'storyboard.totalDuration': resultData.totalDuration,
      status: 'storyboard',
      chatHistory: [
        ...messages.value
          .filter(m => m.type !== 'thinking')
          .map(m => ({
            author: m.author,
            content: m.content,
            type: m.type || 'text',
            result: m.result,
            files: m.files,
            timestamp: m.timestamp || new Date()
          })),
        {
          author: 'ai',
          content: `
            ${t('ai.greetings.visualGuide.title')}<br><br>
            ${t('ai.greetings.visualGuide.steps')}<br><br>
            <ol style="margin: 12px 0; padding-left: 20px; line-height: 2;">
              <li><b>${t('ai.greetings.visualGuide.step1')}</b></li>
              <li><b>${t('ai.greetings.visualGuide.step2')}</b></li>
              <li><b>${t('ai.greetings.visualGuide.step3')}</b></li>
            </ol><br>
            ${t('ai.greetings.visualGuide.footer')}
          `,
          type: 'visual-guide',
          timestamp: new Date()
        }
      ]
    }, project._id)

    toast.success('Project created!')
    selectedFiles.value = []
    hasResults.value = false
    router.push(`/projects/${project._id}/editor`)
  } catch (error: any) {
    toast.error('Failed to create project')
  } finally {
    projectStore.isProcessing = false
  }
}

const resetFlow = () => {
  messages.value = []
  hasResults.value = false
  prompt.value = ''
  selectedFiles.value = []
  lastInput.prompt = ''
  lastInput.files = []
  toast.success('Chat memory and project state reset.')
}

const scrollToBottom = () => {
  setTimeout(() => {
    if (containerRef.value) {
      containerRef.value.scrollTo({ top: containerRef.value.scrollHeight, behavior: 'smooth' })
    }
  }, 100)
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style lang="scss" scoped>
.flow-creation-page {
  height: calc(100vh - 30px);
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.02) 0%, transparent 80%);
  overflow: hidden;
  position: relative;
}

.setup-layout-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px; // Space for action buttons if they overlap

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
}

.flow-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px 280px;
  display: flex;
  flex-direction: column;
  align-items: center;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
}

.chat-timeline {
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.message-row {
  display: flex;
  flex-direction: column;
  width: 100%;

  &.user {
    align-items: flex-end;
  }

  &.ai {
    align-items: flex-start;
  }
}

.ai-content-wrapper {
  min-width: 150px;
  max-width: 100%;
}

.doc-style-flow {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  width: 100%;
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  width: 100%;
  margin-top: 16px;
}
</style>
