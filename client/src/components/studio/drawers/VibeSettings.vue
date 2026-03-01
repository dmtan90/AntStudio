<template>
    <div class="vibe-settings flex flex-col gap-8 animate-in">
        <!-- Atmosphere Visualizer -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.vibe.atmosphereCore') }}</h4>
            <div
                class="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 text-center mb-4 relative overflow-hidden">
                <div class="absolute inset-0 opacity-20 pointer-events-none">
                    <div class="vibe-waves"></div>
                </div>
                <p class="text-[10px] font-black opacity-40 uppercase mb-2 relative z-10">{{ $t('studio.drawers.vibe.currentState') }}</p>
                <p
                    class="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 relative z-10">
                    {{ vibeName }}
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p class="text-[8px] font-black opacity-30 uppercase">{{ $t('studio.common.intensity') }}</p>
                    <div class="flex items-end gap-2">
                        <p class="text-xl font-black">{{ Math.round(vibeScore) }}</p>
                        <div class="w-full h-1 bg-white/10 rounded-full mb-2">
                            <div class="h-full bg-blue-500" :style="{ width: vibeScore + '%' }"></div>
                        </div>
                    </div>
                </div>
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p class="text-[8px] font-black opacity-30 uppercase">{{ $t('studio.common.positivity') }}</p>
                    <p class="text-xl font-black text-green-400">84%</p>
                </div>
            </div>
        </section>

        <!-- Adaptive Orchestration -->
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">{{ $t('studio.drawers.vibe.neuralAdaptation') }}</h4>
                <el-switch v-model="localAutoAtmosphere"
                    @change="$emit('update:autoAtmosphere', localAutoAtmosphere)" />
            </div>

            <div class="space-y-3">
                <div
                    class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 group hover:border-blue-500/30 cursor-pointer transition-all">
                    <music-list theme="outline" size="16" class="opacity-40 group-hover:text-blue-400" />
                    <div class="flex-1">
                        <p class="text-[10px] font-bold">{{ $t('studio.drawers.vibe.dynamicMusic') }}</p>
                        <p class="text-[9px] opacity-40">{{ $t('studio.drawers.vibe.musicSyncDesc', { status: localAutoAtmosphere ? $t('studio.common.active') : $t('studio.common.paused') }) }}</p>
                    </div>
                </div>

                <div v-if="localAutoAtmosphere" class="animate-in">
                    <div class="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                        <p class="text-[9px] font-black uppercase tracking-widest opacity-60">
                            {{ $t('studio.drawers.vibe.trackingInProgress') }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Environment Presets -->
        <StudioSection :title="$t('studio.drawers.vibe.scenePresets')">
            <div class="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl">
                <button 
                    class="flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                    :class="activeTab === 'classic' ? 'bg-white/10 text-white' : 'opacity-40 hover:opacity-60'"
                    @click="activeTab = 'classic'"
                >{{ $t('studio.drawers.vibe.tabs.classic') }}</button>
                <button 
                    class="flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                    :class="activeTab === 'pano' ? 'bg-blue-500/20 text-blue-400' : 'opacity-40 hover:opacity-60'"
                    @click="activeTab = 'pano'"
                >{{ $t('studio.drawers.vibe.tabs.pano') }}</button>
            </div>

            <div v-if="activeTab === 'classic'" class="grid grid-cols-2 gap-2">
                <StudioVibeCard 
                    v-for="p in scenePresets" 
                    :key="p.name"
                    :name="$t(`studio.drawers.vibe.presets.${p.name}`)"
                    :description="$t('studio.drawers.vibe.moodDesc', { mood: p.mood })"
                    :icon="p.icon"
                    :color="p.color"
                    :active="currentPreset === p.name"
                    compact
                    @select="applyPreset(p)"
                />
            </div>

            <div v-else class="pano-grid grid grid-cols-2 gap-2">
                <div v-for="p in panoPresets" :key="p.name"
                    @click="applyPano(p)"
                    class="pano-card relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02]"
                    :class="currentPreset === p.name ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/5 opacity-60 hover:opacity-100'"
                >
                    <img :src="p.bg" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                        <span class="text-[8px] font-black uppercase tracking-widest">{{ $t(`studio.drawers.vibe.presets.${p.name}`) }}</span>
                    </div>
                    <div v-if="currentPreset === p.name" class="absolute top-2 right-2">
                        <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </StudioSection>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { MusicList, Tea, CupOne, Fire, Moon } from '@icon-park/vue-next';
import StudioSection from '../shared/StudioSection.vue';
import StudioVibeCard from '../shared/StudioVibeCard.vue';

const props = defineProps<{
    vibeName: string;
    vibeScore: number;
    autoAtmosphere: boolean;
}>();

const emit = defineEmits(['update:autoAtmosphere', 'apply-preset']);

const localAutoAtmosphere = ref(props.autoAtmosphere);
watch(() => props.autoAtmosphere, (val) => localAutoAtmosphere.value = val);

const currentPreset = ref('');
const scenePresets = [
    { name: 'Late Night Talk', mood: 'noir', bg: '/bg/late-night-talk.jpg', icon: Moon, color: 'purple' },
    { name: 'Morning Vibes', mood: 'dreamy', bg: '/bg/morning-vibes.jpg', icon: Tea, color: 'yellow' },
    { name: 'Cyberpunk Stream', mood: 'cyberpunk', bg: '/bg/cyberpunk-stream.jpg', icon: CupOne, color: 'pink' },
    { name: 'Cozy Fireside', mood: 'sepia', bg: '/bg/cozy-fireside.jpg', icon: Fire, color: 'orange' }
];

const applyPreset = (p: any) => {
    currentPreset.value = p.name;
    emit('apply-preset', { ...p, is360: false });
};

const activeTab = ref('classic');
const panoPresets = [
    { name: 'Nebula Void', bg: '/bg/nebula-void.jpg', mood: 'cosmic' },
    { name: 'Digital Forest', bg: '/bg/digital-forest.jpg', mood: 'lush' },
    { name: 'Neon City Peak', bg: '/bg/neon-city-peak.jpg', mood: 'cyberpunk' },
    { name: 'Minimal Stage', bg: '/bg/minimal-stage.jpg', mood: 'clean' }
];

const applyPano = (p: any) => {
    currentPreset.value = p.name;
    emit('apply-preset', { ...p, is360: true });
};
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
