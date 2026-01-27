<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { useAudioStore } from 'video-editor/hooks/use-audio';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import AudioItem from './AudioItem.vue';
import VoiceLabModal from 'video-editor/layout/modals/voice-lab/VoiceLabModal.vue';
import { Microphone } from '@icon-park/vue-next';

const props = defineProps<{ match: string | false, query: string | null, category: string | null }>();

const editor = useEditorStore();
const audioStore = useAudioStore() as any;
const userMediaStore = useUserMediaStore();
const { sounds, musics, soundCategories, musicCategories, loading, error, hasNextPage, currentPage } = storeToRefs(audioStore) as any;

const showVoiceLab = ref(false);

const handleVoiceSelect = async (voice: any) => {
  console.log('Selected Voice:', voice);
  // Future: Open TTS Dialog with this voice selected
  toast.success(`Selected voice: ${voice.name}`);

  // Example: Generate a sample TTS?
  /*
  const { data } = await axios.post('/api/ai/generate-voice', {
    text: "Hello, this is a test of my new voice.",
    voice: voice.voice_id,
    provider: 'elevenlabs'
  });
  onAddAudio({ name: `TTS - ${voice.name}`, source: data.url });
  */
};

const onAddAudio = async (audio: any) => {
  try {
    const resolvedSource = await getFileUrl(audio.source, { cached: true });
    const promise = (editor.canvas as any).onAddAudioFromSource(resolvedSource).then(element => {
      (editor.canvas as any).audio.add(resolvedSource, audio.name, (element as any).name);
    });
    toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to artboard", error: "Ran into an error adding the audio asset" });
  } catch (error) {
    console.error('Failed to resolve audio source:', error);
    toast.error("Failed to load audio asset");
  }
};

onMounted(() => {
  console.log("onMounted", props);
  handleResetData();
});

const handleLoadMore = () => {
  console.log("handleLoadMore => Audio");
  if (props.match == "sounds") {
    if (loading.value || !hasNextPage.value) {
      return;
    }

    const nextPage = currentPage.value + 1;
    if (props.query) {
      audioStore.searchSoundAppend(props.query, props.category, nextPage);
    }
    else {
      audioStore.loadSoundAppend(props.category, nextPage);
    }
  }
  if (props.match == "musics") {
    if (loading.value || !hasNextPage.value) {
      return;
    }

    const nextPage = currentPage.value + 1;
    if (props.query) {
      audioStore.searchMusicAppend(props.query, props.category, nextPage);
    }
    else {
      audioStore.loadMusicAppend(props.category, nextPage);
    }
  }
  if (props.match == "userAudios") {
    if (userMediaStore.audios.loading || userMediaStore.audios.page >= userMediaStore.audios.pages) return;
    userMediaStore.loadAudios(userMediaStore.audios.page + 1);
  }
}

const handleResetData = () => {
  console.log("handleResetData => Audio");
  if (props.match == "sounds") {
    if (loading.value) {
      return;
    }

    const nextPage = 0;
    if (props.query) {
      audioStore.searchSound(props.query, props.category, nextPage);
    }
    else {
      audioStore.loadSound(props.category, nextPage);
    }
  }
  if (props.match == "musics") {
    if (loading.value) {
      return;
    }

    const nextPage = 0;
    if (props.query) {
      audioStore.searchMusic(props.query, props.category, nextPage);
    }
    else {
      audioStore.loadMusic(props.category, nextPage);
    }
  }
  if (props.match == "userAudios") {
    userMediaStore.refreshAudios();
  }
};

defineExpose({
  loadMore: handleLoadMore,
  resetData: handleResetData
})

</script>

<template>
  <template v-if="match === 'sounds'">
    <div v-if="sounds.length" class="flex flex-col gap-4">
      <AudioItem v-for="audio in sounds" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
    </div>
    <div v-else class="flex flex-col gap-4">
      <el-skeleton v-for="(_, index) in 6" :key="index" animated class="h-16 w-full rounded-xl !bg-white/5" />
      <span v-if="!loading"
        class="text-[10px] font-bold text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none uppercase tracking-widest text-center">No
        Audios Found</span>
    </div>
  </template>

  <template v-if="match === 'musics'">
    <div v-if="musics.length" class="flex flex-col gap-4">
      <AudioItem v-for="audio in musics" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
    </div>
    <div v-else class="flex flex-col gap-4">
      <el-skeleton v-for="(_, index) in 6" :key="index" animated class="h-16 w-full rounded-xl !bg-white/5" />
      <span v-if="!loading"
        class="text-[10px] font-bold text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none uppercase tracking-widest text-center">No
        Music Found</span>
    </div>
  </template>

  <template v-if="match === 'userAudios'">
    <div class="mb-4">
      <button @click="showVoiceLab = true"
        class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-white/10 hover:border-white/20 hover:from-purple-500/30 hover:to-blue-500/30 transition-all group">
        <div
          class="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Microphone theme="filled" size="16" class="text-white" />
        </div>
        <span class="text-xs font-black uppercase tracking-widest text-white">Voice Lab</span>
      </button>
    </div>

    <div v-if="userMediaStore.audios.items.length" class="flex flex-col gap-4">
      <AudioItem v-for="audio in userMediaStore.audios.items" :key="audio._id"
        :audio="{ ...audio, source: audio.url, name: audio.fileName }"
        @click="onAddAudio({ ...audio, source: audio.url, name: audio.fileName })" />
    </div>
    <div v-else class="flex flex-col gap-4">
      <el-skeleton v-for="(_, index) in 6" :key="index" animated class="h-16 w-full rounded-xl !bg-white/5" />
      <span v-if="!userMediaStore.audios.loading"
        class="text-[10px] font-bold text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none uppercase tracking-widest text-center">No
        Audio Found</span>
    </div>
  </template>

  <VoiceLabModal v-model="showVoiceLab" @select="handleVoiceSelect" />
</template>
