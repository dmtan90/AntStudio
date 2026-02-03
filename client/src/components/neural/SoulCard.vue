<template>
    <div class="archive-card glass-card p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden"
        @click="$emit('click')">

        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500/40 opacity-0 group-hover:opacity-100 transition-all">
        </div>

        <div class="flex justify-between items-start mb-6">
            <div
                class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                <brain theme="outline" size="32" class="text-blue-400" />
            </div>
            <div class="text-right">
                <span class="text-[8px] font-black uppercase opacity-40">Sync Status</span>
                <p class="text-[10px] font-bold text-green-400 flex items-center justify-end gap-1">
                <div class="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div> PERSISTENT
                </p>
            </div>
        </div>

        <h3 class="text-xl font-black mb-1">{{ archive.identity.name }}</h3>
        <p class="text-xs opacity-60 line-clamp-2 mb-4">{{ archive.identity.description || 'No neural description
            registered.' }}</p>

        <div class="flex gap-2 mb-6 flex-wrap">
            <span v-for="trait in archive.identity.traits" :key="trait"
                class="px-2 py-0.5 bg-black/40 border border-white/5 rounded text-[8px] font-black uppercase opacity-60">{{
                    trait }}</span>
        </div>

        <div class="stats-grid grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
            <div>
                <p class="text-[8px] font-black opacity-30 uppercase">Neural Memory</p>
                <p class="text-xs font-bold">{{ archive.memory.summaries.length }} Sessions</p>
            </div>
            <div>
                <p class="text-[8px] font-black opacity-30 uppercase">Style Weights</p>
                <p class="text-xs font-bold">{{ archive.customization.loras.length }} LoRAs</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Brain } from '@icon-park/vue-next';

defineProps<{
    archive: any;
}>();

defineEmits(['click']);
</script>

<style lang="scss" scoped>
.archive-card {
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);

    &:hover {
        background: rgba(255, 255, 255, 0.04);
        transform: translateY(-4px);
    }
}
</style>
