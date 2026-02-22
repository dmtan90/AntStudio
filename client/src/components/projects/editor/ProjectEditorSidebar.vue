<template>
    <aside v-show="isVisible" class="left-sidebar-nav" :style="{ width: isVisible ? '180px' : '0' }">
        <div class="sidebar-content custom-scrollbar">
            <div class="sidebar-item"
                :class="{ 'active': activeTab === 'storyboard' }"
                @click="$emit('change-tab', 'storyboard')">
                <div class="item-icon">
                    <movie-board theme="outline" size="20" />
                </div>
                <span class="item-label">{{ t('projects.editor.storyboard.title') }}</span>
            </div>
            <div class="sidebar-item"
                :class="{ 'active': activeTab === 'timeline' }"
                @click="$emit('change-tab', 'timeline')">
                <div class="item-icon">
                    <film theme="outline" size="20" />
                </div>
                <span class="item-label">{{ t('projects.editor.timeline.title') }}</span>
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
    background: rgba(10, 10, 12, 0.4);
    backdrop-filter: blur(40px) saturate(180%);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    z-index: 20;
}

.sidebar-content {
    padding: 24px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 180px;
}

.sidebar-item {
    padding: 12px 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: rgba(255, 255, 255, 0.4);
    border: 1px solid transparent;

    .item-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s ease;
    }

    .item-label {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.9);
        .item-icon { transform: translateX(2px); }
    }

    &.active {
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(59, 130, 246, 0.1);
        
        .item-icon {
            color: #3b82f6;
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
        }
    }
}
</style>
