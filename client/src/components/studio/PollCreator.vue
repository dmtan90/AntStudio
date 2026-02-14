<script setup lang="ts">
import { ref } from 'vue';
import { CloseSmall, Plus, Delete } from '@icon-park/vue-next';

const emit = defineEmits(['close', 'create']);

const question = ref('');
const options = ref([
    { label: '', votes: 0 },
    { label: '', votes: 0 }
]);

const addOption = () => {
    if (options.value.length < 4) {
        options.value.push({ label: '', votes: 0 });
    }
};

const removeOption = (index: number) => {
    if (options.value.length > 2) {
        options.value.splice(index, 1);
    }
};

const handleCreate = () => {
    if (!question.value || options.value.some(o => !o.label)) return;
    
    emit('create', {
        id: 'poll_' + Date.now(),
        question: question.value,
        options: options.value.map(o => ({ ...o })),
        totalVotes: 0,
        createdAt: Date.now()
    });
};
</script>

<template>
    <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-40">Create New Poll</h3>
            <button @click="emit('close')" class="p-1 hover:bg-white/10 rounded-lg transition-all">
                <close-small size="18" />
            </button>
        </div>

        <div class="space-y-4">
            <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase opacity-60">Question</label>
                <el-input 
                    v-model="question" 
                    placeholder="E.g. What should we talk about next?"
                    type="textarea"
                    :rows="2"
                    class="glass-input"
                />
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold uppercase opacity-60">Options</label>
                    <button 
                        v-if="options.length < 4"
                        @click="addOption"
                        class="text-[9px] font-black uppercase text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1"
                    >
                        <plus size="12" /> Add Option
                    </button>
                </div>
                
                <div class="space-y-2">
                    <div v-for="(opt, idx) in options" :key="idx" class="flex gap-2">
                        <el-input 
                            v-model="opt.label" 
                            :placeholder="'Option ' + (idx + 1)"
                            size="small"
                            class="glass-input flex-1"
                        />
                        <button 
                            v-if="options.length > 2"
                            @click="removeOption(idx)"
                            class="p-1 text-red-500/40 hover:text-red-500 transition-all"
                        >
                            <delete size="14" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <el-button 
            type="primary" 
            class="w-full h-10 uppercase font-black tracking-widest text-[10px]"
            :disabled="!question || options.some(o => !o.label)"
            @click="handleCreate"
        >
            Launch Poll
        </el-button>
    </div>
</template>

<style scoped>
.glass-input :deep(.el-textarea__inner),
.glass-input :deep(.el-input__inner) {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    color: white !important;
    border-radius: 12px;
}
</style>
