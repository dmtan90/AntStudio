<template>
    <div v-if="enabled" class="absolute bottom-8 right-8 z-30 animate-fade-in group pointer-events-none">
        <div
            class="px-6 py-4 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-3xl flex flex-col items-center">
            <div class="relative w-16 h-16 mb-2">
                <div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                <div
                    class="relative w-full h-full bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30">
                    <span class="text-2xl">🖐️</span>
                </div>
            </div>
            <p class="text-[9px] font-bold text-white/50 text-center uppercase">{{ t('studio.accessibility.translating')
                }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useTranslations } from '@/composables/useTranslations';

defineProps<{
    enabled: boolean;
}>();

const { t } = useTranslations();
</script>
