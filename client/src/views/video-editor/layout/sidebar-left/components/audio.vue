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

import AudioItem from './AudioItem.vue';
import ExpandedAudioView from './ExpandedAudioView.vue';

const editor = useEditorStore();
const mock = useMockStore();
const expanded = ref<false | string>(false);
const category = ref<null | string>(null);
const audioStore = useAudioStore() as any;
const { sounds, musics, soundCategories, musicCategories } = storeToRefs(audioStore) as any;
const refAudio = ref<any>(null);
const query = ref<string | null>(null);
const searching = ref<Boolean>(false);

const uploadMutation = useMutation({
  mutationFn: async (file: File) => uploadAssetToS3(file, "audio"),
  onSuccess: (response) => mock.upload("audio", response as any),
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

const onAddAudio = (audio: any) => {
  const promise = (editor.canvas as any).audio.add(audio.source, audio.name, false);
  // const promise = editor.canvas.onAddAudioFromSource(audio.source).then(element => {
  //   console.log(element);
  //   editor.canvas.audio.add(audio.source, audio.name, element.name);
  // });
  toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to artboard", error: "Ran into an error adding the audio asset" });
};


onMounted(() => {
  audioStore.loadMusic();
  audioStore.loadSound();
});

const onBack = () => {
  query.value = "";
  searching.value = false;
  if(expanded.value == "sounds"){
    audioStore.loadSound();
  }
  else{
    audioStore.loadMusic();  
  }

  if(category.value){  
    category.value = null;
    return;
  }

  if(expanded.value){
    expanded.value = false;
  }
};

const handleLoadMore = () => {
  if(refAudio.value && refAudio.value.loadMore){
    refAudio.value?.loadMore();
  }
}

const handleResetData = () => {
  searching.value = query.value ? true : false;

  if(refAudio.value && refAudio.value.resetData){
    refAudio.value?.resetData();
  }
};

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Audios</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <div class="flex flex-1 justify-between px-4 py-4 gap-1" v-if="expanded">
      <el-button link circle @click="onBack">
        <Left :size="16" />
      </el-button>
      <el-input v-model="query" placeholder="Search Audios..." class="text-xs" @change="handleResetData">
        <template #prefix>
          <Search :size="15" class="text-foreground/60" />
        </template>
      </el-input>
    </div>
    <div class="flex flex-1 justify-between px-4 py-1 gap-1" v-if="expanded && category">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <el-button link class="text-xs h-6 px-2 capitalize hover:text-foreground/40" @click="onBack">
            {{ expanded }}
          </el-button>
        </el-breadcrumb-item>
        <el-breadcrumb-item>
          <el-button disabled link class="text-xs h-6 px-2 capitalize disabled:opacity-100">
            {{ category }}
          </el-button>
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="flex flex-1 justify-between px-4 py-1 gap-1" v-if="searching">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <el-button link class="text-xs h-6 px-2 capitalize hover:text-foreground/40" @click="onBack">
            {{ expanded }}
          </el-button>
        </el-breadcrumb-item>
        <el-breadcrumb-item>
          <el-button disabled link class="text-xs h-6 px-2 capitalize disabled:opacity-100">
            {{ query }}
          </el-button>
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <section class="sidebar-container pb-4">
      <template v-if="!expanded">
        <div class="px-3 flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-semibold line-clamp-1">Uploads</h4>
              <el-upload
                :show-file-list="false"
                :http-request="handleUpload"
                accept="audio/*"
                class="ml-auto"
              >
                <el-button size="small" type="primary" text bg round class="h-7 ml-auto bg-card gap-1 pl-2">
                  <Plus :size="14" />
                  <span>Add File</span>
                </el-button>
              </el-upload>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="mock.audios.length">
                <AudioItem v-for="audio in mock.audios.slice(0, 3)" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Audios</span>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Musics</h4>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="expanded = 'musics'">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="musics && musics.length > 0">
                <AudioItem v-for="audio in musics.slice(0, 3)" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">Coming Soon</span>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">SoundFX</h4>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="expanded = 'sounds'">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="sounds.length > 0">
                <AudioItem v-for="audio in sounds.slice(0, 3)" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">Coming Soon</span>
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <template v-if="searching || (expanded && category)">
          <div class="px-3 grid grid-cols-3 gap-2.5 pt-4">
            <ExpandedAudioView ref="refAudio" :match="expanded" :category="category" :query="query" />
          </div>  
        </template>
        <template v-else-if="expanded == 'sounds' && !category">
          <div class="px-3 flex flex-col gap-6">
            <template v-for="cate in soundCategories" :key="cate.cateName">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-4">
                  <h4 class="text-xs font-semibold line-clamp-1">{{ cate.cateName }}</h4>
                  <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="category = cate.cateName">
                    See All
                  </el-button>
                </div>
                <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
                  <template v-if="cate.data.length > 0">
                    <AudioItem v-for="audio in cate.data.slice(0, 3)" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
                  </template>
                  <template v-else>
                    <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                    <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">Coming Soon</span>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </template>
        <template v-else-if="expanded == 'musics' && !category">
          <div class="px-3 flex flex-col gap-6">
            <template v-for="cate in musicCategories" :key="cate.cateName">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-4">
                  <h4 class="text-xs font-semibold line-clamp-1">{{ cate.cateName }}</h4>
                  <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="category = cate.cateName">
                    See All
                  </el-button>
                </div>
                <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
                  <template v-if="cate.data.length > 0">
                    <AudioItem v-for="audio in cate.data.slice(0, 3)" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
                  </template>
                  <template v-else>
                    <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                    <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">Coming Soon</span>
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
