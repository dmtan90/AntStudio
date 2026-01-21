<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { usePexelsImages, type PexelsImage } from 'video-editor/hooks/use-pixels-image';
import { usePexelsVideos, type PexelsVideo } from 'video-editor/hooks/use-pixels-video';
import { useUnsplashImages, type UnsplashImage } from "video-editor/hooks/use-unsplash-image";
import { abstract, basic, frames } from 'video-editor/constants/elements';
import { isImageLoaded } from 'video-editor/lib/utils';
import { toast } from 'vue-sonner';

const props = defineProps<{ match: string, query: string | null }>();

const editor = useEditorStore();
const pixelsImageStore = usePexelsImages();
const unsplashImageStore = useUnsplashImages();
const videoStore = usePexelsVideos();
const { images: pixelsImages, loading: pixelsImagesLoading, 
  error: pixelsImagesError, hasNextPage: pixelsImagesHasNextPage, currentPage: pixelsImagesCurrentPage 
} = storeToRefs(pixelsImageStore);

const { images: unsplashImages, loading: unsplashImagesLoading, 
  error: unsplashImagesError, hasNextPage: unsplashImagesHasNextPage, currentPage: unsplashImagesCurrentPage 
} = storeToRefs(unsplashImageStore);

const { videos: pixelsVideos, loading: pixelsVideosLoading, 
  error: pixelsVideosError, hasNextPage: pixelsVideosHasNextPage, currentPage: pixelsVideosCurrentPage 
} = storeToRefs(videoStore);


watch(props, (value) => {
  console.log("props", value);
});

const onAddPixelsImage = (source: string, thumbnail: string, preload: boolean) => {
  if (editor.canvas.replacer.active?.type === "image") {
    const promise = editor.canvas.replacer.replace(source, true);
    toast.promise(promise, { loading: "The image is being replaced...", success: "The image has been replaced", error: "Ran into an error while replacing the image" });
  } else if (!preload || !thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = editor.canvas.onAddImageFromSource(source);
    toast.promise(promise, { loading: "The image is being loaded...", success: "The image has been added to artboard", error: "Ran into an error while adding the image" });
  } else {
    const promise = editor.canvas.onAddImageFromThumbnail(source, thumbnail);
    toast.promise(promise, { error: "Ran into an error while adding the image" });
  }
};

const onAddPixelsVideo = (source: string, thumbnail: string) => {
  if (editor.canvas.replacer.active?.type === "video") {
    const promise = editor.canvas.replacer.replace(source, true, thumbnail);
    toast.promise(promise, { loading: "The video is being replaced...", success: "The video has been replaced", error: "Ran into an error while replacing the video" });
  } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = editor.canvas.onAddVideoFromSource(source, { thumbnail });
    toast.promise(promise, { loading: "The video asset is being loaded...", success: "The video asset has been added to artboard", error: "Ran into an error adding the video asset" });
  } else {
    toast.promise(editor.canvas.onAddVideoFromThumbnail(source, thumbnail), { error: "Ran into an error adding the video asset" });
  }
};

onMounted(() => {
  if(props.match == "pixelsImages"){
    pixelsImageStore.loadCuratedImages();
  }
  else if(props.match == "unsplashImages"){
    unsplashImageStore.loadCuratedImages();
  }
  else if(props.match == "pixelsVideos"){
    videoStore.loadPopularVideos();
  }
});

const handleLoadMore = () => {
  console.log("handleLoadMore => PIXELS");
  if(props.match == "pixelsImages"){
    if(pixelsImagesLoading.value || !pixelsImagesHasNextPage.value){
      return;
    }

    const nextPage = pixelsImagesCurrentPage.value + 1;
    if(props.query){
      pixelsImageStore.searchImagesAppend(props.query, nextPage);
    }
    else{
      pixelsImageStore.loadCuratedImagesAppend(nextPage);  
    }
  }
  else if(props.match == "unsplashImages"){
    if(unsplashImagesLoading.value || !unsplashImagesHasNextPage.value){
      return;
    }

    const nextPage = unsplashImagesCurrentPage.value + 1;
    if(props.query){
      unsplashImageStore.searchImagesAppend(props.query, nextPage);
    }
    else{
      unsplashImageStore.loadCuratedImagesAppend(nextPage);  
    }
  }
  else if(props.match == "pixelsVideos"){
    if(pixelsVideosLoading.value || !pixelsVideosHasNextPage.value){
      return;
    }

    const nextPage = pixelsVideosCurrentPage.value + 1;
    if(props.query){
      videoStore.searchVideosAppend(props.query, nextPage);
    }
    else{
      videoStore.loadPopularVideosAppend(nextPage);  
    }
  }
}

const handleResetData = () => {
  console.log("handleResetData => PIXELS");
  if(props.match == "pixelsImages"){
    if(pixelsImagesLoading.value){
      return;
    }

    const nextPage = 1;
    if(props.query){
      pixelsImageStore.searchImages(props.query, nextPage);
    }
    else{
      pixelsImageStore.loadCuratedImages(nextPage);  
    }
  }
  else if(props.match == "unsplashImages"){
    if(unsplashImagesLoading.value){
      return;
    }

    const nextPage = 1;
    if(props.query){
      unsplashImageStore.searchImages(props.query, nextPage);
    }
    else{
      unsplashImageStore.loadCuratedImages(nextPage);  
    }
  }
  else if(props.match == "pixelsVideos"){
    if(pixelsVideosLoading.value){
      return;
    }

    const nextPage = 1;
    if(props.query){
      videoStore.searchVideos(props.query, nextPage);
    }
    else{
      videoStore.loadPopularVideos(nextPage);  
    }
  }
};

defineExpose({
  loadMore: handleLoadMore,
  resetData: handleResetData
})

</script>

<template>
  <template v-if="match === 'pixelsImages'">
    <button v-for="({ preview, details: { src } }) in pixelsImages" :key="preview" 
      @click="onAddPixelsImage(src, preview, true)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>
  <template v-else-if="match === 'unsplashImages'">
    <button v-for="({ preview, details: { src } }) in unsplashImages" :key="preview" 
      @click="onAddPixelsImage(src, preview, true)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>
  <template v-else-if="match === 'pixelsVideos'">
    <button v-for="({ preview, details: { src } }, index) in pixelsVideos" :key="preview" 
      @click="onAddPixelsVideo(src, preview)"
      @mouseover="(pixelsVideos[index] as any).play = true" @mouseleave="(pixelsVideos[index] as any).play = false"
      class="relative group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <video v-if="pixelsVideos[index].play" :src="src" class="absolute left-0 top-0 z-10 h-full w-full object-cover" autoplay loop />
      <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>
</template>
