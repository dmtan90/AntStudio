<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Forbid as Ban, CheckOne as CircleCheckBig, Close, Export } from '@icon-park/vue-next';
import Spinner from 'video-editor/components/ui/spinner.vue';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";
import { ExportProgress, type ExportMode } from 'video-editor/plugins/editor';
import { createFileDownload, createFileDownloads } from 'video-editor/lib/utils';
import { codecs, fetchExtensionByCodec, fps, scales } from 'video-editor/constants/recorder';

import ProgressIcon from './ProgressIcon.vue';
import ProgressText from './ProgressText.vue';

const editor = useEditorStore();
const { dimension } = storeToRefs(editor);
const codec = computed(() => fetchExtensionByCodec(editor.codec));
const progress = computed(() => editor.progress.capture * 0.6 + editor.progress.compile * 0.4);
const videoSource = ref(editor.blob ? URL.createObjectURL(editor.blob) : null);
const exportScale = ref(1);

const handleExportVideo = async () => {
  try {
    if(videoSource.value){
      URL.revokeObjectURL(videoSource.value);
    }
    videoSource.value = null;
    const blob = await editor.exportVideo();
    if(blob){
      const file = (editor.file || "output") + "." + codec.value.extension;
      createFileDownload(blob, file);
      videoSource.value = URL.createObjectURL(blob);  
    }
    else{
      toast.error("Failed to export video");  
    }
  } catch (e) {
    const error = e as Error;
    console.warn(error);
    toast.error(error.message || "Failed to export video");
  }
};

const exportFps = computed({
  get(){
    return editor.fps;
  },

  set(value){
    editor.onChangeExportFPS(value);
  }
});

const exportCodec = computed({
  get(){
    return editor.codec;
  },

  set(value){
    editor.onChangeExportCodec(value);
  }
});

// const exportScale = computed({
//   get(){
//     return scale;
//   },

//   set(value){
//     scale = value;
//   }
// })

const fileName = computed({
  get(){
    return editor.file;
  },

  set(value){
    editor.onChangeFileName(value);
  }
});

const exportMode = computed({
  get(){
    return editor.exports;
  },

  set(value){
    editor.onChangeExportMode(value);
  }
});

const resolution = computed({
  get(){
    console.log(dimension);
    return (dimension.value?.width*exportScale.value) + "x" + (dimension.value?.height*exportScale.value);
  },
});

</script>

<template>
  <div class="grid grid-cols-12 gap-6">
    <div class="col-span-12 md:col-span-7">
      <div class="relative flex items-center justify-center h-64 sm:h-96 p-3 w-full bg-transparent-pattern">
        <video v-if="videoSource" controls class="h-full w-full object-contain">
          <source :src="videoSource" :type="codec.mimetype" />
        </video>
        <img v-else-if="editor.frame" :src="editor.frame" alt="preview" class="h-full w-full object-contain" />
        <el-empty v-else :image-size="200" description="Start to export your video"/>
      </div>
    </div>
    <div class="col-span-12 md:col-span-5 flex flex-col gap-6">
      <div class="flex flex-col">
        <label class="text-xs font-semibold">Export Settings</label>
        <div class="flex flex-col px-2.5 pt-3.5 gap-3">
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">Resolution</Label>
            <div class="flex col-span-9">
              {{ resolution }}
            </div>
          </div>
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">FPS</Label>
            <div class="flex col-span-9">
              <el-select v-model="exportFps" class="w-full">
                <el-option v-for="f in fps" :key="f" :value="f" :label="f" />
              </el-select>
            </div>
          </div>
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">Codec</Label>
            <div class="flex col-span-9">
              <el-select v-model="exportCodec" class="w-full">
                <el-option v-for="c in codecs" :key="c" :value="c" :label="c" />
              </el-select>
            </div>
          </div>
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">Scale Up</Label>
            <div class="flex col-span-9">
              <el-select v-model="exportScale" class="w-full">
                <el-option v-for="c in scales" :key="c" :value="c" :label="c + 'x'" />
              </el-select>
            </div>
          </div>
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">File Name</Label>
            <div class="flex col-span-9">
              <el-input v-model="fileName" class="w-full" placeholder="output">
                <template #suffix>
                  <span>.{{ codec.extension }}</span>
                </template>
              </el-input>
            </div>
          </div>
          <div class="grid grid-cols-12 items-center">
            <Label class="text-xs col-span-3">Exports</Label>
            <div class="flex col-span-9">
              <el-select v-model="exportMode" class="w-full">
                <el-option value="both" label="Video with Audio" />
                <el-option value="video" label="Video Only" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4 mt-auto">
        <div v-if="editor.exporting > ExportProgress.None" class="flex flex-col relative">
          <el-progress :percentage="progress < 100 ? progress : 100" :stroke-width="20" :text-inside="true" class="">
            <span class="flex items-center">
              <template v-if="editor.exporting === ExportProgress.Error">
                <Ban class="h-4 w-4" />
              </template>
              <template v-else-if="editor.exporting === ExportProgress.Completed">
                <CircleCheckBig class="h-4 w-4" />
              </template>
              <template v-else-if="editor.exporting === ExportProgress.None">
                <!-- Render nothing -->
              </template>
              <template v-else>
                <Spinner class="h-4 w-4" />
              </template>
              <template v-if="editor.exporting == ExportProgress.Error">
                Error
              </template>
              <template v-else-if="editor.exporting == ExportProgress.Completed">
                Completed
              </template>
              <template v-else-if="editor.exporting == ExportProgress.CaptureAudio">
                In Progress - Capturing Audio
              </template>
              <template v-else-if="editor.exporting == ExportProgress.CaptureVideo">
                In Progress - Capturing Video
              </template>
              <template v-else-if="editor.exporting == ExportProgress.CompileVideo">
                In Progress - Compiling Media
              </template>
            </span>
          </el-progress>
        </div>
        <div class="flex flex-row gap-4">
          <el-button text bg round @click="editor.onTogglePreviewModal('close')" :icon="Close">
            <span v-if="editor.exporting > ExportProgress.Completed">Cancel Export</span>
            <span v-else>Close</span>
          </el-button>
          <el-button :disabled="editor.exporting > ExportProgress.Completed" type="primary" text bg round @click="handleExportVideo" :icon="Export">
            Start Export
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>