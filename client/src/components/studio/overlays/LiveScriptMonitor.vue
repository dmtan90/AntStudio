<template>
    <transition name="slide-in">
        <div v-if="studioStore.activeScript && studioStore.activeScript.isRunning" 
             class="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] z-40 pointer-events-auto">
            
            <div class="glass-dark rounded-xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl bg-black/80">
                <!-- Header -->
                <div class="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-red-400">{{ $t('studio.common.showrunnerTitle') }}</span>
                        <span class="text-[10px] text-white/40">| {{ studioStore.activeScript.title }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="text-[10px] font-mono text-white/60">
                            {{ $t('studio.common.showrunnerStep', { current: studioStore.scriptIndex + 1, total: studioStore.activeScript.steps.length }) }}
                         </span>
                         <button @click="nextStep" class="p-1 hover:bg-white/10 rounded transition-colors group">
                            <go-start theme="filled" size="14" class="text-white/60 group-hover:text-white" />
                         </button>
                    </div>
                </div>

                <!-- Current Step (Hero) -->
                <div class="p-6 text-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <h2 class="text-xl font-bold text-white mb-2 leading-tight">
                        {{ currentStep?.description }}
                    </h2>
                    
                    <div v-if="currentStep?.dialogue" class="bg-white/5 rounded-lg p-4 mt-4 border border-white/5 text-left">
                        <div class="flex items-center gap-2 mb-2">
                             <avatar theme="outline" size="16" class="text-blue-400" />
                             <span class="text-xs font-bold text-blue-400 uppercase">{{ $t('studio.common.showrunnerSays', { agent: currentStep.agentId || 'Reviewer' }) }}</span>
                        </div>
                        <p class="text-lg text-white/90 font-serif italic leading-relaxed">"{{ currentStep.dialogue }}"</p>
                    </div>

                     <div v-if="currentStep?.action" class="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-widest">
                        <lightning theme="filled" size="12" />
                        <span>{{ $t('studio.common.showrunnerAction', { action: currentStep.action }) }}</span>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="h-1 bg-white/5 w-full relative">
                    <div class="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-1000 ease-linear" :style="{ width: progress + '%' }"></div>
                </div>

                <!-- Next Up -->
                <div v-if="nextStepData" class="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                    <span class="uppercase font-bold">{{ $t('studio.common.showrunnerUpNext') }}</span>
                    <span class="truncate max-w-[300px]">{{ nextStepData.description }}</span>
                    <span class="font-mono">{{ nextStepData.durationSeconds }}s</span>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { GoStart, Lightning, Avatar } from '@icon-park/vue-next';

const studioStore = useStudioStore();
const progress = ref(0);
let timer: any = null;

const currentStep = computed(() => {
    if (!studioStore.activeScript || studioStore.scriptIndex === -1) return null;
    return studioStore.activeScript.steps[studioStore.scriptIndex];
});

const nextStepData = computed(() => {
    if (!studioStore.activeScript) return null;
    return studioStore.activeScript.steps[studioStore.scriptIndex + 1];
});

const nextStep = () => {
    studioStore.nextShowStep();
};

// Simulated progress bar based on expected duration
watch(currentStep, (newStep) => {
    if (timer) clearInterval(timer);
    progress.value = 0;
    
    if (newStep && newStep.durationSeconds) {
        const stepMs = 100; // Update every 100ms
        const updateAmount = 100 / (newStep.durationSeconds * 10); 
        
        timer = setInterval(() => {
            progress.value += updateAmount;
            if (progress.value >= 100) clearInterval(timer);
        }, stepMs);
    }
}, { immediate: true });

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<style scoped>
.slide-in-enter-active,
.slide-in-leave-active {
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-in-enter-from,
.slide-in-leave-to {
    transform: translate(-50%, -50px);
    opacity: 0;
}
</style>
