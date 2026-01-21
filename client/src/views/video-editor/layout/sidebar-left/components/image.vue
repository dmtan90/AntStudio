<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { Plus, Search, Close as X, ArrowLeft as Left } from '@icon-park/vue-next';
import { storeToRefs } from "pinia";
import { cn } from "video-editor/lib/utils";

import { useEditorStore } from 'video-editor/store/editor';
import { usePexelsImages, type PexelsImage, PIXELS_IMAGE_CATEGORIES } from 'video-editor/hooks/use-pixels-image';
import { useUnsplashImages, type UnsplashImage, UNSPLASH_IMAGE_CATEGORIES } from 'video-editor/hooks/use-unsplash-image';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useMockStore } from 'video-editor/constants/mock';
import { uploadAssetToS3 } from 'video-editor/api/upload';
import { formatSource } from 'video-editor/lib/media';
import GMedia from '@/components/ui/GMedia.vue';
import ExpandedMediaView from './ExpandedMediaView.vue';

const editor = useEditorStore();
const mock = useMockStore();
const expanded = ref<false | string>(false);
const pixelsImageStore = usePexelsImages() as any;
const { images: pixelsImages } = storeToRefs(pixelsImageStore) as any;
const unsplashImageStore = useUnsplashImages() as any;
const { images: unsplashImages } = storeToRefs(unsplashImageStore) as any;
const refPixels = ref<any>(null);
const query = ref<string | null>(null);

const uploadMutation = useMutation({
  mutationFn: async (file: File) => uploadAssetToS3(file, "image"),
  onSuccess: (response) => mock.upload("image", response as any),
});

const handleUpload = (options: any) => {
  const file = options.file;
  if (!file) return;
  const promise = uploadMutation.mutateAsync(file);
  toast.promise(promise, {
    loading: `The images are being uploaded`,
    success: `The images have been successfully uploaded`,
    error: `Ran into an error while uploading the images`,
  });
  return promise;
};

const onAddImage = (source: string, thumbnail: string, preload: boolean) => {
  if (((editor.canvas as any).replacer.active as any)?.type === "image") {
    const promise = (editor.canvas as any).replacer.replace(source, true);
    toast.promise(promise, { loading: "The image is being replaced...", success: "The image has been replaced", error: "Ran into an error while replacing the image" });
  } else if (!preload || !thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddImageFromSource(source);
    toast.promise(promise, { loading: "The image is being loaded...", success: "The image has been added to artboard", error: "Ran into an error while adding the image" });
  } else {
    const promise = (editor.canvas as any).onAddImageFromThumbnail(source, thumbnail);
    toast.promise(promise, { error: "Ran into an error while adding the image" });
  }
};

onMounted(() => {
  pixelsImageStore.loadCuratedImages();
  unsplashImageStore.loadCuratedImages();
});

const handleLoadMore = () => {
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

const handleSearchImage = (search) => {
  if(query.value == search){
    return;
  }
  console.log("handleSearchImage", search);
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
      <h2 class="font-semibold">Images</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <div class="flex flex-1 justify-between px-4 py-4 gap-1" v-if="expanded">
      <el-button link circle @click="onBack">
        <Left :size="16" />
      </el-button>
      <el-input v-model="query" placeholder="Search Images..." class="text-xs" @change="handleResetData">
        <template #prefix>
          <Search :size="15" class="text-foreground/60" />
        </template>
      </el-input>
    </div>
    <el-scrollbar v-if="expanded" class="p-2">
      <div class="flex w-fit">
        <el-button text bg round :type="!query ? 'primary' : ''" @click='handleSearchImage(null)' class="capitalize">#Popular</el-button>
        <template v-for="item in PIXELS_IMAGE_CATEGORIES" :key="item">
          <el-button text bg round :type="query == item ? 'primary' : ''" @click='handleSearchImage(item)' class="capitalize">{{ '#' + item }}</el-button>
        </template>
      </div>
    </el-scrollbar>
    <section class="sidebar-container pb-4" @scrollend="handleLoadMore">
      <template v-if="!expanded">
        <div class="px-3 flex flex-col gap-6 py-3">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-semibold line-clamp-1">Uploads</h4>
              <el-upload
                :show-file-list="false"
                :http-request="handleUpload"
                accept="image/*"
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
              <template v-if="mock.images.length">
                <button v-for="({ source, thumbnail }) in mock.images" :key="source" @click="onAddImage(source, thumbnail, true)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <GMedia :src="thumbnail" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Images</span>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Pixels</h4>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="expanded = 'pixelsImages'">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="pixelsImages.length">
                <button v-for="({ preview, details: { src } }) in pixelsImages.slice(0, 4)" :key="preview" @click="onAddImage(src, preview, true)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Images</span>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Unsplash</h4>
              <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5" @click="expanded = 'unsplashImages'">
                See All
              </el-button>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="unsplashImages.length">
                <button v-for="({ preview, details: { src } }) in unsplashImages.slice(0, 4)" :key="preview" @click="onAddImage(src, preview, true)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Images</span>
              </template>
            </div>
          </div>
          <!--<div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Product Kit</h4>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="!editor.adapter.product || !editor.adapter.product.images.length">
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">No product kit found</span>
              </template>
              <template v-else>
                <button v-for="(image) in editor.adapter.product.images" :key="image.id" @click="onAddImage(formatSource(image.url), false)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <img :src="formatSource(image.url)" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-xs font-semibold line-clamp-1">Brand Kit</h4>
            </div>
            <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative">
              <template v-if="!editor.adapter.brand || !editor.adapter.brand.brand_logo">
                <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
                <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">No brand kit found</span>
              </template>
              <template v-else>
                <button @click="onAddImage(formatSource(editor.adapter.brand.brand_logo), false)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                  <img :src="formatSource(editor.adapter.brand.brand_logo)" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
                </button>
              </template>
            </div>
          </div>-->
        </div>
      </template>
      <template v-else>
        <div class="px-3 grid grid-cols-2 gap-2.5 pt-4">
          <ExpandedMediaView ref="refPixels" :match="expanded" :query="query" />
        </div>
      </template>
    </section>
  </div>
</template>