<template>
    <div class="cinematic-settings p-4 space-y-6">
        <div class="section-header flex items-center justify-between">
            <div class="flex items-center gap-2">
                <magic theme="outline" size="18" class="text-blue-400" />
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Cinematic Studio</h3>
            </div>
            <el-switch 
                v-model="studioStore.visualSettings.cinematic.enabled"
                active-color="#3b82f6"
            />
        </div>

        <p class="text-[10px] text-white/40 leading-relaxed italic">
            Enable immersive rendering to place all AI agents in a unified high-fidelity environment.
        </p>

        <div v-if="studioStore.visualSettings.cinematic.enabled" class="space-y-4 animate-fade-in">
            <!-- Environment Selection -->
            <div class="space-y-2">
                <label class="text-[10px] font-bold text-white/60 uppercase">Active Environment</label>
                <div class="grid grid-cols-2 gap-2">
                    <div 
                        v-for="env in environments" 
                        :key="env.id"
                        class="env-card glass-selectable p-2 rounded-xl border transition-all cursor-pointer"
                        :class="studioStore.visualSettings.cinematic.environmentId === env.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 hover:border-white/20'"
                        @click="studioStore.visualSettings.cinematic.environmentId = env.id"
                    >
                        <div class="aspect-video rounded-lg overflow-hidden mb-2 bg-black/40">
                            <img :src="getFileUrl(env.backgroundUrl)" class="w-full h-full object-cover" />
                        </div>
                        <span class="text-[10px] font-bold block text-center truncate">{{ env.name }}</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-white/60 uppercase">Auto Camera (AI Director)</span>
                <el-switch v-model="studioStore.autoCameraEnabled" size="small" active-color="#10b981" />
            </div>

            <div class="vfx-status flex items-center gap-2 px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" :class="{ 'bg-green-500': studioStore.autoCameraEnabled }"></div>
                <span class="text-[9px] font-mono text-blue-400 uppercase tracking-tighter" :class="{ 'text-green-400': studioStore.autoCameraEnabled }">
                    PROD: {{ studioStore.autoCameraEnabled ? 'AUTO-PRODUCING' : 'VFX ACTIVE' }}
                </span>
            </div>

            <!-- VFX Controls -->
            <div class="space-y-4 pt-4 border-t border-white/5">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-white/60 uppercase">VTuber Link Visuals</span>
                    <el-switch v-model="studioStore.visualSettings.cinematic.showVTuberLinks" size="small" />
                </div>
                
                <div class="vfx-status flex items-center gap-2 px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span class="text-[9px] font-mono text-blue-400 uppercase tracking-tighter">
                        Active VFX: {{ currentEnv?.vfx.particles || 'None' }} 
                        {{ currentEnv?.vfx.bloom ? '+ Bloom' : '' }}
                    </span>
                </div>
            </div>
        </div>

        <div v-else class="empty-state py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
            <video-two theme="outline" size="24" class="text-white/10 mb-2 mx-auto" />
            <span class="text-[10px] text-white/20">Immersive Stage Disabled</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Magic, VideoTwo } from '@icon-park/vue-next';
import { STUDIO_ENVIRONMENTS } from '@/constants/StudioEnvironments';
import { getFileUrl } from '@/utils/api';

const studioStore = useStudioStore();
const environments = computed(() => Object.values(STUDIO_ENVIRONMENTS));
const currentEnv = computed(() => STUDIO_ENVIRONMENTS[studioStore.visualSettings.cinematic.environmentId]);
</script>

<style scoped lang="scss">
.env-card {
    &:hover img {
        transform: scale(1.1);
    }
    img {
        transition: transform 0.5s ease;
    }
}

.glass-selectable {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
