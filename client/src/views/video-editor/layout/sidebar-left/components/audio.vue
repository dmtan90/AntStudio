<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { Plus, Search, Close as X, ArrowLeft as Left } from '@icon-park/vue-next';
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { uploadAssetToS3 } from 'video-editor/api/upload';
import { useMockStore } from 'video-editor/constants/mock';
import { useAudioStore } from 'video-editor/hooks/use-audio';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { getFileUrl } from '@/utils/api';
import AudioItem from './AudioItem.vue';
import ExpandedAudioView from './ExpandedAudioView.vue';

const editor = useEditorStore();
const mock = useMockStore();
const userMediaStore = useUserMediaStore();
const expanded = ref<false | string>(false);
const category = ref<null | string>(null);
const audioStore = useAudioStore() as any;
const { sounds, musics, soundCategories, musicCategories } = storeToRefs(audioStore) as any;
const refAudio = ref<any>(null);
const query = ref<string | null>(null);
const searching = ref<Boolean>(false);

const uploadMutation = useMutation({
  mutationFn: async (file: File) => uploadAssetToS3(file, "audio"),
  onSuccess: (response) => {
    userMediaStore.refreshAudios();
  },
});

const handleUpload = (options: any) => {
  const file = options.file;
  if (!file) return Promise.resolve();
  const promise = uploadMutation.mutateAsync(file);
  toast.promise(promise, {
    loading: `Your audio asset is being uploaded...`,
    success: `Audio has been successfully uploaded`,
    error: `Ran into an error while uploading the audio`,
  });
  return promise;
};

const onAddAudio = async (audio: any) => {
  try {
    const resolvedSource = await getFileUrl(audio.source, { cached: true });
    const promise = (editor.canvas as any).audio.add(resolvedSource, audio.name, false);
    toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to artboard", error: "Ran into an error adding the audio asset" });
  } catch (error) {
    console.error('Failed to resolve audio source:', error);
    toast.error("Failed to load audio asset");
  }
};


onMounted(() => {
  audioStore.loadMusic();
  audioStore.loadSound();
  userMediaStore.loadAudios();
});

const onBack = () => {
  query.value = "";
  searching.value = false;
  if (expanded.value == "sounds") {
    audioStore.loadSound();
  }
  else {
    audioStore.loadMusic();
  }

  if (category.value) {
    category.value = null;
    return;
  }

  if (expanded.value) {
    expanded.value = false;
  }
};

const handleLoadMore = () => {
  if (refAudio.value && refAudio.value.loadMore) {
    refAudio.value?.loadMore();
  }
}

const handleResetData = () => {
  searching.value = query.value ? true : false;

  if (refAudio.value && refAudio.value.resetData) {
    refAudio.value?.resetData();
  }
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Audios</h2>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>

    <!-- Search / Navigation -->
    <div class="px-5 pt-4 pb-2" v-if="expanded">
      <div class="flex gap-2 mb-3">
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5 bg-white/5"
          @click="onBack">
          <Left :size="14" />
        </button>
        <el-input v-model="query" placeholder="Search Audios..." class="cinematic-input flex-1"
          @change="handleResetData">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>

      <div class="flex items-center gap-1.5 px-1 py-1 bg-white/5 border border-white/5 rounded-lg mb-2">
        <button
          class="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors px-2"
          @click="onBack">
          {{ expanded }}
        </button>
        <div v-if="category" class="flex items-center gap-1.5">
          <span class="text-white/20 text-[10px] items-center flex">/</span>
          <span
            class="text-[10px] font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
            {{ category }}
          </span>
        </div>
        <div v-if="query && searching" class="flex items-center gap-1.5">
          <span class="text-white/20 text-[10px] items-center flex">/</span>
          <span
            class="text-[10px] font-bold uppercase tracking-widest text-white/90 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
            "{{ query }}"
          </span>
        </div>
      </div>
    </div>

    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container pb-4">
      <template v-if="!expanded">
        <div class="px-5 flex flex-col gap-6 pt-2">

          <!-- Uploads Section -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Uploads</h4>
              <div class="flex items-center gap-2">
                <el-upload :show-file-list="false" :http-request="handleUpload" accept="audio/*">
                  <button
                    class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
                    <Plus :size="10" :stroke-width="4" />
                    <span>Upload</span>
                  </button>
                </el-upload>
                <button v-if="userMediaStore.audios.items.length > 3" @click="expanded = 'userAudios'"
                  class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors">
                  See All
                </button>
              </div>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="userMediaStore.audios.items.length">
                <div class="w-32 shrink-0" v-for="audio in userMediaStore.audios.items" :key="audio._id">
                  <AudioItem :audio="{ ...audio, source: audio.url, name: audio.fileName }"
                    @click="onAddAudio({ ...audio, source: audio.url, name: audio.fileName })" />
                </div>
              </template>
              <template v-else>
                <div
                  class="w-full h-20 border border-white/5 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-white/20">
                  <span class="text-[10px] font-bold uppercase tracking-widest">No Uploads</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Musics Section -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Music</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                @click="expanded = 'musics'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="musics && musics.length > 0">
                <div class="w-32 shrink-0" v-for="audio in musics.slice(0, 3)" :key="audio.source">
                  <AudioItem :audio="audio" @click="onAddAudio(audio)" />
                </div>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated
                  class="h-16 w-32 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>

          <!-- SoundFX Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">SoundFX</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                @click="expanded = 'sounds'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="sounds.length > 0">
                <div class="w-32 shrink-0" v-for="audio in sounds.slice(0, 3)" :key="audio.source">
                  <AudioItem :audio="audio" @click="onAddAudio(audio)" />
                </div>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated
                  class="h-16 w-32 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <template v-if="searching || (expanded && category)">
          <div class="px-5 grid grid-cols-2 gap-4 pt-4 pb-10">
            <ExpandedAudioView ref="refAudio" :match="expanded" :category="category" :query="query" />
          </div>
        </template>
        <template v-else-if="expanded == 'sounds' && !category">
          <div class="px-5 flex flex-col gap-8 pt-4 pb-10">
            <template v-for="cate in soundCategories" :key="cate.cateName">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ cate.cateName }}</h4>
                  <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                    @click="category = cate.cateName">
                    See All
                  </button>
                </div>
                <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
                  <template v-if="cate.data.length > 0">
                    <div class="w-32 shrink-0" v-for="audio in cate.data.slice(0, 3)" :key="audio.source">
                      <AudioItem :audio="audio" @click="onAddAudio(audio)" />
                    </div>
                  </template>
                  <template v-else>
                    <el-skeleton v-for="(_, index) in 3" :key="index" animated
                      class="h-16 w-32 shrink-0 rounded-xl !bg-white/5" />
                  </template>
                </div>
              </div>
            </template>
          </div>
        </template>
        <template v-else-if="expanded == 'musics' && !category">
          <div class="px-5 flex flex-col gap-8 pt-4 pb-10">
            <template v-for="cate in musicCategories" :key="cate.cateName">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ cate.cateName }}</h4>
                  <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                    @click="category = cate.cateName">
                    See All
                  </button>
                </div>
                <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
                  <template v-if="cate.data.length > 0">
                    <div class="w-32 shrink-0" v-for="audio in cate.data.slice(0, 3)" :key="audio.source">
                      <AudioItem :audio="audio" @click="onAddAudio(audio)" />
                    </div>
                  </template>
                  <template v-else>
                    <el-skeleton v-for="(_, index) in 3" :key="index" animated
                      class="h-16 w-32 shrink-0 rounded-xl !bg-white/5" />
                  </template>
                </div>
              </div>
            </template>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>
