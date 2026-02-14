<template>
    <div v-if="isVisible">
        <!-- Resize Handle -->
        <div class="resize-handle" @mousedown="startResizing" />

        <!-- Right Sidebar: Chat & AI Assistant -->
        <aside class="right-sidebar-panel" :style="{ width: `${width}px` }">
            <div
                class="px-5 py-4 border-b border-white/5 text-[13px] font-semibold text-[#aaa] flex items-center gap-2">
                <robot theme="outline" size="18" />
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
                            class="text-white/90 text-sm leading-relaxed max-w-[85%] bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[24px_24px_24px_8px] shadow-lg"
                            v-html="formatContent(msg.content)"></div>

                        <!-- Cards -->
                        <ProjectAnalysisCard v-if="msg.result?.analysis"
                            :msg="{ result: { analysis: msg.result.analysis, language: project?.scriptAnalysis?.language || 'English' }, expandAnalysis: false }" />

                        <ProjectBriefCard v-if="msg.result?.creativeBrief"
                            :msg="{ result: { creativeBrief: msg.result.creativeBrief, analysis: { overview: { duration: '60s' } }, language: project?.scriptAnalysis?.language || 'English' }, expandBrief: false }"
                            :aspect-ratio="project?.aspectRatio" />

                        <ProjectStoryboardCard v-if="msg.result?.storyboard"
                            :msg="{ result: { storyboard: msg.result.storyboard, language: project?.scriptAnalysis?.language || 'English' }, expandStoryboard: false }" />

                        <!-- Visual Path & Assets -->
                        <VisualGenPathCard v-if="msg.type === 'visual-path' && msg.result?.path"
                            :content="msg.result.path" />

                        <VisualAssetsCard v-if="msg.type === 'visual-assets' && msg.result?.assets"
                            :images="msg.result.assets" :project-id="projectId" />
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
import { ref } from 'vue'
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
    if (newWidth >= 300 && newWidth <= 800) {
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

defineExpose({ chatContainer })
</script>

<style lang="scss" scoped>
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
        background: rgba(var(--brand-primary-rgb), 0.5);

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
</style>
