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
                    <div class="flex items-center gap-2">
                        <!-- Role Toggle -->
                        <button 
                            @click.stop="$emit('toggle-role', g.id)"
                            class="px-2 py-1 rounded-md text-[8px] font-black tracking-widest transition-all border border-white/5"
                            :class="g.isMaster ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-white/40 hover:text-white'"
                        >
                            {{ g.isMaster ? 'MASTER' : 'AGENT' }}
                        </button>
                        <el-switch v-model="g.active" @change="$emit('toggle-guest', g)" @click.stop />
                    </div>
                </div>

                    <!-- Interaction controls for active guests -->
                    <div v-if="g.active" class="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1" @click.stop>
                        <div class="flex items-center justify-between">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Expression</span>
                            <div class="flex gap-1">
                                <span v-if="g.emotion" class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[8px] font-bold uppercase">{{ g.emotion }}</span>
                                <span v-if="g.gesture" class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[8px] font-bold uppercase">{{ g.gesture }}</span>
                            </div>
                        </div>

                        <!-- Quick Emotions -->
                        <div class="space-y-2">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Quick Emotions</span>
                            <div class="flex gap-1.5 flex-wrap">
                                <button v-for="emotion in ['happy', 'sad', 'surprised', 'neutral', 'thinking']" :key="emotion"
                                    @click="setEmotion(g.id, emotion)"
                                    class="px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase transition-all"
                                    :class="g.emotion === emotion ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'"
                                >
                                    {{ emotion }}
                                </button>
                            </div>
                        </div>

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
                            <button
                                v-if="g.customization?.voiceConfig?.provider === 'gemini'"
                                class="w-10 py-2 border border-blue-500/30 rounded-xl flex items-center justify-center transition-all"
                                :class="g.isLiveVoiceActive ? 'bg-blue-500 text-black animate-pulse' : 'bg-transparent text-blue-400 hover:bg-blue-500/20'"
                                @click="$emit('toggle-live-voice', g)"
                                title="Live Voice Chat"
                            >
                                <microphone theme="outline" size="14" />
                            </button>
                            <button
                                v-if="g.isLiveVoiceActive"
                                class="w-10 py-2 border border-purple-500/30 rounded-xl flex items-center justify-center transition-all"
                                :class="g.isVisionActive ? 'bg-purple-500 text-black' : 'bg-transparent text-purple-400 hover:bg-purple-500/20'"
                                @click="$emit('toggle-vision', g)"
                                title="Enable Studio Vision"
                            >
                                <preview-open theme="outline" size="14" />
                            </button>
                        </div>

                        <!-- Animation Controls -->
                        <div v-if="g.animationConfig" class="space-y-2 p-3 rounded-2xl bg-black/20 border border-white/5">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Animation Intensity</span>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-[8px] opacity-40">Gesture</span>
                                    <el-slider v-model="g.animationConfig.gestureIntensity" :min="0" :max="2" :step="0.1" 
                                               class="w-32" size="small" @change="updateAnimation(g.id, g.animationConfig)" />
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[8px] opacity-40">Tilt</span>
                                    <el-slider v-model="g.animationConfig.headTiltRange" :min="0" :max="2" :step="0.1" 
                                               class="w-32" size="small" @change="updateAnimation(g.id, g.animationConfig)" />
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[8px] opacity-40">Nod</span>
                                    <el-slider v-model="g.animationConfig.nodIntensity" :min="0" :max="2" :step="0.1" 
                                               class="w-32" size="small" @change="updateAnimation(g.id, g.animationConfig)" />
                                </div>
                            </div>
                        </div>

                        <!-- Performance Effects -->
                        <div v-if="g.performanceConfig" class="space-y-2 p-3 rounded-2xl bg-black/20 border border-white/5">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Performance FX</span>
                            
                            <div class="flex items-center justify-between">
                                <span class="text-[8px] opacity-40">Aura</span>
                                <div class="flex items-center gap-2">
                                    <el-color-picker v-model="g.performanceConfig.auraColor" size="small" />
                                    <el-switch v-model="g.performanceConfig.auraEnabled" size="small" 
                                               @change="updatePerformance(g.id, g.performanceConfig)" />
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between">
                                <span class="text-[8px] opacity-40">Particles</span>
                                <el-select v-model="g.performanceConfig.particleType" size="small" class="w-32"
                                           @change="updatePerformance(g.id, g.performanceConfig)">
                                    <el-option label="None" :value="null" />
                                    <el-option label="Sakura" value="sakura" />
                                    <el-option label="Snow" value="snow" />
                                    <el-option label="Glitter" value="glitter" />
                                </el-select>
                            </div>
                            
                            <div class="flex items-center justify-between">
                                <span class="text-[8px] opacity-40">Lighting</span>
                                <el-select v-model="g.performanceConfig.lightingPreset" size="small" class="w-32"
                                           @change="updatePerformance(g.id, g.performanceConfig)">
                                    <el-option label="Studio" value="studio" />
                                    <el-option label="Neon" value="neon" />
                                    <el-option label="Dramatic" value="dramatic" />
                                    <el-option label="Vocal Orange" value="vocal_orange" />
                                </el-select>
                            </div>
                        </div>

                        <!-- Music Performance (Phase 85) -->
                        <div class="space-y-2 p-3 rounded-2xl bg-black/20 border border-white/5">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">🎤 Music Performance</span>
                                <button
                                    @click="openMusicSelector(g.id)"
                                    class="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-[8px] font-bold uppercase transition-all flex items-center gap-1"
                                >
                                    <music theme="outline" size="12" />
                                    SELECT SONG
                                </button>
                            </div>
                            
                            <!-- Current Song Display -->
                            <div v-if="g.performanceConfig?.backgroundMusic" class="p-2 bg-white/5 rounded-lg">
                                <div class="flex items-center gap-2">
                                    <img :src="g.performanceConfig.backgroundMusic.thumbnail" class="w-10 h-10 rounded object-cover" />
                                    <div class="flex-1 overflow-hidden">
                                        <div class="text-[9px] font-bold truncate">{{ g.performanceConfig.backgroundMusic.title }}</div>
                                        <div class="text-[7px] opacity-40 truncate">{{ g.performanceConfig.backgroundMusic.artist || 'Unknown Artist' }}</div>
                                    </div>
                                    <button
                                        @click="startPerformance(g.id)"
                                        class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-[8px] font-black uppercase transition-all shadow-lg"
                                    >
                                        PERFORM
                                    </button>
                                </div>
                            </div>
                            <div v-else class="text-[8px] opacity-30 text-center py-2">
                                No song selected
                            </div>
                        </div>

                        <!-- Background Quick Switch -->
                        <div v-if="g.visual" class="space-y-2">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Background</span>
                            <div class="grid grid-cols-4 gap-1.5">
                                <div v-for="bg in backgroundPresets" :key="bg.url"
                                     @click="setBackground(g.id, bg.url)"
                                     class="aspect-square rounded-lg border-2 cursor-pointer transition-all overflow-hidden hover:scale-105"
                                     :class="g.visual.backgroundUrl === bg.url ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 hover:border-white/30'"
                                >
                                    <img :src="bg.url" class="w-full h-full object-cover" :alt="bg.name" />
                                </div>
                            </div>
                        </div>

                        <!-- Manual Puppeteering -->
                        <div class="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-black/20 border border-white/5">
                            <button v-for="gest in ['wave', 'nod', 'shake_head', 'point_left', 'point_right']" :key="gest"
                                class="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-all text-sm"
                                @click="manualGesture(g.id, gest)" :title="gest">
                                <span v-if="gest === 'wave'">👋</span>
                                <span v-else-if="gest === 'nod'">👍</span>
                                <span v-else-if="gest === 'shake_head'">👎</span>
                                <span v-else-if="gest === 'point_left'">👈</span>
                                <span v-else-if="gest === 'point_right'">👉</span>
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
                <magic theme="outline" size="20" class="text-purple-400" />
                <h4 class="text-xs font-black uppercase tracking-widest">Auto-Guest Logic</h4>
            </div>
            <p class="text-[10px] opacity-40 leading-relaxed">When enabled, the AI Director will automatically summon
                personas to fill quiet moments or debate specific chat topics.</p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Check, Magic, Send, Microphone, PreviewOpen, Music } from '@icon-park/vue-next';

defineProps<{
    personas: any[];
}>();

const emit = defineEmits([
    'summon-guest', 'toggle-guest', 'talk-guest', 'manual-gesture', 
    'toggle-live-voice', 'toggle-vision', 'toggle-role',
    'set-emotion', 'update-animation', 'update-performance', 'set-background',
    'open-music-selector', 'start-performance'
]);

const customPrompts = reactive<Record<string, string>>({});

const backgroundPresets = [
    { name: 'Studio', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200' },
    { name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200' },
    { name: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200' },
    { name: 'Abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200' }
];

const sendCustomPrompt = (id: string) => {
    const prompt = customPrompts[id];
    if (!prompt) return;

    emit('talk-guest', { id, prompt });
    customPrompts[id] = '';
};

const manualGesture = (id: string, gesture: string) => {
    emit('manual-gesture', { id, gesture });
};

const setEmotion = (id: string, emotion: string) => {
    emit('set-emotion', { id, emotion });
};

const updateAnimation = (id: string, config: any) => {
    emit('update-animation', { id, config });
};

const updatePerformance = (id: string, config: any) => {
    emit('update-performance', { id, config });
};

const setBackground = (id: string, url: string) => {
    emit('set-background', { id, url });
};

const openMusicSelector = (id: string) => {
    emit('open-music-selector', id);
};

const startPerformance = (id: string) => {
    emit('start-performance', id);
};
</script>
