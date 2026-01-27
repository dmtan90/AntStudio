<template>
    <div class="ai-persona-settings flex flex-col gap-6 animate-in">
        <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Neural Personas</h4>
        <div class="grid grid-cols-1 gap-4">
            <div v-for="g in personas" :key="g.id"
                class="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer transition-all"
                @click="$emit('summon-guest', g)">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <el-avatar :src="g.avatarUrl" :size="48"
                            class="border-2 border-white/10 group-hover:border-blue-500/50 transition-all" />
                        <div v-if="g.active"
                            class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                            <check theme="outline" size="8" fill="#000" />
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-black uppercase tracking-widest">{{ g.name }}</p>
                        <p class="text-[9px] opacity-40 italic">{{ g.personality || 'Synthetic Intelligence' }}</p>
                    </div>
                </div>
                <el-switch v-model="g.active" @change="$emit('toggle-guest', g)" @click.stop />
            </div>
        </div>

        <section
            class="mt-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-white/10">
            <div class="flex items-center gap-3 mb-4">
                <magic theme="outline" size="20" class="text-blue-400" />
                <h4 class="text-xs font-black uppercase tracking-widest">Auto-Guest Logic</h4>
            </div>
            <p class="text-[10px] opacity-40 leading-relaxed">When enabled, the AI Director will automatically summon
                personas to fill quiet moments or debate specific chat topics.</p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { Check, Magic } from '@icon-park/vue-next';

defineProps<{
    personas: any[];
}>();

defineEmits(['summon-guest', 'toggle-guest']);
</script>
