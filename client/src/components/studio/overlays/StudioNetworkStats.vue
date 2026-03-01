<template>
    <div v-if="isLive && stats"
        class="absolute top-8 right-8 flex flex-col items-end gap-2 z-30 animate-in pointer-events-none">
        <div
            class="px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center gap-4 shadow-2xl">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full animate-pulse"
                    :class="stats.rtt > 150 ? 'bg-red-500' : 'bg-green-500'"></div>
                <div class="flex flex-col">
                    <span class="text-[10px] uppercase font-black tracking-widest text-white/40 leading-none mb-1">{{
                        t('studio.stats.connection') }}</span>
                    <span class="text-xs font-black" :class="stats.rtt > 150 ? 'text-red-400' : 'text-green-400'">
                        {{ stats.rtt > 150 ? t('studio.stats.unstable') : t('studio.stats.stable') }}
                    </span>
                </div>
            </div>
        </div>

        <div class="flex gap-2">
            <div v-if="realChatVelocity > 0"
                class="px-3 py-2 bg-orange-500/10 backdrop-blur-md border border-orange-500/20 rounded-2xl flex flex-col items-center min-w-[70px]">
                <span
                    class="text-[8px] font-black text-orange-400/60 uppercase tracking-tighter leading-none mb-1">VIRAL</span>
                <span class="text-[11px] font-black text-orange-400">{{ realChatVelocity }} msg/m</span>
            </div>

            <div
                class="px-3 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col items-center min-w-[70px]">
                <span
                    class="text-[8px] font-black text-white/40 uppercase tracking-tighter leading-none mb-1">BITRATE</span>
                <span class="text-[11px] font-black text-blue-400">{{ stats.bitrate }}k</span>
            </div>

            <div v-if="sessionInfra"
                class="px-3 py-2 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-2xl flex flex-col items-center min-w-[70px]">
                <span
                    class="text-[8px] font-black text-blue-400/60 uppercase tracking-tighter leading-none mb-1">PING</span>
                <span class="text-[11px] font-black" :class="stats.rtt > 100 ? 'text-yellow-400' : 'text-white'">{{
                    stats.rtt }}ms</span>
            </div>
        </div>

        <div v-if="stats.rtt > 100 && quality !== 'low'" class="animate-bounce-in">
            <div class="px-4 py-2 bg-yellow-500/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                    <span class="text-lg">⚠️</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-black leading-tight">Switching to <span
                            class="text-yellow-400 font-black">Low Quality</span> is recommended.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    isLive: boolean;
    stats: any;
    realChatVelocity: number;
    sessionInfra: any;
    quality: string;
}>();

const { t } = useI18n()
</script>
