<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search, Close as X } from '@icon-park/vue-next';
import { ElButton, ElInput, ElSkeleton, ElUpload } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useMockStore } from 'video-editor/constants/mock';
import { uploadAssetToS3 } from 'video-editor/api/upload';

import GMedia from '@/components/ui/GMedia.vue';
import AudioItem from './AudioItem.vue';

const editor = useEditorStore();
const mock = useMockStore();

const uploadMutation = useMutation({
  mutationFn: async ({ file, type }: { type: "image" | "video" | "audio"; file: File }) => {
    return uploadAssetToS3(file, type);
  },
  onSuccess: (response, params) => {
    console.log("uploadMutation", response, params);
    switch (params.type) {
      case "image":
        mock.upload("image", response as any);
        break;
      case "video":
        mock.upload("video", response as any);
        break;
      case "audio":
        mock.upload("audio", response as any);
        break;
    }
  },
});

const handleUpload = (options: any, type: "image" | "video" | "audio") => {
  const file = options.file;
  if (!file) return Promise.resolve();
  const promise = uploadMutation.mutateAsync({ file, type });
  toast.promise(promise, {
    loading: `The assets are being uploaded`,
    success: `The assets have been successfully uploaded`,
    error: `Ran into an error while uploading the assets`,
  });
  return promise;
};

const onAddImage = (source: string, thumbnail: string) => {
  if (((editor.canvas as any).replacer.active as any)?.type === "image") {
    const promise = (editor.canvas as any).replacer.replace(source, true);
    toast.promise(promise, { loading: "The image is being replaced...", success: "The image has been replaced", error: "Ran into an error while replacing the image" });
  } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddImageFromSource(source);
    toast.promise(promise, { loading: "The image is being loaded...", success: "The image has been added to artboard", error: "Ran into an error adding the image asset" });
  } else {
    const promise = (editor.canvas as any).onAddImageFromThumbnail(source, thumbnail);
    toast.promise(promise, { error: "Ran into an error adding the image asset" });
  }
};

const onAddVideo = (source: string, thumbnail: string) => {
  if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddVideoFromSource(source);
    toast.promise(promise, { loading: "The video asset is being loaded...", success: "The video asset has been added to artboard", error: "Ran into an error adding the video asset" });
  } else {
    const promise = (editor.canvas as any).onAddVideoFromThumbnail(source, thumbnail);
    toast.promise(promise, { error: "Ran into an error adding the video asset" });
  }
};

// const handleClickAudio = (audio: any) => {
//   const promise = editor.canvas.audio.add(audio.source, audio.name);
//   toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to timeline", error: "Ran into an error adding the audio asset" });
// };

const onAddAudio = (audio: any) => {
  const promise = (editor.canvas as any).onAddAudioFromSource(audio.source).then((element: any) => {
    console.log(element);
    (editor.canvas as any).audio.add(audio.source, audio.name, element.name);
  });
  toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to artboard", error: "Ran into an error adding the audio asset" });
};

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Uploads</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <section class="sidebar-container pb-4">
      <div class="px-3 pt-4">
        <el-input placeholder="Search..." class="text-xs" >
          <template #prefix>
            <Search :size="15" class="text-foreground/60" />
          </template>
        </el-input>
      </div>
      <div class="px-3 flex flex-col divide-y">
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-semibold line-clamp-1">Images</h4>
            <el-upload
              :show-file-list="false"
              :http-request="(options) => handleUpload(options, 'image')"
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
              <button v-for="({ source, thumbnail }) in mock.images" :key="source" @click="onAddImage(source, thumbnail)" class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md shadow-sm">
                <GMedia :src="thumbnail" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
              </button>
            </template>
            <template v-else>
              <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
              <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Images</span>
            </template>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-semibold line-clamp-1">Videos</h4>
            <el-upload
              :show-file-list="false"
              :http-request="(options) => handleUpload(options, 'video')"
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
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-semibold line-clamp-1">Audios</h4>
            <el-upload
              :show-file-list="false"
              :http-request="(options) => handleUpload(options, 'audio')"
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
              <AudioItem v-for="audio in mock.audios" :key="audio.source" :audio="audio" @click="onAddAudio(audio)" />
            </template>
            <template v-else>
              <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
              <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Audios</span>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
