<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useQueryClient } from '@tanstack/vue-query';
import { useVoiceStore } from '@/stores/voice';
import { Microphone, PauseOne, Play, Upload, Delete, Check, Tips } from '@icon-park/vue-next';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';

const emit = defineEmits(['complete']);
const queryClient = useQueryClient();
const voiceStore = useVoiceStore();
const { attachToStream, volume } = useAudioVisualizer();

const name = ref('');
const description = ref('');
const isRecording = ref(false);
const audioBlob = ref<Blob | null>(null);
const audioUrl = ref<string | null>(null);
const mediaRecorder = ref<MediaRecorder | null>(null);
const chunks = ref<Blob[]>([]);
const isUploading = ref(false);

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        attachToStream(stream);
        
        mediaRecorder.value = new MediaRecorder(stream);
        chunks.value = [];

        mediaRecorder.value.ondataavailable = (e) => {
            chunks.value.push(e.data);
        };

        mediaRecorder.value.onstop = () => {
            const blob = new Blob(chunks.value, { type: 'audio/mp3' });
            audioBlob.value = blob;
            audioUrl.value = URL.createObjectURL(blob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.value.start();
        isRecording.value = true;
    } catch (e) {
        toast.error('Microphone access denied');
    }
};

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop();
        isRecording.value = false;
    }
};

const resetRecording = () => {
    audioBlob.value = null;
    audioUrl.value = null;
    chunks.value = [];
};

const handleClone = async () => {
    if (!name.value || !audioBlob.value) return;

    isUploading.value = true;
    const formData = new FormData();
    formData.append('name', name.value);
    formData.append('description', description.value || 'Instant Clone');
    formData.append('files', audioBlob.value, 'sample.mp3');

    try {
        await voiceStore.cloneVoice(formData);
        toast.success('Voice cloned successfully!');
        queryClient.invalidateQueries({ queryKey: ['voices'] });
        emit('complete');
    } catch (e: any) {
        toast.error(e.response?.data?.error || 'Cloning failed');
    } finally {
        isUploading.value = false;
    }
};

onUnmounted(() => {
    stopRecording();
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
});
</script>

<template>
    <div class="flex flex-col gap-8 py-2">
        <!-- Input Section -->
        <div class="space-y-6">
            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Identity</label>
                <div class="relative group">
                    <input v-model="name" placeholder="Name your voice signature..."
                        class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/20 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all duration-300 backdrop-blur-md" />
                    <div class="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                </div>
            </div>

            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Context</label>
                <div class="relative group">
                    <textarea v-model="description" placeholder="Optional notes for this voice profile..." rows="2"
                        class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/20 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all duration-300 backdrop-blur-md resize-none" />
                    <div class="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                </div>
            </div>
        </div>

        <!-- Recorder Stage -->
        <div class="relative group">
            <div class="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
            
            <div class="relative glass-card rounded-3xl overflow-hidden border border-white/10 bg-[#050505]/60 backdrop-blur-2xl">
                <div v-if="!audioBlob" class="flex flex-col items-center gap-6 py-12 px-8">
                    <!-- Visualizer Ring -->
                    <div class="relative flex items-center justify-center">
                        <div v-if="isRecording" class="absolute inset-0 flex items-center justify-center">
                            <div v-for="i in 3" :key="i"
                                class="absolute w-24 h-24 border border-blue-500/30 rounded-full animate-ping"
                                :style="{ animationDelay: `${(i-1)*0.5}s`, animationDuration: '2s' }">
                            </div>
                            <div class="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150"></div>
                        </div>

                        <button @click="isRecording ? stopRecording() : startRecording()"
                            class="relative z-10 h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl"
                            :class="[
                                isRecording 
                                ? 'bg-red-500 text-white shadow-red-500/30 ring-4 ring-red-500/20 scale-110' 
                                : 'bg-blue-600 text-white shadow-blue-600/30 hover:scale-105 active:scale-95'
                            ]">
                            <PauseOne v-if="isRecording" size="32" theme="filled" />
                            <Microphone v-else size="32" theme="filled" />
                        </button>
                    </div>

                    <div class="text-center space-y-2">
                        <h3 class="text-lg font-black text-white uppercase tracking-tight">
                            {{ isRecording ? 'Sampling Audio...' : 'Voice Acquisition' }}
                        </h3>
                        <p class="text-[11px] text-white/40 font-medium uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                            {{ isRecording 
                               ? 'Keep speaking clearly to capture the unique nuances of your signature.' 
                               : 'Record 30-60 seconds of clear speech for an accurate cloning profile.' 
                            }}
                        </p>
                    </div>

                    <!-- Dynamic Wave (Visual) -->
                    <div v-if="isRecording" class="w-full h-12 flex items-center justify-center gap-1 mt-4 px-4 overflow-hidden">
                        <div v-for="i in 32" :key="i"
                            class="w-1 rounded-full bg-blue-500/60 transition-all duration-100"
                            :style="{ height: `${10 + (Math.random() * volume * 60)}%` }">
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div class="space-y-6">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Sample Preview</span>
                            <button @click="resetRecording" class="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-red-400 transition-colors uppercase tracking-widest">
                                <Delete size="14" /> Discard
                            </button>
                        </div>
                        
                        <div class="glass-card bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                            <audio controls :src="audioUrl" class="w-full h-10 custom-audio-player" />
                        </div>
                    </div>

                    <el-button @click="handleClone" :loading="isUploading" :disabled="!name"
                        class="w-full h-16 !bg-blue-600 !border-none !rounded-2xl shadow-xl shadow-blue-600/20 group overflow-hidden relative">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <div class="flex items-center justify-center gap-3">
                            <Upload v-if="!isUploading" theme="outline" size="20" class="text-white" />
                            <span class="text-sm font-black text-white uppercase tracking-[0.2em] pt-0.5">
                                {{ isUploading ? 'Acquiring...' : 'Synthesize Signature' }}
                            </span>
                        </div>
                    </el-button>
                </div>
            </div>
        </div>

        <!-- Tip -->
        <div class="flex gap-4 p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
            <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Tips theme="outline" class="text-blue-400" size="20" />
            </div>
            <div class="space-y-1">
                <h4 class="text-[11px] font-black text-white uppercase tracking-tight pt-1">Pro Tip</h4>
                <p class="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-wider">Use a high-quality condenser mic and minimize room echo for professional-grade voice clones.</p>
            </div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
.custom-audio-player {
    filter: invert(1) hue-rotate(180deg) brightness(1.5);
}

:deep(.el-button.is-loading) {
    @apply opacity-80;
}

.animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
    75%, 100% {
        transform: scale(2);
        opacity: 0;
    }
}
</style>
