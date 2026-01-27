<template>
    <div class="audience-crowd p-4 cinematic-card">
        <div class="header mb-4 flex justify-between items-center">
            <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <peoples theme="outline" size="14" fill="#3b82f6" />
                Neural Presence Grid
            </h3>
            <span class="text-[10px] font-bold opacity-30">{{ vips.length }} VIPs Present</span>
        </div>

        <!-- 3D Seating Grid -->
        <div
            class="grid grid-cols-4 gap-4 aspect-video bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
            <div v-for="vip in vips" :key="vip.id"
                class="seat flex flex-col items-center justify-center group cursor-pointer">
                <div
                    class="avatar-pod w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 relative flex items-center justify-center overflow-hidden group-hover:border-blue-500 transition-all">
                    <!-- Neural Avatar Visualization Placeholder -->
                    <div class="w-full h-full bg-gradient-to-t from-blue-600/20 to-transparent"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <user-icon theme="outline" size="20" class="opacity-40 group-hover:opacity-100" />
                    </div>

                    <!-- Reaction Indicator -->
                    <div v-if="vip.isCheering" class="absolute -top-1 -right-1">
                        <div
                            class="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-yellow-400/50">
                            <fire theme="outline" size="10" fill="#000" />
                        </div>
                    </div>
                </div>
                <span class="text-[8px] font-black mt-1 opacity-40 uppercase truncate w-full text-center">{{ vip.name
                    }}</span>
            </div>

            <!-- Ambient Particle Layer (Immersive) -->
            <div class="absolute inset-0 pointer-events-none opacity-20">
                <div class="scanning-beam"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Peoples, User as UserIcon, Fire } from '@icon-park/vue-next';

// Mock list of connected VIPs
const vips = ref([
    { id: '1', name: 'Alpha_Streamer', isCheering: false },
    { id: '2', name: 'Neural_Knight', isCheering: true },
    { id: '3', name: 'Vibe_Master', isCheering: false },
    { id: '4', name: 'Pixel_Prophet', isCheering: false },
    { id: '5', name: 'Core_Drift', isCheering: false },
    { id: '6', name: 'Hype_Engine', isCheering: true },
    { id: '7', name: 'Data_Ghost', isCheering: false },
    { id: '8', name: 'Synth_Soul', isCheering: false }
]);

/**
 * Triggers a crowd cheer animation for all currently active avatars.
 */
const triggerCrowdCheer = () => {
    vips.value.forEach(v => v.isCheering = true);
    setTimeout(() => vips.value.forEach(v => v.isCheering = false), 5000);
};

onMounted(() => {
    // Listen for socket events to trigger crowd reactions
});
</script>

<style scoped lang="scss">
.audience-crowd {
    .scanning-beam {
        position: absolute;
        width: 200%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #3b82f6, transparent);
        top: 50%;
        left: -50%;
        animation: scan 4s linear infinite;
    }
}

@keyframes scan {
    from {
        transform: translateY(-100px) rotate(15deg);
    }

    to {
        transform: translateY(100px) rotate(15deg);
    }
}
</style>
