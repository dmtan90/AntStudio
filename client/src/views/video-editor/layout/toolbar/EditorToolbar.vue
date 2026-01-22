<script setup lang="ts">
import { computed, shallowRef, ref, watch, markRaw, onMounted } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { cn } from 'video-editor/lib/utils';
import { storeToRefs } from "pinia";
import { useCanvasStore } from "video-editor/store/canvas";

import TextToolbar from './components/text.vue';
import ShapeToolbar from './components/shape.vue';
import LineToolbar from './components/line.vue';
import ImageToolbar from './components/image.vue';
import VideoToolbar from './components/video.vue';
import AudioToolbar from './components/audio.vue';
import CropToolbar from './components/crop.vue';
import TrimToolbar from './components/trim.vue';

const toolbarComponentMap: Record<string, any> = {
  textbox: TextToolbar,
  image: ImageToolbar,
  gif: ImageToolbar,
  video: VideoToolbar,
  triangle: ShapeToolbar,
  path: ShapeToolbar,
  circle: ShapeToolbar,
  ellipse: ShapeToolbar,
  rect: ShapeToolbar,
  line: LineToolbar,
  audio: AudioToolbar,
  crop: CropToolbar,
  trim: TrimToolbar,
};

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { selectionActive, cropperActive, trimmerActive } = storeToRefs(canvasStore);
// let { selectionActive, cropperActive, trimmerActive } = canvasStore;
// console.log(selectionActive, cropperActive, trimmerActive);
// const canvas = canvasStore.canvas;
// const active = canvasStore.active;
const isTablet = useIsTablet();
const Toolbar = ref(null);
const computeToolbar = () => {
  if (selectionActive.value) {
    let template = null;
    // const canvas = editor.canvas;
    const cropper = cropperActive.value ?? null;
    const trimmer = trimmerActive.value ?? null;
    const type = selectionActive.value?.type ?? null;
    if (cropper) {
      template = "crop";
    } else if (trimmer) {
      template = "trim";
    } else if (type) {
      template = type;
    }
    console.log("computeToolbar", template);
    Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
  }
  else {
    Toolbar.value = null;
  }
};

watch([selectionActive, cropperActive, trimmerActive], (value) => {
  computeToolbar();
});

onMounted(() => {
  computeToolbar();
});
</script>

<template>
  <template v-if="!isTablet">
    <transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <aside v-if="Toolbar" :class="cn('h-[60px] absolute top-20 left-1/2 -translate-x-1/2 bg-[#0d0d0d]/80 backdrop-blur-3xl border border-white/10 flex items-center z-20 gap-3 rounded-2xl px-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] group transition-all duration-500 hover:border-white/20 hover:bg-[#0a0a0a]/90')">
        <!-- Inner Glow -->
        <div class="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
        <component :is="Toolbar.value" class="relative z-10" />
      </aside>
    </transition>
  </template>

<template v-else>
    <div v-if="Toolbar" class="h-14 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 shrink-0 overflow-x-auto custom-scrollbar flex items-center">
      <component :is="Toolbar.value" />
    </div>
    <div v-else class="h-14 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 shrink-0"></div>
  </template>
</template>