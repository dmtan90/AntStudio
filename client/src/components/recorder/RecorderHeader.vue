<template>
    <div class="recorder-header flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-50">
        <button class="btn-close" @click="router.back()">
            <close theme="outline" size="20" />
        </button>

        <div class="recorder-tabs">
            <button v-for="tab in tabs" :key="tab.value" class="tab-btn text-black-50" :class="{ active: mode === tab.value }"
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
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(40px) saturate(180%);
    padding: 8px;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.tab-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    letter-spacing: -0.01em;

    &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.06);
        transform: translateY(-1px);
    }

    &.active {
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }
}

.btn-close {
    width: 48px;
    height: 48px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

    &:hover {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
        color: #ff5c5c;
        transform: rotate(90deg) scale(1.1);
    }
}
</style>
