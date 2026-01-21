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
  if(selectionActive.value){
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
    // console.log("computeToolbar", template);
    Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
  }
  else{
    Toolbar.value = null;
  }
};
// const cropperActive = computed(() => canvasStore.cropperActive);
// const trimmerActive = computed(() => canvasStore.trimmerActive);
watch([selectionActive, cropperActive, trimmerActive], (value) => {
  // console.log("update Toolbar", value);
  computeToolbar();
});

onMounted(() => {
  computeToolbar();
});
// watch(canvasStore, (value) => {
//   // let { canvas, selection } = storeToRefs(canvasStore);
//   // let { selectionActive, cropperActive, trimmerActive } = storeToRefs(canvasStore);
//   // console.log(getSelectionActive(), getCropperActive(), getTrimmerActive());
//   console.log("canvasStore", value, selectionActive, cropperActive, trimmerActive);
//   if(selectionActive && selectionActive.value){
//     let template = null;
//     // const canvas = editor.canvas;
//     const cropper = cropperActive?.value ?? null;
//     const trimmer = trimmerActive?.value ?? null;
//     const type = selectionActive?.value?.type ?? null;
//     if (cropper) {
//       template = "crop";
//     } else if (trimmer) {
//       template = "trim";
//     } else if (type) {
//       template = type;
//     }
//     console.log(template);
//     Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
//   }
//   else{
//     Toolbar.value = null;
//   }
// });

// canvasStore.$onAction((evt) => {
//   console.log("$onAction", evt);
//   const { name } = evt;
//   if(name && name == "updateRefs"){
//     if(active){
//       let template = null;
//       const canvas = editor.canvas;
//       const cropper = canvas.cropper?.active ?? null;
//       const trimmer = canvas.trimmer?.active ?? null;
//       const type = active?.type ?? null;
//       if (cropper) {
//         template = "crop";
//       } else if (trimmer) {
//         template = "trim";
//       } else if (type) {
//         template = type;
//       }
//       Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
//     }
//     else{
//       Toolbar.value = null;
//     }
//   }
// });

// canvasStore.$subscribe((mutation, state) => {
//   console.log('Store state changed:', mutation, state);
//   if(active.value){
//     let template = null;
//     // const canvas = editor.canvas;
//     const cropper = canvas.value.cropper?.active ?? null;
//     const trimmer = canvas.value.trimmer?.active ?? null;
//     const type = active.value?.type ?? null;
//     if (cropper) {
//       template = "crop";
//     } else if (trimmer) {
//       template = "trim";
//     } else if (type) {
//       template = type;
//     }
//     Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
//   }
//   else{
//     Toolbar.value = null;
//   }
// });

// watch(editor, (value) =>{
//   if(active.value){
//     let template = null;
//     // const canvas = editor.canvas;
//     const cropper = canvas.cropper?.active ?? null;
//     const trimmer = canvas.trimmer?.active ?? null;
//     const type = active.value?.type ?? null;
//     if (cropper) {
//       template = "crop";
//     } else if (trimmer) {
//       template = "trim";
//     } else if (type) {
//       template = type;
//     }
//     Toolbar.value = template && toolbarComponentMap[template] ? shallowRef(toolbarComponentMap[template]) : null;
//   }
//   else{
//     Toolbar.value = null;
//   }
// });
</script>

<template>
  <template v-if="!isTablet">
    <aside v-if="Toolbar" :class="cn('h-16 absolute bottom-0 left-0 bg-card dark:bg-gray-900/40 border-t border-t-border/25 flex items-center z-20 gap-2.5 w-screen overflow-x-scroll scrollbar-hidden px-4')">
      <component :is="Toolbar.value" />
    </aside>
    <template v-else></template>
  </template>
  <template v-else>
    <div v-if="Toolbar" class="h-14 border-b border-b-border/50 px-4 shrink-0 overflow-x-scroll scrollbar-hidden">
      <component :is="Toolbar.value" />
    </div>
    <div v-else class="h-14 border-b border-b-border/50 px-4 shrink-0 overflow-x-scroll scrollbar-hidden"></div>
  </template>
</template>