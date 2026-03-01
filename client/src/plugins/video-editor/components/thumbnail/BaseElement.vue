<script lang="ts" setup>
import { computed, watch, ref, onMounted } from 'vue'
import { fabric } from 'fabric'
import { useEditorStore } from "video-editor/store/editor";
import { useCanvasStore } from "video-editor/store/canvas";
import { FabricUtils } from "video-editor/fabric/utils"
import { storeToRefs } from "pinia";

const props = defineProps<{
  element: fabric.Object,
  page: number,
  scale: number,
}>();

// console.log(props.element);
const editor = useEditorStore();
const canvas = useCanvasStore();
const { dimension } = storeToRefs(editor);
const { timeline } = storeToRefs(canvas);
const snapshot = ref(null);
const svg = ref(null);
const imageElement = computed(() => props.element);
const durationInSeconds = computed(() => timeline.value?.duration / 1000);
const exportImage = () => {
  if(props.element){
    // console.log(props.element);
    const canvas = editor.getCanvasInstance(props.page);
    if(canvas){
      const object = canvas?.getItemByName((props.element as any).name);
      // console.log(object);
      if(object){
        try{
          svg.value = object.toSVG();
        }catch(err){

        }
      }
      // FabricUtils.exportImage((base64) => {
      //   snapshot.value = base64;
      //   // console.log("base64", base64);
      // }, object);
    }
  }
};

onMounted(() => {
  exportImage();
});

watch(props, (value) => {
  exportImage();
});

// watch(canvas.timeline, (value) => {
//   // console.log("timeline", value);
//   exportImage();
// });
</script>

<template>
  <svg class="base-element-image" v-if="svg" v-html="svg" :width="dimension.width" :height="dimension.height" xmlns="http://www.w3.org/2000/svg" alt="" />
</template>

<style>
.base-element-image {
  position: absolute;
  g > * {
    visibility: visible !important;
  }
}
.rotate-wrapper {
  width: 100%;
  height: 100%;
}
.element-content {
  width: 100%;
  height: 100%;
  position: relative;

  .image-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  img {
    position: absolute;
  }
}
</style>
