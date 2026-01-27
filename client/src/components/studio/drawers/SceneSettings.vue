<template>
    <div class="scene-settings flex flex-col gap-6 animate-in">
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">SWITCHER_CORE</h4>
            <div class="grid grid-cols-1 gap-3">
                <div v-for="s in scenes" :key="s.id"
                    class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer transition-all"
                    :class="{ 'border-blue-500 bg-blue-500/10': activeScene === s.id }"
                    @click="$emit('update:activeScene', s.id)">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                            <broadcast theme="outline" size="18" :class="{ 'text-blue-400': activeScene === s.id }" />
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest">{{ s.name }}</p>
                            <p class="text-[8px] opacity-30 uppercase font-black">Multi-Cam Layout</p>
                        </div>
                    </div>
                    <div v-if="activeScene === s.id" class="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#3b82f6]">
                    </div>
                </div>
            </div>
        </section>

        <section class="p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-center">
            <div class="icon-orb mb-3 mx-auto bg-blue-500/20 text-blue-400">
                <magic theme="outline" size="20" />
            </div>
            <p class="text-[10px] items-center font-bold mb-1">AI Smart-Switching</p>
            <p class="text-[9px] opacity-40 leading-relaxed">Let God Mode handle camera angles based on who is speaking.
            </p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { Broadcast, Magic } from '@icon-park/vue-next';

defineProps<{
    activeScene: string;
    scenes: any[];
}>();

defineEmits(['update:activeScene']);
</script>
