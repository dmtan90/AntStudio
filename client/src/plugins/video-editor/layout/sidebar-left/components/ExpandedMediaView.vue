<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch } from "vue";
import { useI18n } from 'vue-i18n';
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { usePexelsImages, type PexelsImage } from 'video-editor/hooks/use-pixels-image';
import { usePexelsVideos, type PexelsVideo } from 'video-editor/hooks/use-pixels-video';
import { useUnsplashImages, type UnsplashImage } from "video-editor/hooks/use-unsplash-image";
import { abstract, basic, frames } from 'video-editor/constants/elements';
import { isImageLoaded } from 'video-editor/lib/utils';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import GMedia from '@/components/ui/GMedia.vue';

const props = defineProps<{ match: string, query: string | null }>();
const { t } = useI18n();
const editor = useEditorStore();
const pixelsImageStore = usePexelsImages();
const unsplashImageStore = useUnsplashImages();
const videoStore = usePexelsVideos();
const userMediaStore = useUserMediaStore();
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

const onAddPixelsImage = async (source: string, thumbnail: string, preload: boolean, id?: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (editor.canvas.replacer.active?.type === "image") {
      const promise = editor.canvas.replacer.replace(resolvedSource, true);
      toast.promise(promise, { loading: t('videoEditor.image.replaceImageLoading'), success: t('videoEditor.image.replaceImageSuccess'), error: t('videoEditor.image.replaceImageError') });
    } else if (!preload || !thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = editor.canvas.onAddImageFromSource(resolvedSource, { meta: { mediaId: id } });
      toast.promise(promise, { loading: t('videoEditor.image.addImageLoading'), success: t('videoEditor.image.addImageSuccess'), error: t('videoEditor.image.addImageError') });
    } else {
      const promise = editor.canvas.onAddImageFromThumbnail(resolvedSource, thumbnail as any);
      toast.promise(promise, { error: t('videoEditor.image.addImageError') });
    }
  } catch (error) {
    console.error('Failed to resolve image source:', error);
    toast.error(t('videoEditor.image.loadError'));
  }
};

const onAddPixelsVideo = async (source: string, thumbnail: string, id?: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (editor.canvas.replacer.active?.type === "video") {
      const promise = editor.canvas.replacer.replace(resolvedSource, true, thumbnail);
      toast.promise(promise, { loading: t('videoEditor.video.replaceVideoLoading'), success: t('videoEditor.video.replaceVideoSuccess'), error: t('videoEditor.video.replaceVideoError') });
    } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = editor.canvas.onAddVideoFromSource(resolvedSource, { thumbnail, meta: { mediaId: id } });
      toast.promise(promise, { loading: t('videoEditor.video.addVideoLoading'), success: t('videoEditor.video.addVideoSuccess'), error: t('videoEditor.video.addError') });
    } else {
      toast.promise(editor.canvas.onAddVideoFromThumbnail(resolvedSource, thumbnail), { error: t('videoEditor.video.addError') });
    }
  } catch (error) {
    console.error('Failed to resolve video source:', error);
    toast.error(t('videoEditor.video.loadError'));
  }
};

onMounted(() => {
  if (props.match == "pixelsImages") {
    pixelsImageStore.loadCuratedImages();
  }
  else if (props.match == "unsplashImages") {
    unsplashImageStore.loadCuratedImages();
  }
  else if (props.match == "pixelsVideos") {
    videoStore.loadPopularVideos();
  }
  else if (props.match == "userImages") {
    userMediaStore.loadImages();
  }
  else if (props.match == "userVideos") {
    userMediaStore.loadVideos();
  }
});

const handleLoadMore = () => {
  console.log("handleLoadMore => PIXELS");
  if (props.match == "pixelsImages") {
    if (pixelsImagesLoading.value || !pixelsImagesHasNextPage.value) {
      return;
    }

    const nextPage = pixelsImagesCurrentPage.value + 1;
    if (props.query) {
      pixelsImageStore.searchImagesAppend(props.query, nextPage);
    }
    else {
      pixelsImageStore.loadCuratedImagesAppend(nextPage);
    }
  }
  else if (props.match == "unsplashImages") {
    if (unsplashImagesLoading.value || !unsplashImagesHasNextPage.value) {
      return;
    }

    const nextPage = unsplashImagesCurrentPage.value + 1;
    if (props.query) {
      unsplashImageStore.searchImagesAppend(props.query, nextPage);
    }
    else {
      unsplashImageStore.loadCuratedImagesAppend(nextPage);
    }
  }
  else if (props.match == "pixelsVideos") {
    if (pixelsVideosLoading.value || !pixelsVideosHasNextPage.value) {
      return;
    }

    const nextPage = pixelsVideosCurrentPage.value + 1;
    if (props.query) {
      videoStore.searchVideosAppend(props.query, nextPage);
    }
    else {
      videoStore.loadPopularVideosAppend(nextPage);
    }
  }
  else if (props.match == "userImages") {
    if (userMediaStore.images.loading || userMediaStore.images.page >= userMediaStore.images.pages) return;
    userMediaStore.loadImages(userMediaStore.images.page + 1);
  }
  else if (props.match == "userVideos") {
    if (userMediaStore.videos.loading || userMediaStore.videos.page >= userMediaStore.videos.pages) return;
    userMediaStore.loadVideos(userMediaStore.videos.page + 1);
  }
}

const handleResetData = () => {
  console.log("handleResetData => PIXELS");
  if (props.match == "pixelsImages") {
    if (pixelsImagesLoading.value) {
      return;
    }

    const nextPage = 1;
    if (props.query) {
      pixelsImageStore.searchImages(props.query, nextPage);
    }
    else {
      pixelsImageStore.loadCuratedImages(nextPage);
    }
  }
  else if (props.match == "unsplashImages") {
    if (unsplashImagesLoading.value) {
      return;
    }

    const nextPage = 1;
    if (props.query) {
      unsplashImageStore.searchImages(props.query, nextPage);
    }
    else {
      unsplashImageStore.loadCuratedImages(nextPage);
    }
  }
  else if (props.match == "pixelsVideos") {
    if (pixelsVideosLoading.value) {
      return;
    }

    const nextPage = 1;
    if (props.query) {
      videoStore.searchVideos(props.query, nextPage);
    }
    else {
      videoStore.loadPopularVideos(nextPage);
    }
  }
  else if (props.match == "userImages") {
    userMediaStore.refreshImages();
  }
  else if (props.match == "userVideos") {
    userMediaStore.refreshVideos();
  }
};

defineExpose({
  loadMore: handleLoadMore,
  resetData: handleResetData
})

</script>

<template>
  <template v-if="match === 'pixelsImages'">
    <template v-if="pixelsImages.length">
      <button v-for="({ preview, details: { src } }) in pixelsImages" :key="preview"
        @click="onAddPixelsImage(src, preview, true)"
        class="group shrink-0 h-32 w-full border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/20">
        <img :src="getFileUrl(preview)" crossOrigin="anonymous"
          class="h-full w-full transition-transform duration-500 group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
      </button>
    </template>
    <template v-else>
      <div class="col-span-2 flex flex-col items-center justify-center p-10 gap-2 min-h-[200px]"
        v-if="(pixelsImagesLoading as any)?.value === false && (pixelsImagesHasNextPage as any)?.value === false">
        <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">{{ t('videoEditor.image.noImagesFound') }}</span>
      </div>
      <el-skeleton v-for="i in 8" :key="i" animated class="h-32 w-full rounded-xl !bg-white/5" v-else />
    </template>
  </template>

  <template v-else-if="match === 'unsplashImages'">
    <template v-if="unsplashImages.length">
      <button v-for="({ preview, details: { src } }) in unsplashImages" :key="preview"
        @click="onAddPixelsImage(src, preview, true)"
        class="group shrink-0 h-32 w-full border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/20">
        <img :src="getFileUrl(preview)" crossOrigin="anonymous"
          class="h-full w-full transition-transform duration-500 group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
      </button>
    </template>
    <template v-else>
      <div class="col-span-2 flex flex-col items-center justify-center p-10 gap-2 min-h-[200px]"
        v-if="(unsplashImagesLoading as any)?.value === false && (unsplashImagesHasNextPage as any)?.value === false">
        <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">{{ t('videoEditor.image.noImagesFound') }}</span>
      </div>
      <el-skeleton v-for="i in 8" :key="i" animated class="h-32 w-full rounded-xl !bg-white/5" v-else />
    </template>
  </template>

  <template v-else-if="match === 'userImages'">
    <template v-if="userMediaStore.images.items.length">
      <button v-for="item in userMediaStore.images.items" :key="item._id"
        @click="onAddPixelsImage(item.url, item.url, true, item._id)"
        class="group shrink-0 h-32 w-full border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/20">
        <GMedia :src="getFileUrl(item.url)"
          class="h-full w-full transition-transform duration-500 group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
      </button>
    </template>
    <template v-else>
      <div class="col-span-2 flex flex-col items-center justify-center p-10 gap-2 min-h-[200px]"
        v-if="!userMediaStore.images.loading">
        <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">{{ t('videoEditor.image.noImagesFound') }}</span>
      </div>
      <el-skeleton v-for="i in 8" :key="i" animated class="h-32 w-full rounded-xl !bg-white/5" v-else />
    </template>
  </template>

  <template v-else-if="match === 'userVideos'">
    <template v-if="userMediaStore.videos.items.length">
      <button v-for="item in userMediaStore.videos.items" :key="item._id"
        @click="onAddPixelsVideo(item.url, '', item._id)"
        class="group shrink-0 h-32 w-full border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/20">
        <GMedia :src="getFileUrl(item.url)"
          class="h-full w-full transition-transform duration-500 group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
      </button>
    </template>
    <template v-else>
      <div class="col-span-2 flex flex-col items-center justify-center p-10 gap-2 min-h-[200px]"
        v-if="!userMediaStore.videos.loading">
        <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">{{ t('videoEditor.video.noVideosFound') }}</span>
      </div>
      <el-skeleton v-for="i in 8" :key="i" animated class="h-32 w-full rounded-xl !bg-white/5" v-else />
    </template>
  </template>

  <template v-else-if="match === 'pixelsVideos'">
    <template v-if="pixelsVideos.length">
      <button v-for="({ preview, details: { src } }, index) in pixelsVideos" :key="preview"
        @click="onAddPixelsVideo(src, preview)" @mouseenter="(pixelsVideos[index] as any).play = true"
        @mouseleave="(pixelsVideos[index] as any).play = false"
        class="relative group shrink-0 h-32 w-full border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/20">

        <!-- Video Preview Overlay -->
        <Transition name="fade">
          <div v-if="pixelsVideos[index].play" class="absolute inset-0 z-10 w-full h-full">
            <video :src="getFileUrl(src)" class="h-full w-full object-cover" autoplay loop muted />
            <div class="absolute inset-0 bg-black/20"></div>
          </div>
        </Transition>

        <img :src="getFileUrl(preview)" crossOrigin="anonymous"
          class="h-full w-full transition-transform duration-500 group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />

        <div
          class="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md rounded-md px-2 py-0.5 border border-white/10 z-20 group-hover:opacity-0 transition-opacity"
          v-if="!pixelsVideos[index].play">
          <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest">{{ t('videoEditor.video.videoLabel') }}</span>
        </div>
      </button>
    </template>
    <template v-else>
      <div class="col-span-2 flex flex-col items-center justify-center p-10 gap-2 min-h-[200px]"
        v-if="(pixelsVideosLoading as any)?.value === false && (pixelsVideosHasNextPage as any)?.value === false">
        <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">{{ t('videoEditor.video.noVideosFound') }}</span>
      </div>
      <el-skeleton v-for="i in 8" :key="i" animated class="h-32 w-full rounded-xl !bg-white/5" v-else />
    </template>
  </template>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
