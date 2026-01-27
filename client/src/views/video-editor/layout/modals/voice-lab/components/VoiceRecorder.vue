<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { useQueryClient } from '@tanstack/vue-query';
import { Microphone, Pause as Stop, Play, Upload, Delete, Check } from '@icon-park/vue-next';

const emit = defineEmits(['complete']);
const queryClient = useQueryClient();

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
        await axios.post('/api/voice/clone', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.success('Voice cloned successfully!');
        queryClient.invalidateQueries({ queryKey: ['voices'] });
        emit('complete');
    } catch (e: any) {
        toast.error(e.response?.data?.error || 'Cloning failed');
    } finally {
        isUploading.value = false;
    }
};
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="space-y-4">
            <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-white/40">Voice Name</label>
                <input v-model="name" placeholder="e.g. My Narrator Voice"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-primary/50 focus:outline-none transition-colors" />
            </div>

            <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-white/40">Description</label>
                <textarea v-model="description" placeholder="A generic description of the voice style..." rows="2"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-primary/50 focus:outline-none transition-colors resize-none" />
            </div>
        </div>

        <!-- Recorder -->
        <div class="border-t border-white/5 pt-6">
            <div v-if="!audioBlob"
                class="flex flex-col items-center gap-4 py-8 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <div class="relative">
                    <div v-if="isRecording" class="absolute inset-0 bg-red-500/50 blur-xl rounded-full animate-pulse">
                    </div>
                    <button @click="isRecording ? stopRecording() : startRecording()"
                        class="relative z-10 h-16 w-16 rounded-full flex items-center justify-center transition-all bg-brand-primary text-white hover:scale-105 active:scale-95"
                        :class="{ '!bg-red-500': isRecording }">
                        <Stop v-if="isRecording" size="24" theme="filled" />
                        <Microphone v-else size="24" theme="filled" />
                    </button>
                </div>
                <div class="text-center">
                    <p class="text-sm font-bold text-white">{{ isRecording ? 'Recording...' : 'Click to Record Sample'
                        }}</p>
                    <p class="text-[10px] text-white/40 mt-1">Read a paragraph for at least 30 seconds for best results.
                    </p>
                </div>
            </div>

            <div v-else class="flex flex-col gap-4">
                <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <audio controls :src="audioUrl" class="w-full h-8" />
                    <button @click="resetRecording" class="p-2 text-white/40 hover:text-red-400 transition-colors">
                        <Delete size="16" />
                    </button>
                </div>

                <button @click="handleClone" :disabled="isUploading || !name"
                    class="cinematic-button is-primary w-full !h-12 !rounded-xl flex items-center justify-center gap-2">
                    <Spinner v-if="isUploading" size="sm" />
                    <Upload v-else size="16" />
                    <span class="text-xs font-black uppercase tracking-widest">
                        {{ isUploading ? 'Cloning...' : 'Create Voice Clone' }}
                    </span>
                </button>
            </div>
        </div>
    </div>
</template>
