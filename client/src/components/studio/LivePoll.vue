<script setup lang="ts">
import { computed } from 'vue';
import { ChartHistogram } from '@icon-park/vue-next';

const props = defineProps<{
    poll: {
        id: string;
        question: string;
        options: Array<{ label: string; votes: number }>;
        totalVotes: number;
    }
}>();

const getPercentage = (votes: number) => {
    if (props.poll.totalVotes === 0) return 0;
    return Math.round((votes / props.poll.totalVotes) * 100);
};

const winnerIndex = computed(() => {
    let max = -1;
    let idx = -1;
    props.poll.options.forEach((o, i) => {
        if (o.votes > max) {
            max = o.votes;
            idx = i;
        }
    });
    return idx;
});
</script>

<template>
    <div class="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-fade-in pointer-events-auto w-72">
        <div class="flex items-center gap-2 mb-3">
            <div class="p-1.5 bg-blue-500/10 rounded shadow-inner-white">
                <chart-histogram theme="outline" size="14" class="text-blue-400" />
            </div>
            <h4 class="text-[10px] font-black uppercase tracking-tighter text-white/60">Live Poll</h4>
        </div>

        <p class="text-[12px] font-bold text-white mb-4 line-clamp-2 leading-tight">
            {{ poll.question }}
        </p>

        <div class="space-y-3">
            <div v-for="(opt, idx) in poll.options" :key="idx" class="space-y-1">
                <div class="flex justify-between text-[10px] items-center mb-1">
                    <span class="font-bold flex items-center gap-1.5">
                        {{ opt.label }}
                        <span v-if="idx === winnerIndex && poll.totalVotes > 0" class="text-[8px] px-1 bg-green-500/20 text-green-400 rounded">Leader</span>
                    </span>
                    <span class="opacity-40">{{ getPercentage(opt.votes) }}%</span>
                </div>
                <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-blue-500 transition-all duration-500 ease-out"
                        :style="{ width: getPercentage(opt.votes) + '%' }"
                    ></div>
                </div>
            </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-bold uppercase opacity-30">
            <span>{{ poll.totalVotes }} Votes</span>
            <span class="animate-pulse flex items-center gap-1">
                <div class="w-1 h-1 bg-blue-400 rounded-full"></div>
                Collecting...
            </span>
        </div>
    </div>
</template>

<style scoped>
.shadow-inner-white {
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
}
</style>
