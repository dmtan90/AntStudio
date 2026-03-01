<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Lightning } from '@icon-park/vue-next';

const studioStore = useStudioStore();
const timeLeft = ref('');
let timerInterval: any = null;

const updateTimer = () => {
    if (!studioStore.activeFlashSale) return;
    
    const now = Date.now();
    // Support both numeric epoch and ISO string formats safely
    const expires = +new Date(studioStore.activeFlashSale.expiresAt);
    if (isNaN(expires)) {
        timeLeft.value = '00:00';
        return;
    }
    const diff = expires - now;
    
    if (diff <= 0) {
        studioStore.endFlashSale();
        return;
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timeLeft.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

onMounted(() => {
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
});

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
});

const isUrgent = computed(() => {
    if (!timeLeft.value) return false;
    const [m, s] = timeLeft.value.split(':').map(Number);
    return m === 0 && s < 30;
});
</script>

<template>
    <Transition name="expand">
        <div v-if="studioStore.activeFlashSale" class="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div 
                class="px-8 py-3 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.4)] border border-white/20 flex items-center gap-6 overflow-hidden relative"
                :class="{ 'animate-pulse scale-110': isUrgent }"
            >
                <!-- Animation Scan Effect -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-scan"></div>

                <div class="flex items-center gap-3">
                    <Lightning theme="filled" size="24" class="text-yellow-300 animate-bounce" />
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none">{{ $t('studio.drawers.economy.flashSaleActive') || 'Flash Sale Active' }}</span>
                        <h2 class="text-lg font-black text-white uppercase tracking-tighter leading-none">{{ studioStore.activeFlashSale.title }}</h2>
                    </div>
                </div>

                <div class="h-10 w-px bg-white/20"></div>

                <div class="flex flex-col items-center">
                    <span class="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{{ $t('studio.drawers.economy.endingIn') || 'Ending In' }}</span>
                    <span class="text-2xl font-mono font-black text-white tabular-nums drop-shadow-md">{{ timeLeft }}</span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.expand-enter-active, .expand-leave-active {
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.expand-enter-from { opacity: 0; transform: translateY(-50px) scale(0.8); }
.expand-leave-to { opacity: 0; transform: translateY(-50px) scale(0.8); }

@keyframes scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
}
.animate-scan {
    animation: scan 3s infinite linear;
}
</style>
