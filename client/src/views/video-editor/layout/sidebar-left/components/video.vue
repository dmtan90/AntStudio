<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { storeToRefs } from "pinia";
import { Plus, Search, Close as X, ArrowLeft as Left, Filter } from '@icon-park/vue-next';
import { usePexelsVideos, type PexelsVideo, PIXELS_VIDEO_CATEGORIES } from 'video-editor/hooks/use-pixels-video';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';

import { useEditorStore } from 'video-editor/store/editor';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useMockStore } from 'video-editor/constants/mock';
import { uploadAssetToS3 } from 'video-editor/api/upload';
import { getFileUrl } from '@/utils/api';
import GMedia from '@/components/ui/GMedia.vue';
import ExpandedMediaView from './ExpandedMediaView.vue';

const editor = useEditorStore();
const mock = useMockStore();
const userMediaStore = useUserMediaStore();
const expanded = ref<false | string>(false);
const videoStore = usePexelsVideos() as any;
const { videos: pixelsVideos } = storeToRefs(videoStore) as any;
const refPixels = ref<any>(null);
const query = ref<string | null>(null);

const uploadMutation = useMutation({
  mutationFn: async (file: File) => uploadAssetToS3(file, "video"),
  onSuccess: (response) => {
    userMediaStore.refreshVideos();
  },
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

const onAddVideo = async (source: string, thumbnail: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (((editor.canvas as any).replacer.active as any)?.type === "video") {
      const promise = (editor.canvas as any).replacer.replace(resolvedSource, true, thumbnail);
      toast.promise(promise, { loading: "The video is being replaced...", success: "The video has been replaced", error: "Ran into an error while replacing the video" });
    } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = (editor.canvas as any).onAddVideoFromSource(resolvedSource, { thumbnail });
      toast.promise(promise, { loading: "The video asset is being loaded...", success: "The video asset has been added to artboard", error: "Ran into an error adding the video asset" });
    } else {
      toast.promise((editor.canvas as any).onAddVideoFromThumbnail(resolvedSource, thumbnail), { error: "Ran into an error adding the video asset" });
    }
  } catch (error) {
    console.error('Failed to resolve video source:', error);
    toast.error("Failed to load video asset");
  }
};

onMounted(() => {
  videoStore.loadPopularVideos();
  userMediaStore.loadVideos();
});

const handleLoadMore = () => {
  // console.log("handleLoadMore", refPixels.value);
  if (refPixels.value && refPixels.value.loadMore) {
    refPixels.value?.loadMore();
  }
}

const handleResetData = () => {
  if (refPixels.value && refPixels.value.resetData) {
    nextTick(() => {
      refPixels.value?.resetData();
    })
  }
};

const handleSearchVideo = (search) => {
  if (query.value == search) {
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
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Videos</h2>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>

    <!-- Expanded Search Header -->
    <div class="px-5 pt-4 pb-2" v-if="expanded">
      <div class="flex gap-2 mb-3">
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5 bg-white/5"
          @click="onBack">
          <Left :size="14" />
        </button>
        <el-input v-model="query" placeholder="Search videos..." class="cinematic-input flex-1"
          @change="handleResetData">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>

      <el-scrollbar class="pb-2 scrollbar-hidden">
        <div class="flex gap-2">
          <button
            class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap"
            :class="[!query ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white']"
            @click='handleSearchVideo(null)'>
            Popular
          </button>
          <template v-for="item in PIXELS_VIDEO_CATEGORIES" :key="item">
            <button
              class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border capitalize whitespace-nowrap"
              :class="[query == item ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white']"
              @click='handleSearchVideo(item)'>
              {{ item }}
            </button>
          </template>
        </div>
      </el-scrollbar>
    </div>

    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container pb-4 pt-2" @scrollend="handleLoadMore">
      <template v-if="!expanded">
        <div class="px-5 flex flex-col gap-6 pt-2">

          <!-- Uploads -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Uploads</h4>
              <div class="flex items-center gap-2">
                <el-upload :show-file-list="false" :http-request="handleUpload" accept="video/*">
                  <button
                    class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
                    <Plus :size="10" :stroke-width="4" />
                    <span>Upload</span>
                  </button>
                </el-upload>
                <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                  @click="expanded = 'userVideos'" v-if="userMediaStore.videos.items.length > 3">
                  See All
                </button>
              </div>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="userMediaStore.videos.items.length">
                <button v-for="(item) in userMediaStore.videos.items" :key="item._id"
                  @click="onAddVideo(getFileUrl(item.url), '')"
                  class="group shrink-0 h-20 w-20 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                  <GMedia :src="getFileUrl(item.url)"
                    class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
                </button>
              </template>
              <template v-else>
                <div
                  class="w-full h-20 border border-white/5 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-white/20">
                  <span class="text-[10px] font-bold uppercase tracking-widest">No Uploads</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Pixels (Stock) -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stock Videos</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors"
                @click="expanded = 'pixelsVideos'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="pixelsVideos.length > 0">
                <button v-for="({ preview, details: { src } }) in pixelsVideos.slice(0, 4)" :key="preview"
                  @click="onAddVideo(src, preview)"
                  class="group shrink-0 h-20 w-20 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                  <GMedia :src="preview" crossOrigin="anonymous"
                    class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 4" :key="index" animated
                  class="h-20 w-20 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="px-5 grid grid-cols-2 gap-4 pt-4 pb-10">
          <ExpandedMediaView :match="expanded" :query="query" ref="refPixels" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.fade-mask-r {
  mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
}
</style>