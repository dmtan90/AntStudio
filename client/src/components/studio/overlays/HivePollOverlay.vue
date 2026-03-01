<template>
    <transition name="pop-in">
        <div v-if="studioStore.activePoll" class="fixed bottom-32 left-1/2 -translate-x-1/2 w-[500px] z-50 pointer-events-auto">
            <div class="glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-black/80">
                <!-- Progress Bar (Timer) -->
                <div class="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all ease-linear"
                     :style="{ width: progressPercent + '%' }"></div>
                
                <div class="flex items-center justify-between mb-4">
                     <div class="flex items-center gap-2">
                         <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                         <span class="text-xs font-bold uppercase tracking-widest text-blue-400">{{ $t('studio.common.hiveMindPollTitle') }}</span>
                     </div>
                     <span class="text-xs font-mono text-white/50">{{ $t('studio.common.pollRemaining', { count: timeLeft }) }}</span>
                </div>

                <h3 class="text-xl font-bold text-white mb-6 leading-tight text-center">
                    {{ studioStore.activePoll.question }}
                </h3>

                <div class="space-y-3">
                    <button v-for="(opt, idx) in studioStore.activePoll.options" :key="idx"
                            @click="vote(idx as number)"
                            :disabled="hasVoted"
                            class="w-full relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed">
                        
                        <!-- Vote Background Bar -->
                        <div class="absolute inset-y-0 left-0 bg-purple-500/20 transition-all duration-500 ease-out"
                             :style="{ width: getPercentage(idx as number) + '%' }"></div>
                        
                        <div class="relative flex items-center justify-between z-10">
                            <span class="font-medium text-white group-hover:text-purple-300 transition-colors text-left truncate pr-4">
                                <span class="opacity-50 mr-2 font-mono">{{ (idx as number) + 1 }}</span>{{ opt }}
                            </span>
                            <span class="font-mono font-bold text-white/80 shrink-0">
                                {{ getPercentage(idx as number) }}%
                            </span>
                        </div>
                    </button>
                </div>

                <div class="mt-4 flex items-center justify-between px-2">
                     <p class="text-[10px] text-white/40 uppercase tracking-widest">
                         {{ $t('studio.common.pollVotesCast', { count: studioStore.activePoll.totalVotes }) }}
                     </p>
                     <p v-if="hasVoted" class="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <check-one theme="filled" size="12" /> {{ $t('studio.common.pollVoteRecorded') }}
                     </p>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { CheckOne } from '@icon-park/vue-next';

const studioStore = useStudioStore();
const hasVoted = ref(false);
const timeLeft = ref(0);
const progressPercent = ref(100);
let timer: any = null;

// Watch for new polls to reset local state
watch(() => studioStore.activePoll?.id, (newId, oldId) => {
    if (newId !== oldId) {
        hasVoted.value = false;
        startTimer();
    }
});

const startTimer = () => {
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        if (!studioStore.activePoll) {
            clearInterval(timer);
            return;
        }

        const now = Date.now();
        const expiresAt = studioStore.activePoll.expiresAt;
        const totalDuration = studioStore.activePoll.durationSeconds * 1000;
        const created = expiresAt - totalDuration;

        const remaining = Math.max(0, expiresAt - now);
        timeLeft.value = Math.ceil(remaining / 1000);
        
        const elapsed = now - created;
        progressPercent.value = Math.max(0, 100 - ((elapsed / totalDuration) * 100));

        if (remaining <= 0) {
            clearInterval(timer);
        }
    }, 100);
};

const getPercentage = (index: number) => {
    if (!studioStore.activePoll || studioStore.activePoll.totalVotes === 0) return 0;
    const votes = studioStore.activePoll.votes[index.toString()] || 0;
    return Math.round((votes / studioStore.activePoll.totalVotes) * 100);
};

const vote = (index: number) => {
    if (hasVoted.value) return;
    studioStore.castVote(index);
    hasVoted.value = true;
};

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<style scoped>
.glass-panel {
    box-shadow: 0 0 50px -12px rgba(124, 58, 237, 0.25);
}

.pop-in-enter-active,
.pop-in-leave-active {
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.pop-in-enter-from,
.pop-in-leave-to {
    opacity: 0;
    transform: translate(-50%, 50px) scale(0.9);
}
</style>
