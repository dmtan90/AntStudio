<template>
    <div class="recorder-header flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-50">
        <button class="btn-close" @click="router.back()">
            <close theme="outline" size="20" />
        </button>

        <div class="recorder-tabs">
            <button v-for="tab in tabs" :key="tab.value" class="tab-btn" :class="{ active: mode === tab.value }"
                @click="emit('switch-mode', tab.value as RecordingMode)">
                <component :is="tab.icon" theme="outline" size="18" />
                <span>{{ tab.label }}</span>
            </button>
        </div>

        <div class="w-11"></div> <!-- Spacer -->
    </div>
</template>

<script setup lang="ts">
import { Close } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import type { RecordingMode } from '@/composables/useRecorder'

defineProps<{
    mode: RecordingMode
    tabs: any[]
}>()

const emit = defineEmits<{
    (e: 'switch-mode', mode: RecordingMode): void
}>()

const router = useRouter()
</script>

<style lang="scss" scoped>
.recorder-tabs {
    display: flex;
    gap: 8px;
    background: rgba(10, 10, 10, 0.4);
    backdrop-filter: blur(40px);
    padding: 6px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 14px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
    }

    &.active {
        background: rgb(249, 115, 22);
        color: #fff;
        box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
    }
}

.btn-close {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(20, 20, 20, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;

    &:hover {
        background: rgba(255, 100, 100, 0.2);
        border-color: rgba(255, 100, 100, 0.3);
        color: #ff6b6b;
    }
}
</style>
