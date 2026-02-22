<template>
    <div v-if="isVisible" class="flex flex-row">
        <!-- Resize Handle -->
        <div class="resize-handle" @mousedown="startResizing" />

        <!-- Right Sidebar: Chat & AI Assistant -->
        <aside class="right-sidebar-panel" :style="{ width: `${width}px` }">
            <div
                class="px-6 py-5 border-b border-white/5 text-[11px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                <robot theme="outline" size="18" class="text-blue-400" />
                <span>{{ t('projects.editor.assistant') }}</span>
            </div>

            <div class="chat-messages-container custom-scrollbar" ref="chatContainer">
                <div v-for="(msg, index) in messages" :key="index"
                    :class="['flex flex-col gap-4 w-full', msg.author === 'user' ? 'items-end' : '']">
                    <!-- User Message -->
                    <ProjectUserMessage v-if="msg.author === 'user'" :content="msg.content" :files="msg.files">
                    </ProjectUserMessage>

                    <!-- AI Message -->
                    <div v-else class="flex flex-col gap-4">
                        <!-- Text Content -->
                        <div v-if="msg.content"
                            class="ai-bubble group"
                            v-html="formatContent(msg.content)"></div>

                        <!-- Cards -->
                        <ProjectAnalysisCard v-if="msg.result?.analysis" :msg="msg" />

                        <ProjectBriefCard v-if="msg.result?.creativeBrief" :msg="msg" :aspect-ratio="project?.aspectRatio" />

                        <ProjectStoryboardCard v-if="msg.result?.storyboard" :msg="msg" />

                        <!-- Visual Path & Assets -->
                        <VisualGenPathCard v-if="msg.type === 'visual-path' && msg.result?.path" :content="msg.result.path" />

                        <VisualAssetsCard v-if="msg.type === 'visual-assets' && msg.result?.assets" :images="msg.result.assets" :project-id="projectId" />
                    </div>
                </div>
                <!-- Thinking -->
                <div class="flex flex-col gap-4 w-full" v-if="processing">
                    <ProjectThinking :message="statusMessage"></ProjectThinking>
                </div>
            </div>

            <div class="p-2.5 border-t border-white/5 bg-black/20 relative">
                <ProjectChatInputEditor :model-value="inputMessage"
                    @update:model-value="$emit('update:inputMessage', $event)" :loading="processing"
                    :selected-files="[]" :quick-suggestions="quickSuggestions"
                    @handle-enter="$emit('send-message', $event)" @start-analysis="$emit('send-message', $event)"
                    @apply-suggestion="$emit('apply-suggestion', $event)" />
            </div>
        </aside>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Robot } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

import ProjectUserMessage from '@/components/projects/new/ProjectUserMessage.vue'
import ProjectChatInputEditor from '@/components/projects/editor/ProjectChatInputEditor.vue'
import ProjectThinking from '@/components/projects/new/ProjectThinking.vue'
import ProjectBriefCard from '@/components/projects/new/ProjectBriefCard.vue'
import ProjectStoryboardCard from '@/components/projects/new/ProjectStoryboardCard.vue'
import VisualGenPathCard from '@/components/projects/new/VisualGenPathCard.vue'
import VisualAssetsCard from '@/components/projects/new/VisualAssetsCard.vue'
import ProjectAnalysisCard from '@/components/projects/new/ProjectAnalysisCard.vue'

const { t } = useTranslations()

const props = defineProps<{
    isVisible: boolean
    width: number
    messages: any[]
    processing: boolean
    statusMessage: string
    quickSuggestions: string[]
    projectId: string
    project: any
    inputMessage: string
    formatContent: (text: string) => string
}>()

const emit = defineEmits<{
    'update:width': [width: number]
    'send-message': [payload?: any]
    'apply-suggestion': [suggestion: string]
    'update:inputMessage': [value: string]
}>()

const chatContainer = ref<HTMLElement | null>(null)
const isResizing = ref(false)

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
    if (newWidth >= 300 && newWidth <= 600) {
        emit('update:width', newWidth)
    }
}

const stopResizing = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleResizing)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
}

const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
    })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
    if (chatContainer.value) {
        resizeObserver = new ResizeObserver(() => {
            scrollToBottom()
        })
        resizeObserver.observe(chatContainer.value)
        scrollToBottom()
    }
})

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
})

defineExpose({ chatContainer, scrollToBottom })
</script>

<style lang="scss" scoped>
.right-sidebar-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 12, 0.4);
    backdrop-filter: blur(40px) saturate(180%);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    z-index: 20;
}

.chat-messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.ai-bubble {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.6;
    max-width: 90%;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 16px 20px;
    border-radius: 20px 20px 20px 4px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    letter-spacing: -0.01em;

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
    }
}

.resize-handle {
    width: 6px;
    height: 100%;
    background: transparent;
    cursor: col-resize;
    transition: all 0.3s ease;
    z-index: 30;
    position: relative;
    margin-right: -3px;
    margin-left: -3px;

    &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.05);
        transform: translateX(-50%);
        transition: all 0.3s ease;
    }

    &:hover,
    &:active {
        background: rgba(59, 130, 246, 0.1);

        &::after {
            background: #3b82f6;
            width: 2px;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
    }
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.1);
}
</style>
