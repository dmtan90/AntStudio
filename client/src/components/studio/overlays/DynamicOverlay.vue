<template>
    <transition name="fade">
        <div v-if="visible" class="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <!-- Content Wrapper -->
            <div class="dynamic-content relative p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-black/60 max-w-4xl w-full mx-8 animate-slide-up" :class="contentClass">
                
                <!-- Header -->
                <div v-if="title || subtitle" class="mb-6 text-center">
                    <h2 v-if="title" class="text-3xl font-bold text-white mb-2 tracking-tight">{{ title }}</h2>
                    <p v-if="subtitle" class="text-white/60 text-lg">{{ subtitle }}</p>
                </div>

                <!-- Type: Key Metric / Stat Card -->
                <div v-if="type === 'stat_card'" class="text-center py-8">
                    <div class="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2 animate-pulse-subtle">
                        {{ data.value }}
                    </div>
                    <div class="text-xl text-white/80 uppercase tracking-widest font-bold">{{ data.label }}</div>
                    <div v-if="data.trend" class="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span :class="data.trend > 0 ? 'text-green-400' : 'text-red-400'">
                            {{ data.trend > 0 ? '▲' : '▼' }} {{ Math.abs(data.trend) }}%
                        </span>
                        <span class="text-white/40 text-sm">vs last avg</span>
                    </div>
                </div>

                <!-- Type: Data Table -->
                <div v-else-if="type === 'table'" class="overflow-hidden rounded-xl border border-white/5">
                    <table class="w-full text-left">
                        <thead class="bg-white/5 text-white/60 uppercase text-xs">
                            <tr>
                                <th v-for="col in data.columns" :key="col" class="p-4 font-bold tracking-wider">{{ col }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <tr v-for="(row, i) in data.rows" :key="i" class="hover:bg-white/5 transition-colors">
                                <td v-for="(cell, j) in row" :key="j" class="p-4 text-white font-medium">
                                    {{ cell }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Type: Chart (Placeholder for now, can perform real charting later) -->
                <div v-else-if="type === 'chart'" class="h-64 flex items-end justify-between gap-2 px-4 pb-4 bg-white/5 rounded-xl border border-white/5 relative">
                     <!-- Simple CSS Bar Chart -->
                     <div v-for="(point, i) in data.points" :key="i" class="flex-1 flex flex-col justify-end group">
                        <div class="w-full bg-blue-500/50 rounded-t-sm group-hover:bg-blue-400 transition-all relative" :style="{ height: point.value + '%' }">
                            <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">{{ point.value }}</span>
                        </div>
                        <span class="text-[10px] text-white/40 text-center mt-2 truncate">{{ point.label }}</span>
                     </div>
                </div>

                <!-- Type: Media -->
                <div v-else-if="type === 'media'" class="aspect-video rounded-xl overflow-hidden bg-black relative">
                    <img v-if="data.mediaType === 'image'" :src="data.url" class="w-full h-full object-cover" />
                    <video v-else-if="data.mediaType === 'video'" :src="data.url" autoplay loop muted class="w-full h-full object-cover"></video>
                </div>

            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    visible: boolean;
    type: 'stat_card' | 'table' | 'chart' | 'media' | null;
    title?: string;
    subtitle?: string;
    data: any;
}>();

const contentClass = computed(() => {
    switch (props.type) {
        case 'stat_card': return 'border-blue-500/30 bg-gradient-to-b from-blue-900/80 to-black/90';
        case 'media': return 'p-0 overflow-hidden'; // No padding for media
        default: return '';
    }
});
</script>

<style scoped>
.animate-slide-up {
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-pulse-subtle {
    animation: pulseSubtle 3s infinite ease-in-out;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes pulseSubtle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(0.98); }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
