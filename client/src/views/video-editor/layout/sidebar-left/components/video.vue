<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { storeToRefs } from "pinia";
import { Plus, Search, Close as X, ArrowLeft as Left, Filter } from '@icon-park/vue-next';
import { usePexelsVideos, type PexelsVideo, PIXELS_VIDEO_CATEGORIES } from 'video-editor/hooks/use-pixels-video';

import { useEditorStore } from 'video-editor/store/editor';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useMockStore } from 'video-editor/constants/mock';
import { uploadAssetToS3 } from 'video-editor/api/upload';
import GMedia from '@/components/ui/GMedia.vue';
import ExpandedMediaView from './ExpandedMediaView.vue';

const editor = useEditorStore();
const mock = useMockStore();
const expanded = ref<false | string>(false);
const videoStore = usePexelsVideos() as any;
const { videos: pixelsVideos } = storeToRefs(videoStore) as any;
const refPixels = ref<any>(null);
const query = ref<string | null>(null);

const uploadMutation = useMutation({
  mutationFn: async (file: File) => uploadAssetToS3(file, "video"),
  onSuccess: (response) => mock.upload("video", response as any),
});

const handleUpload = (options: any) => {
  const file = options.file;
  if (!file) return;
  const promise = uploadMutation.mutateAsync(file);
  toast.promise(promise, {
    loading: `Your video asset is being uploaded...`,
    success: `Video has been successfully uploaded`,
    error: `Ran into an error while uploading the video`,
  });
  return promise;
};

const onAddVideo = (source: string, thumbnail: string) => {
  if (((editor.canvas as any).replacer.active as any)?.type === "video") {
    const promise = (editor.canvas as any).replacer.replace(source, true, thumbnail);
    toast.promise(promise, { loading: "The video is being replaced...", success: "The video has been replaced", error: "Ran into an error while replacing the video" });
  } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddVideoFromSource(source, {thumbnail});
    toast.promise(promise, { loading: "The video asset is being loaded...", success: "The video asset has been added to artboard", error: "Ran into an error adding the video asset" });
  } else {
    toast.promise((editor.canvas as any).onAddVideoFromThumbnail(source, thumbnail), { error: "Ran into an error adding the video asset" });
  }
};

onMounted(() => {
  videoStore.loadPopularVideos();
});

const handleLoadMore = () => {
  // console.log("handleLoadMore", refPixels.value);
  if(refPixels.value && refPixels.value.loadMore){
    refPixels.value?.loadMore();
  }
}

const handleResetData = () => {
  if(refPixels.value && refPixels.value.resetData){
    nextTick(() => {
      refPixels.value?.resetData();
    })
  }
};

const handleSearchVideo = (search) => {
  if(query.value == search){
    return;
  }
  console.log("handleSearchVideo", search);
  query.value = search;
  handleResetData();
}

const onBack = () => {
  expanded.value = false;
  query.value = null;
}

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Videos</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <div class="flex flex-1 justify-between px-4 py-4 gap-1" v-if="expanded">
      <el-button link circle @click="onBack">
        <Left :size="16" />
      </el-button>
      <el-input v-model="query" placeholder="Search videos..." class="text-xs" @change="handleResetData">
        <template #prefix>
          <Search :size="15" class="text-foreground/60" />
        </template>
      </el-input>
    </div>
    <el-scrollbar v-if="expanded" class="p-2">
      <div class="flex w-fit">
        <el-button text bg round :type="!query ? 'primary' : ''" @click='handleSearchVideo(null)' class="capitalize">#Popular</el-button>
        <template v-for="item in PIXELS_VIDEO_CATEGORIES" :key="item">
          <el-button text bg round :type="query == item ? 'primary' : ''" @click='handleSearchVideo(item)' class="capitalize">{{ '#' + item }}</el-button>
        </template>
      </div>
    </el-scrollbar>
    <section class="sidebar-container pb-4 pt-4" @scrollend="handleLoadMore">
      <template v-if="!expanded">
        <div class="px-3 flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-semibold line-clamp-1">Uploads</h4>
              <el-upload
                :show-file-list="false"
                :http-request="handleUpload"
                accept="video/*"
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
              <template v-if="mock.videos.length">
                <button v-for="({ source, thumbnail }) in mock.videos" :key="source" @click="onAddVideo(source, thumbnail)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <GMedia :src="thumbnail" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Videos</span>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Pixels</h4>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="expanded = 'pixelsVideos'">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="pixelsVideos.length > 0">
                <button v-for="({ preview, details: { src } }) in pixelsVideos.slice(0, 4)" :key="preview" @click="onAddVideo(src, preview)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
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
        <div class="px-3 grid grid-cols-2 gap-2.5 pt-4">
          <ExpandedMediaView :match="expanded" :query="query" ref="refPixels"/>
        </div>
      </template>
    </section>
  </div>
</template>