<template>
    <div class="engagement-settings flex flex-col gap-8 animate-in">
        <!-- Live Polls -->
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">LIVE_POLLS</h4>
                <button v-if="!activePoll" class="text-[10px] text-blue-500 font-bold hover:text-blue-400"
                    @click="$emit('start-poll')">+ Start New</button>
                <button v-else class="text-[10px] text-red-500 font-bold animate-pulse">Ending...</button>
            </div>

            <div v-if="activePoll" class="poll-preview p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p class="text-[11px] font-black uppercase mb-4 tracking-tighter">{{ activePoll.question }}</p>
                <div class="space-y-3">
                    <div v-for="opt in activePoll.options" :key="opt.label" class="flex flex-col gap-1 text-[10px]">
                        <div class="flex justify-between items-center opacity-60 font-bold">
                            <span>{{ opt.label }}</span>
                            <span>{{ Math.round(opt.votes / activePoll.totalVotes * 100) }}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_#3b82f6]"
                                :style="{ width: (opt.votes / activePoll.totalVotes * 100) + '%' }"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="showCreatePoll" class="p-6 bg-white/5 border border-white/10 rounded-3xl animate-in">
                <div class="mb-4">
                    <label class="text-[8px] font-black opacity-30 uppercase block mb-2">Question</label>
                    <input v-model="newPoll.question"
                        class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-blue-500/50 outline-none"
                        placeholder="Ask your audience..." />
                </div>
                <div class="space-y-2 mb-4">
                    <label class="text-[8px] font-black opacity-30 uppercase block mb-1">Options</label>
                    <input v-for="(opt, i) in newPoll.options" :key="i" v-model="newPoll.options[i]"
                        class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] focus:border-blue-500/50 outline-none"
                        :placeholder="'Option ' + (i + 1)" />
                </div>
                <div class="flex gap-2">
                    <button class="flex-1 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase"
                        @click="handleStartPoll">Launch Poll</button>
                    <button class="px-4 rounded-xl bg-white/5 text-[10px] font-bold uppercase"
                        @click="showCreatePoll = false">Cancel</button>
                </div>
            </div>
            <div v-else class="empty-notif p-8 text-center border border-dashed border-white/10 rounded-3xl">
                <chart-histogram theme="outline" size="24" class="mx-auto mb-3 opacity-20" />
                <p class="opacity-30 text-[10px] uppercase font-black tracking-widest mb-4">No active poll in progress
                </p>
                <button
                    class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                    @click="showCreatePoll = true">
                    Create New Poll
                </button>
            </div>
        </section>

        <!-- Q&A Queue -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Q&A_REALTIME_QUEUE</h4>
            <div class="qa-list flex flex-col gap-3">
                <div v-for="q in qaQueue" :key="q.id"
                    class="qa-item glass-selectable p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-blue-500/30 cursor-pointer transition-all"
                    @click="$emit('feature-question', q)">
                    <div class="flex justify-between mb-2">
                        <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest">{{ q.user }}</span>
                        <comment-one theme="filled" size="14" class="opacity-20 group-hover:opacity-100" />
                    </div>
                    <p class="text-xs leading-relaxed opacity-60 font-medium">{{ q.text }}</p>
                </div>
            </div>
        </section>

        <slot />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ChartHistogram, CommentOne } from '@icon-park/vue-next';

defineProps<{
    activePoll: any;
    qaQueue: any[];
}>();

const emit = defineEmits(['start-poll', 'feature-question']);

const showCreatePoll = ref(false);
const newPoll = reactive({
    question: '',
    options: ['', '']
});

const handleStartPoll = () => {
    if (!newPoll.question || newPoll.options.some(o => !o)) return;

    emit('start-poll', {
        id: 'poll_' + Date.now(),
        question: newPoll.question,
        options: newPoll.options.map(o => ({ label: o, votes: 0 })),
        totalVotes: 1 // Start at 1 to avoid /0 or just use 0 and check later
    });

    showCreatePoll.value = false;
    newPoll.question = '';
    newPoll.options = ['', ''];
};
</script>
