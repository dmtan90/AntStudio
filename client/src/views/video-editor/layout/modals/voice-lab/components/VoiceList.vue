<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import { toast } from 'vue-sonner';
import { PlayOne, Pause, User, Robot } from '@icon-park/vue-next';
import Spinner from 'video-editor/components/ui/spinner.vue';

const emit = defineEmits(['select']);
const playingPreview = ref<string | null>(null);
const audio = ref<HTMLAudioElement | null>(null);

const { data: voices, isLoading, error } = useQuery({
    queryKey: ['voices'],
    queryFn: async () => {
        const { data } = await axios.get('/api/voice/list');
        return data.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 mins
});

const togglePreview = (voice: any) => {
    if (playingPreview.value === voice.voice_id) {
        audio.value?.pause();
        playingPreview.value = null;
        return;
    }

    if (audio.value) {
        audio.value.pause();
    }

    if (!voice.preview_url) {
        toast.error('No preview available for this voice');
        return;
    }

    audio.value = new Audio(voice.preview_url);
    audio.value.onended = () => {
        playingPreview.value = null;
    };
    audio.value.play();
    playingPreview.value = voice.voice_id;
};

const selectVoice = (voice: any) => {
    emit('select', voice);
};
</script>

<template>
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <Spinner />
        <span class="mt-4 text-xs font-bold text-white/40 uppercase tracking-widest">Loading Voices...</span>
    </div>

    <div v-else-if="error" class="text-center py-20 text-red-400">
        Failed to load voices. Please try again.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-for="voice in voices" :key="voice.voice_id"
            class="group relative bg-white/5 border border-white/5 hover:border-brand-primary/50 hover:bg-white/10 rounded-xl p-3 transition-all cursor-pointer"
            @click="selectVoice(voice)">
            <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    :class="voice.is_owner ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'">
                    <User v-if="voice.is_owner" class="text-lg" />
                    <Robot v-else class="text-lg" />
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                        <h4 class="text-sm font-bold text-white truncate">{{ voice.name }}</h4>
                        <span v-if="voice.is_owner"
                            class="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Clone</span>
                    </div>
                    <p class="text-[10px] text-white/40 truncate">{{ voice.category || 'Standard Voice' }}</p>
                </div>

                <button @click.stop="togglePreview(voice)"
                    class="h-8 w-8 rounded-full bg-white/5 hover:bg-brand-primary hover:text-white flex items-center justify-center transition-colors"
                    :class="{ '!bg-brand-primary text-white': playingPreview === voice.voice_id }">
                    <Pause v-if="playingPreview === voice.voice_id" theme="filled" size="12" />
                    <PlayOne v-else theme="filled" size="12" />
                </button>
            </div>
        </div>
    </div>
</template>
