<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElDialog } from 'element-plus';
import { Microphone, User, AddMusic } from '@icon-park/vue-next';
import VoiceList from './components/VoiceList.vue';
import VoiceRecorder from './components/VoiceRecorder.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'select']);

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
});

const activeTab = ref('voices');

const handleVoiceSelect = (voice: any) => {
    emit('select', voice);
    visible.value = false;
};
</script>

<template>
    <el-dialog v-model="visible" width="800px" class="cinematic-dialog !p-0 overflow-hidden" :show-close="false"
        destroy-on-close>
        <div class="flex h-[600px] bg-[#0a0a0a]">
            <!-- Sidebar -->
            <div class="w-64 bg-black/20 border-r border-white/5 flex flex-col">
                <div class="p-6 border-b border-white/5">
                    <h3 class="text-sm font-black uppercase tracking-[0.2em] text-white/90 flex items-center gap-2">
                        <Microphone theme="filled" class="text-brand-primary" />
                        Voice Lab
                    </h3>
                </div>

                <div class="p-4 space-y-1">
                    <button @click="activeTab = 'voices'" :class="[
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all',
                        activeTab === 'voices' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                    ]">
                        <User :size="16" />
                        Voice Library
                    </button>

                    <button @click="activeTab = 'clone'" :class="[
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all',
                        activeTab === 'clone' ? 'bg-brand-primary/20 text-brand-primary' : 'text-white/40 hover:text-white hover:bg-white/5'
                    ]">
                        <AddMusic :size="16" />
                        Clone Voice
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 flex flex-col relative overflow-hidden">
                <div class="flex items-center justify-end p-4 absolute top-0 right-0 z-10">
                    <button @click="visible = false" class="text-white/20 hover:text-white transition-colors">
                        <span class="sr-only">Close</span>
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <Transition name="fade" mode="out-in">
                        <div v-if="activeTab === 'voices'" key="voices">
                            <div class="mb-6">
                                <h2 class="text-xl font-black text-white mb-1">Select a Voice</h2>
                                <p class="text-xs text-white/40">Choose from system voices or your personal clones.</p>
                            </div>
                            <VoiceList @select="handleVoiceSelect" />
                        </div>

                        <div v-else key="clone">
                            <div class="mb-6">
                                <h2 class="text-xl font-black text-white mb-1">Instant Voice Cloning</h2>
                                <p class="text-xs text-white/40">Record a short sample to create a digital twin of a
                                    voice.</p>
                            </div>
                            <VoiceRecorder @complete="activeTab = 'voices'" />
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
