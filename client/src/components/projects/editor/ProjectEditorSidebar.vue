<template>
    <aside v-show="isVisible" class="left-sidebar-nav" :style="{ width: isVisible ? '180px' : '0' }">
        <div class="p-5 flex flex-col gap-2" style="width: 180px">
            <div class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent"
                :class="activeTab === 'storyboard' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
                @click="$emit('change-tab', 'storyboard')">
                <movie-board theme="outline" size="20" />
                <span class="text-sm font-medium">{{ t('projects.editor.storyboard.title') }}</span>
            </div>
            <div class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent"
                :class="activeTab === 'timeline' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'text-[#888] hover:bg-white/5 hover:text-[#ccc]'"
                @click="$emit('change-tab', 'timeline')">
                <film theme="outline" size="20" />
                <span class="text-sm font-medium">{{ t('projects.editor.timeline.title') }}</span>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { MovieBoard, Film } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()

defineProps<{
    activeTab: string
    isVisible: boolean
}>()

defineEmits<{
    'change-tab': [tab: string]
}>()
</script>

<style lang="scss" scoped>
.left-sidebar-nav {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #0a0a0a;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    overflow: hidden;
}
</style>
