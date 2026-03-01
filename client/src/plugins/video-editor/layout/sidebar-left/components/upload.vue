<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search, Close as X } from '@icon-park/vue-next';
import { ElButton, ElInput, ElSkeleton, ElUpload } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useMockStore } from 'video-editor/constants/mock';
import { uploadAssetToS3 } from 'video-editor/api/upload';
import { getFileUrl } from '@/utils/api';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';

import GMedia from '@/components/ui/GMedia.vue';
import AudioItem from './AudioItem.vue';

const editor = useEditorStore();
const mock = useMockStore();
const userMediaStore = useUserMediaStore();
const { t } = useI18n();

const uploadMutation = useMutation({
  mutationFn: async ({ file, type }: { type: "image" | "video" | "audio"; file: File }) => {
    return uploadAssetToS3(file, type);
  },
  onSuccess: (response, params) => {
    console.log("uploadMutation", response, params);
    switch (params.type) {
      case "image":
        userMediaStore.refreshImages();
        break;
      case "video":
        userMediaStore.refreshVideos();
        break;
      case "audio":
        userMediaStore.refreshAudios();
        break;
    }
  },
});

import { onMounted } from 'vue';
onMounted(() => {
  if (!userMediaStore.images.items.length) userMediaStore.loadImages();
  if (!userMediaStore.videos.items.length) userMediaStore.loadVideos();
  if (!userMediaStore.audios.items.length) userMediaStore.loadAudios();
});

const handleUpload = (options: any, type: "image" | "video" | "audio") => {
  const file = options.file;
  if (!file) return Promise.resolve();
  const promise = uploadMutation.mutateAsync({ file, type });
  toast.promise(promise, {
    loading: t('videoEditor.upload.uploadLoading'),
    success: t('videoEditor.upload.uploadSuccess'),
    error: t('videoEditor.upload.uploadError'),
  });
  return promise;
};

const onAddImage = async (source: string, thumbnail: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (((editor.canvas as any).replacer.active as any)?.type === "image") {
      const promise = (editor.canvas as any).replacer.replace(resolvedSource, true);
      toast.promise(promise, { loading: t('videoEditor.upload.replaceImageLoading'), success: t('videoEditor.upload.replaceImageSuccess'), error: t('videoEditor.upload.replaceImageError') });
    } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = (editor.canvas as any).onAddImageFromSource(resolvedSource);
      toast.promise(promise, { loading: t('videoEditor.upload.addImageLoading'), success: t('videoEditor.upload.addImageSuccess'), error: t('videoEditor.upload.addImageError') });
    } else {
      const promise = (editor.canvas as any).onAddImageFromThumbnail(resolvedSource, thumbnail);
      toast.promise(promise, { error: t('videoEditor.upload.addImageError') });
    }
  } catch (error) {
    console.error('Failed to resolve image source:', error);
    toast.error(t('videoEditor.upload.imageAddError'));
  }
};

const onAddVideo = async (source: string, thumbnail: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = (editor.canvas as any).onAddVideoFromSource(resolvedSource);
      toast.promise(promise, { loading: t('videoEditor.upload.addVideoLoading'), success: t('videoEditor.upload.addVideoSuccess'), error: t('videoEditor.upload.addVideoError') });
    } else {
      const promise = (editor.canvas as any).onAddVideoFromThumbnail(resolvedSource, thumbnail);
      toast.promise(promise, { error: t('videoEditor.upload.addVideoError') });
    }
  } catch (error) {
    console.error('Failed to resolve video source:', error);
    toast.error(t('videoEditor.upload.videoAddError'));
  }
};

// const handleClickAudio = (audio: any) => {
//   const promise = editor.canvas.audio.add(audio.source, audio.name);
//   toast.promise(promise, { loading: "The audio asset is being loaded...", success: "The audio asset has been added to timeline", error: "Ran into an error adding the audio asset" });
// };

const onAddAudio = async (audio: any) => {
  try {
    const resolvedSource = await getFileUrl(audio.source, { cached: true });
    const promise = (editor.canvas as any).onAddAudioFromSource(resolvedSource).then((element: any) => {
      (editor.canvas as any).audio.add(resolvedSource, audio.name, element.name);
    });
    toast.promise(promise, { loading: t('videoEditor.upload.addAudioLoading'), success: t('videoEditor.upload.addAudioSuccess'), error: t('videoEditor.upload.addAudioError') });
  } catch (error) {
    console.error('Failed to resolve audio source:', error);
    toast.error(t('videoEditor.upload.audioAddError'));
  }
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">{{ t('videoEditor.upload.title') }}</h2>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container">
      <div class="px-5 pt-4">
        <el-input :placeholder="t('videoEditor.upload.searchPlaceholder')" class="cinematic-input">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>
      <div class="px-5 flex flex-col pb-10">

        <!-- Images -->
        <div class="flex flex-col gap-4 py-6 border-b border-white/5">
          <div class="flex items-center justify-between">
            <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ t('videoEditor.upload.images') }}</h4>
            <div class="flex items-center gap-2">
              <el-upload :show-file-list="false" :http-request="(options) => handleUpload(options, 'image')"
                accept="image/*">
                <button
                  class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
                  <Plus :size="10" :stroke-width="4" />
                  <span>{{ t('videoEditor.upload.upload') }}</span>
                </button>
              </el-upload>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors">
                {{ t('videoEditor.upload.seeAll') }}
              </button>
            </div>
          </div>
          <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
            <template v-if="userMediaStore.images.items.length">
              <button v-for="item in userMediaStore.images.items" :key="item._id"
                @click="onAddImage(getFileUrl(item.url), getFileUrl(item.url))"
                class="group shrink-0 h-20 w-20 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                <GMedia :src="getFileUrl(item.url)"
                  class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
              </button>
            </template>
            <template v-else>
              <el-skeleton v-for="(_, index) in 3" :key="index" animated
                class="h-20 w-20 shrink-0 rounded-xl !bg-white/5" />
            </template>
          </div>
        </div>

        <!-- Videos -->
        <div class="flex flex-col gap-4 py-6 border-b border-white/5">
          <div class="flex items-center justify-between">
            <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ t('videoEditor.upload.videos') }}</h4>
            <div class="flex items-center gap-2">
              <el-upload :show-file-list="false" :http-request="(options) => handleUpload(options, 'video')"
                accept="video/*">
                <button
                  class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
                  <Plus :size="10" :stroke-width="4" />
                  <span>{{ t('videoEditor.upload.upload') }}</span>
                </button>
              </el-upload>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors">
                {{ t('videoEditor.upload.seeAll') }}
              </button>
            </div>
          </div>
          <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
            <template v-if="userMediaStore.videos.items.length">
              <button v-for="item in userMediaStore.videos.items" :key="item._id"
                @click="onAddVideo(getFileUrl(item.url), '')"
                class="group shrink-0 h-20 w-20 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                <GMedia :src="getFileUrl(item.url)"
                  class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
              </button>
            </template>
            <template v-else>
              <el-skeleton v-for="(_, index) in 3" :key="index" animated
                class="h-20 w-20 shrink-0 rounded-xl !bg-white/5" />
            </template>
          </div>
        </div>

        <!-- Audios -->
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center justify-between">
            <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ t('videoEditor.upload.audios') }}</h4>
            <div class="flex items-center gap-2">
              <el-upload :show-file-list="false" :http-request="(options) => handleUpload(options, 'audio')"
                accept="audio/*">
                <button
                  class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
                  <Plus :size="10" :stroke-width="4" />
                  <span>{{ t('videoEditor.upload.upload') }}</span>
                </button>
              </el-upload>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors">
                {{ t('videoEditor.upload.seeAll') }}
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
              <el-skeleton v-for="(_, index) in 3" :key="index" animated
                class="h-16 w-32 shrink-0 rounded-xl !bg-white/5" />
            </template>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<style scoped>
.fade-mask-r {
  mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
}
</style>
