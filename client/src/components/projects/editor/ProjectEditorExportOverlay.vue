<template>
    <div v-if="isVisible"
        class="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
        <div class="w-full max-w-md space-y-8 flex flex-col items-center">
            <div class="relative w-32 h-32 flex items-center justify-center">
                <svg class="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
                        class="text-white/10" />
                    <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
                        class="text-blue-500 transition-all duration-300"
                        :style="{ strokeDasharray: 376.8, strokeDashoffset: 376.8 * (1 - progress / 100) }" />
                </svg>
                <span class="text-4xl font-black text-white">{{ Math.round(progress) }}%</span>
            </div>

            <div class="text-center space-y-2">
                <h2 class="text-2xl font-black text-white uppercase tracking-widest">{{
                    t('projects.editor.video.exporting') }}
                </h2>
                <p class="text-white/60 font-medium tracking-tight animate-pulse">{{ status }}</p>
            </div>

            <div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div class="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                    :style="{ width: `${progress}%` }" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

defineProps<{
    isVisible: boolean
    progress: number
    status: string
}>()
</script>
