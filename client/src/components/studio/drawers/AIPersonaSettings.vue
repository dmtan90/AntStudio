<template>
    <div class="ai-persona-settings flex flex-col gap-6 animate-in">
        <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Neural Personas</h4>
        <div class="grid grid-cols-1 gap-4">
            <div v-for="g in personas" :key="g.id"
                class="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-4 group hover:border-blue-500/30 cursor-pointer transition-all"
                @click="$emit('summon-guest', g)">
                <div class="flex items-center justify-between">
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

                <!-- Interaction controls for active guests -->
                <div v-if="g.active" class="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1" @click.stop>
                    <div class="flex gap-2">
                        <button
                            class="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            @click="$emit('talk-guest', { id: g.id, prompt: 'Introduce yourself to the audience' })">
                            Introduce
                        </button>
                        <button
                            class="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            @click="$emit('talk-guest', { id: g.id, prompt: 'React to the current vibe' })">
                            React
                        </button>
                    </div>

                    <!-- Custom Prompt Input -->
                    <div class="relative flex items-center bg-white/5 rounded-2xl border border-white/5 p-1">
                        <input v-model="customPrompts[g.id]" type="text"
                            class="bg-transparent border-none text-[10px] text-white px-3 py-1.5 focus:ring-0 w-full placeholder:opacity-20"
                            placeholder="Type a message..." @keydown.enter="sendCustomPrompt(g.id)" />
                        <button
                            class="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-400 text-black transition-all"
                            :disabled="!customPrompts[g.id]" @click="sendCustomPrompt(g.id)">
                            <send theme="outline" size="14" />
                        </button>
                    </div>
                </div>
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
import { ref, reactive } from 'vue';
import { Check, Magic, Send } from '@icon-park/vue-next';

defineProps<{
    personas: any[];
}>();

const emit = defineEmits(['summon-guest', 'toggle-guest', 'talk-guest']);

const customPrompts = reactive<Record<string, string>>({});

const sendCustomPrompt = (id: string) => {
    const prompt = customPrompts[id];
    if (!prompt) return;

    emit('talk-guest', { id, prompt });
    customPrompts[id] = '';
};
</script>
