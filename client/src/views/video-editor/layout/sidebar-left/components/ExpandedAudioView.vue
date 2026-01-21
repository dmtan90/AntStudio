<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { useAudioStore } from 'video-editor/hooks/use-audio';
import { toast } from 'vue-sonner';
import AudioItem from './AudioItem.vue';
const props = defineProps<{ match: string | false, query: string | null, category: string | null }>();

const editor = useEditorStore();
const audioStore = useAudioStore() as any;
const { sounds, musics, soundCategories, musicCategories, loading, error, hasNextPage, currentPage } = storeToRefs(audioStore) as any;

const onAddAudio = (audio: any) => {
  const promise = (editor.canvas as any).onAddAudioFromSource(audio.source).then(element => {
    (editor.canvas as any).audio.add(audio.source, audio.name, (element as any).name);
  });
  toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to artboard", error: "Ran into an error adding the audio asset" });
};

onMounted(() => {
  console.log("onMounted", props);
  handleResetData();
});

const handleLoadMore = () => {
  console.log("handleLoadMore => Audio");
  if(props.match == "sounds"){
    if(loading.value || !hasNextPage.value){
      return;
    }

    const nextPage = currentPage.value + 1;
    if(props.query){
      audioStore.searchSoundAppend(props.query, props.category, nextPage);
    }
    else{
      audioStore.loadSoundAppend(props.category, nextPage);  
    }
  }
  if(props.match == "musics"){
    if(loading.value || !hasNextPage.value){
      return;
    }

    const nextPage = currentPage.value + 1;
    if(props.query){
      audioStore.searchMusicAppend(props.query, props.category, nextPage);
    }
    else{
      audioStore.loadMusicAppend(props.category, nextPage);  
    }
  }
}

const handleResetData = () => {
  console.log("handleResetData => Audio");
  if(props.match == "sounds"){
    if(loading.value){
      return;
    }

    const nextPage = 0;
    if(props.query){
      audioStore.searchSound(props.query, props.category, nextPage);
    }
    else{
      audioStore.loadSound(props.category, nextPage);  
    }
  }
  if(props.match == "musics"){
    if(loading.value){
      return;
    }

    const nextPage = 0;
    if(props.query){
      audioStore.searchMusic(props.query, props.category, nextPage);
    }
    else{
      audioStore.loadMusic(props.category, nextPage);  
    }
  }
};

defineExpose({
  loadMore: handleLoadMore,
  resetData: handleResetData
})

</script>

<template>
  <template v-if="match === 'sounds'">
    <template v-if="sounds.length">
      <AudioItem v-for="audio in sounds" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
    </template>
    <template v-else>
      <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
      <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Audios</span>
    </template>
  </template>

  <template v-if="match === 'musics'">
    <template v-if="musics.length">
      <AudioItem v-for="audio in musics" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
    </template>
    <template v-else>
      <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
      <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Audios</span>
    </template>
  </template>
</template>
