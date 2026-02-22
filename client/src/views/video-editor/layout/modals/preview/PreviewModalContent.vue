<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Forbid as Ban, CheckOne as CircleCheckBig, 
  Close, Export, Loading 
} from '@icon-park/vue-next';
import Spinner from 'video-editor/components/ui/spinner.vue';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";
import { ExportProgress, type ExportMode } from 'video-editor/plugins/editor';
import { createFileDownload, createFileDownloads } from 'video-editor/lib/utils';
import { codecs, fetchExtensionByCodec, fps, scales } from 'video-editor/constants/recorder';

// import ProgressIcon from './ProgressIcon.vue';
// import ProgressText from './ProgressText.vue';
// import { useVideoAssemblerStore } from '@/views/video-editor/store/assembler';
import PublishDialog from '@/components/projects/editor/PublishDialog.vue';
import { useProjectStore } from '@/stores/project';
// import ExportSettingsDialog from '@/components/projects/editor/ExportSettingsDialog.vue';

const editor = useEditorStore();
const projectStore = useProjectStore();
const { dimension, frame } = storeToRefs(editor);
const codec = computed(() => fetchExtensionByCodec(editor.codec));
const progress = computed(() => editor.progress * 100);
const exporting = computed(() => editor.exporting);
const isExporting = computed(() => editor.exporting > ExportProgress.None);
const isRendering = computed(() => editor.exporting === ExportProgress.CompileVideo || editor.exporting === ExportProgress.CaptureVideo || editor.exporting === ExportProgress.CaptureAudio);
const videoSource = ref(editor.blob ? URL.createObjectURL(editor.blob) : null);
const exportScale = ref(1);
// const showPublish = computed(() => editor.blob && editor.exporting === ExportProgress.Completed);
// const assemblerStore = useVideoAssemblerStore();
// const { isAssembling, progress: assemblerProgress, status: assemblerStatus, result: assemblerResult } = storeToRefs(assemblerStore);
// const { cancel } = assemblerStore;
// const showSettings = ref(false);
const showPublish = ref(false);
const project = computed(() => projectStore.currentProject);
// const isPreparing = ref(false);
// const preparationStatus = ref('');
// const preparationProgress = ref(0);
// const preparedProjectData = ref(null);

const progressText = (status: ExportProgress) => {
  switch (status) {
    case ExportProgress.CaptureAudio: return "Capturing Audio Buffers";
    case ExportProgress.CaptureVideo: return "Extracting Video Frames";
    case ExportProgress.CompileVideo: return "Compiling Final Media";
    case ExportProgress.Completed: return "Assembly Ready for Deployment";
    case ExportProgress.Error: return "Assembly Failed";
    default: return "";
  }
};

// const handleLocalExport = async () => {
//   try {
//     // @ts-ignore
//     if (!window.showSaveFilePicker) {
//       toast.error("Your browser does not support local file streaming. Please use Chrome/Edge.");
//       return;
//     }

//     const format = codec.value.extension || 'mp4';
//     // @ts-ignore
//     const handle = await window.showSaveFilePicker({
//       suggestedName: `${editor.name || 'video'}.${format}`,
//       types: [{
//         description: 'Video File',
//         accept: { [`video/${format}`]: [`.${format}`] },
//       }],
//     });

//     isPreparing.value = true;
//     preparationStatus.value = "Starting Stream Export...";

//     await editor.instance.exportProjectToStream(handle, (p, s) => {
//       preparationProgress.value = p * 100;
//       preparationStatus.value = s;
//     });

//     toast.success("Export finished successfully!");
//   } catch (e: any) {
//     if (e.name !== 'AbortError') {
//       toast.error(e.message || "Failed to export");
//       console.error(e);
//     }
//   } finally {
//     isPreparing.value = false;
//   }
// };

// const onSettingsConfirm = async (options: any) => {
//   showSettings.value = true; // Stay in "exporting" state visually
//   // showSettings.value = false;

//   try {
//     // 1. Prepare segments with progress tracking
//     isPreparing.value = true;
//     preparedProjectData.value = await editor.instance.getAssemblyProject((p, s) => {
//       preparationProgress.value = p * 100;
//       preparationStatus.value = s;
//     });
//     showSettings.value = true;
//   } catch (e: any) {
//     toast.error(e.message || "Failed to prepare project for export");
//   } finally {
//     isPreparing.value = false;
//   }
// };

const handleExportVideo = async () => {
    // await onSettingsConfirm(null);
    try{
      if(editor.blob){
        URL.revokeObjectURL(editor.blob);
      }
      const blob = await editor.exportVideo(false, true);
      if(!blob){
        toast.error("Export failed");
      }
      else{
        const file = (editor.file || "output") + "." + codec.value.extension;
        createFileDownload(blob, file);
        showPublish.value = true;
      }
    }catch(error){
      toast.error("Export failed");
    }
    finally{
      // isPreparing.value = false;
    }
};

// const handleAssemblyComplete = (result: any) => {
//   videoSource.value = URL.createObjectURL(result.blob);
//   showPublish.value = true;
// };

const exportFps = computed({
  get() {
    return editor.fps;
  },

  set(value) {
    editor.onChangeExportFPS(value);
  }
});

const exportCodec = computed({
  get() {
    return editor.codec;
  },

  set(value) {
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
  get() {
    return editor.name;
  },

  set(value) {
    editor.onChangeFileName(value);
  }
});

const exportMode = computed({
  get() {
    return editor.exports;
  },

  set(value) {
    editor.onChangeExportMode(value);
  }
});

const resolution = computed(() => {
    return (dimension.value?.width * exportScale.value) + "x" + (dimension.value?.height * exportScale.value);
});

</script>

<template>
  <div class="grid grid-cols-12 gap-10 p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
    <div class="col-span-12 lg:col-span-7">
      <div class="relative flex flex-col gap-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-6 w-1 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span class="text-[12px] font-black uppercase tracking-[0.2em] text-white/90">Visual Output</span>
        </div>

        <div class="preview-stage aspect-square max-h-[500px] mx-auto w-full bg-[#050505] rounded-[40px] overflow-hidden border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.8)] group relative">
          <video v-if="videoSource" controls class="h-full w-full object-contain">
            <source :src="videoSource" :type="codec.mimetype" />
          </video>
          <img v-else-if="frame" :src="frame" alt="preview" class="h-full w-full object-contain opacity-90" />
          <el-empty v-else :image-size="80" description="Assembly Pending" class="opacity-20 flex-col-center h-full grayscale" />

          <!-- <div v-if="isExporting"
            class="absolute inset-0 bg-black/80 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-700 z-50">
            <div class="relative">
              <div class="absolute inset-0 bg-brand-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
              <el-icon class="is-loading text-5xl text-brand-primary mb-2 relative z-10">
                <loading />
              </el-icon>
            </div>
            <span class="mt-8 text-[11px] font-black uppercase tracking-[0.4em] text-white/80 animate-pulse">{{
              isExporting ? progressText(progress) : '' }}</span>
          </div> -->
        </div>
      </div>
    </div>

    <div class="col-span-12 lg:col-span-5 flex flex-col justify-center">
      <div class="settings-panel bg-black/20 border border-white/5 rounded-[32px] p-8 grow ring-1 ring-white/5">
        <div class="flex items-center justify-between mb-8">
          <h4 class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Video Specifications</h4>
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
            <span class="text-[9px] font-black text-white/60 tracking-tighter uppercase">{{ resolution }}</span>
          </div>
        </div>

        <div class="space-y-2.5">
          <div class="space-y-2.5">
            <label class="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] ml-1">Render Quality</label>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <el-select v-model="exportFps" :disabled="isRendering" class="cinematic-select-ghost" placeholder="FPS">
                  <el-option v-for="f in fps" :key="f" :value="f" :label="f + ' FPS'" />
                </el-select>
              </div>
              <div class="flex flex-col gap-1.5">
                <el-select v-model="exportCodec" :disabled="isRendering" class="cinematic-select-ghost" placeholder="Codec">
                  <el-option v-for="c in codecs" :key="c" :value="c" :label="c" />
                </el-select>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2.5">
              <label class="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] ml-1">Scale</label>
              <el-select v-model="exportScale" :disabled="isRendering" class="cinematic-select-ghost">
                <el-option v-for="c in scales" :key="c" :value="c" :label="c + '.0x'" />
              </el-select>
            </div>
            <div class="space-y-2.5">
              <label class="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] ml-1">Video Mode</label>
              <el-select v-model="exportMode" :disabled="isRendering" class="cinematic-select-ghost">
                <el-option value="both" label="With Audio" />
                <el-option value="video" label="Mute Video" />
              </el-select>
            </div>
          </div>

          <div class="space-y-2.5 pt-4">
            <label class="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] ml-1">Video Name</label>
            <el-input v-model="fileName" :disabled="isRendering" class="cinematic-input-ghost" placeholder="Enter filename">
              <template #suffix>
                <span
                  class="text-[10px] font-bold text-brand-primary uppercase tracking-widest px-3 border-l border-white/5">.{{
                    codec.extension }}</span>
              </template>
            </el-input>
          </div>
        </div>

        <!-- Progress Tracking -->
        <div class="mt-10 mb-2">
          <!-- <div v-if="isExporting" class="flex flex-col relative">
            <el-progress :percentage="progress < 100 ? progress : 100" :stroke-width="20" :text-inside="true" class="">
              <span class="flex items-center">
                <Ban v-if="exporting === ExportProgress.Error" class="h-4 w-4" />
                <CircleCheckBig v-else-if="exporting === ExportProgress.Completed" class="h-4 w-4" />
                <Spinner v-else class="h-4 w-4" />
                <span>{{ progressText(exporting) }}</span>
              </span>
            </el-progress>
          </div> -->
          <div v-if="isExporting" class="space-y-4">
            <div class="flex justify-between items-center px-1">
              <span class="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <template v-if="exporting == ExportProgress.Completed">
                  <CircleCheckBig :size="12" class="text-green-500" />
                  ASSEMBLY SUCCESSFUL
                </template>
                <template v-else-if="exporting == ExportProgress.CaptureVideo">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                  PREPARING SCENES
                </template>
                <template v-else>
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                  IN PROGRESS
                </template>
              </span>
              <span class="text-[11px] font-black text-white/80 tabular-nums tracking-tighter">
                {{ Math.round(progress) }}%</span>
            </div>
            <div class="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                class="h-full bg-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-500 rounded-full"
                :style="{ width: progress + '%' }"></div>
            </div>
            <div class="text-[9px] font-bold text-white/20 italic text-center uppercase tracking-widest pt-1">
              {{ progressText(exporting) }}
            </div>
          </div>
        </div>
      </div>

      <div class="footer-actions flex gap-4 mt-8">
        <el-button @click="editor.onTogglePreviewModal('close')"
          class="cinematic-button !h-14 !grow !rounded-[20px] !bg-white/5 !border-white/10 !text-white/60 hover:!bg-white/10 hover:!text-white group transition-all duration-300">
          <Close :size="18" class="mr-2 group-hover:rotate-90 transition-transform duration-300" />
          <span class="text-[11px] font-black uppercase tracking-[0.2em]">{{ isExporting ? 'Abort' : 'Dismiss' }}</span>
        </el-button>
        <el-button :disabled="isRendering" @click="handleExportVideo"
          class="cinematic-button is-primary !h-14 !grow !rounded-[20px] !bg-brand-primary !text-white !border-transparent shadow-[0_12px_30px_rgba(59,130,246,0.3)] hover:!scale-[1.03] active:!scale-95 transition-all duration-300 disabled:!opacity-30 disabled:!scale-100 disabled:!shadow-none">
          <Export :size="18" class="mr-2" />
          <span class="text-[11px] font-black uppercase tracking-[0.2em]">Export</span>
        </el-button>
        <!-- <el-button :disabled="isAssembling || isPreparing" @click="handleLocalExport"
          class="cinematic-button !h-14 !px-6 !rounded-[20px] !bg-white/10 !text-white !border-white/20 hover:!bg-white/20 transition-all duration-300">
          <span class="text-[11px] font-black uppercase tracking-[0.2em]">Render</span>
        </el-button> -->
      </div>
    </div>
  </div>

  <!-- <ExportSettingsDialog v-model="showSettings" :project-data="preparedProjectData" @complete="handleAssemblyComplete" /> -->
  <PublishDialog v-model="showPublish" :project="project"/>
</template>
