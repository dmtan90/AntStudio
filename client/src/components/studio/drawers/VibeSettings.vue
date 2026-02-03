<template>
    <div class="vibe-settings flex flex-col gap-8 animate-in">
        <!-- Atmosphere Visualizer -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">ATMOSPHERE_CORE</h4>
            <div
                class="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 text-center mb-4 relative overflow-hidden">
                <div class="absolute inset-0 opacity-20 pointer-events-none">
                    <div class="vibe-waves"></div>
                </div>
                <p class="text-[10px] font-black opacity-40 uppercase mb-2 relative z-10">Current State</p>
                <p
                    class="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 relative z-10">
                    {{ vibeName }}
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p class="text-[8px] font-black opacity-30 uppercase">Intensity</p>
                    <div class="flex items-end gap-2">
                        <p class="text-xl font-black">{{ Math.round(vibeScore) }}</p>
                        <div class="w-full h-1 bg-white/10 rounded-full mb-2">
                            <div class="h-full bg-blue-500" :style="{ width: vibeScore + '%' }"></div>
                        </div>
                    </div>
                </div>
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p class="text-[8px] font-black opacity-30 uppercase">Positivity</p>
                    <p class="text-xl font-black text-green-400">84%</p>
                </div>
            </div>
        </section>

        <!-- Adaptive Orchestration -->
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">NEURAL_ADAPTATION</h4>
                <el-switch v-model="localAutoAtmosphere"
                    @change="$emit('update:autoAtmosphere', localAutoAtmosphere)" />
            </div>

            <div class="space-y-3">
                <div
                    class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 group hover:border-blue-500/30 cursor-pointer transition-all">
                    <music-list theme="outline" size="16" class="opacity-40 group-hover:text-blue-400" />
                    <div class="flex-1">
                        <p class="text-[10px] font-bold">Dynamic Music FX</p>
                        <p class="text-[9px] opacity-40">Syncing beats to chat energy ({{ localAutoAtmosphere ? 'ACTIVE'
                            :
                            'PAUSED' }})</p>
                    </div>
                </div>

                <div v-if="localAutoAtmosphere" class="animate-in">
                    <div class="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                        <p class="text-[9px] font-black uppercase tracking-widest opacity-60">
                            SENTIMENT_TRACKING_IN_PROGRESS</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Environment Presets -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">ATMOSPHERE_PRESETS</h4>
            <div class="grid grid-cols-2 gap-2">
                <button v-for="p in ['Cinematic', 'Vibrant', 'Muted', 'Cyberpunk']" :key="p"
                    class="py-2 px-3 rounded-xl border border-white/5 bg-white/5 text-[9px] font-black uppercase hover:border-blue-500/30 transition-all"
                    :class="{ 'border-blue-500/50 bg-blue-500/10 text-blue-400': vibeName.includes(p) }">
                    {{ p }}
                </button>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { MusicList } from '@icon-park/vue-next';

const props = defineProps<{
    vibeName: string;
    vibeScore: number;
    autoAtmosphere: boolean;
}>();

const emit = defineEmits(['update:autoAtmosphere']);

const localAutoAtmosphere = ref(props.autoAtmosphere);
watch(() => props.autoAtmosphere, (val) => localAutoAtmosphere.value = val);
</script>

<style scoped lang="scss">
.vibe-waves {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: conic-gradient(from 0deg, transparent, #3b82f6, transparent);
    animation: rotate 10s linear infinite;
    transform: translate(-50%, -50%);
}

@keyframes rotate {
    from {
        transform: translate(-50%, -50%) rotate(0deg);
    }

    to {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}
</style>
