<template>
    <div class="auto-save-indicator fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md transition-all duration-300"
        :class="{
            'bg-black/60 border border-white/10': status === 'idle',
            'bg-yellow-500/20 border border-yellow-500/30': status === 'saving',
            'bg-green-500/20 border border-green-500/30': status === 'saved',
            'bg-red-500/20 border border-red-500/30': status === 'error',
            'opacity-0 pointer-events-none': status === 'idle' && !lastSavedAt
        }">
        <!-- Saving State -->
        <template v-if="status === 'saving'">
            <div class="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-medium text-yellow-400">Saving...</span>
        </template>

        <!-- Saved State -->
        <template v-else-if="status === 'saved'">
            <Check theme="filled" size="16" class="text-green-400" />
            <span class="text-xs font-medium text-green-400">Saved</span>
        </template>

        <!-- Error State -->
        <template v-else-if="status === 'error'">
            <CloseOne theme="filled" size="16" class="text-red-400" />
            <span class="text-xs font-medium text-red-400">Save Failed</span>
        </template>

        <!-- Idle with timestamp -->
        <template v-else-if="lastSavedAt">
            <span class="text-xs text-white/50">{{ timeAgo }}</span>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Check, CloseOne } from '@icon-park/vue-next'


interface Props {
    status: 'idle' | 'saving' | 'saved' | 'error'
    lastSavedAt?: Date | null
}

const props = defineProps<Props>()

const timeAgo = computed(() => {
    if (!props.lastSavedAt) return ''
    const seconds = Math.floor((new Date().getTime() - props.lastSavedAt.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
})

// Auto-hide "Saved" status after 2 seconds
watch(() => props.status, (newStatus) => {
    if (newStatus === 'saved') {
        setTimeout(() => {
            // Status will be managed by parent component
        }, 2000)
    }
})
</script>

<style scoped>
.auto-save-indicator {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
