<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import BaseElement from "./BaseElement.vue";
import { MoreOne, UpSquare, DownSquare, Copy, Delete } from "@icon-park/vue-next";
import { defaultBackgroundColor } from "video-editor/fabric/constants"

const props = defineProps({
  page: {
    type: Number,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const editor = useEditorStore();
const { pages, page: activePage, dimension } = storeToRefs(editor);
const sceneWrapper = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const { instance } = storeToRefs(editor);
// const canvasStore = useCanvasStore();
// const { timeline } = storeToRefs(canvasStore);
// const { page } = storeToRefs(editor);
// const thumbnail = ref(null);
// const { pages } = storeToRefs(editor);
// const page = computed(() => pages[props.pages]);
const artboard = computed(() => editor.pages[props.page].artboard);
const workspace = computed(() => editor.pages[props.page].workspace);
const elements = computed(() => editor.pages[props.page]?.thumbnailElements);
const scale = ref(0.1);
const style = reactive({
  width: instance.value?.dimension?.width + "px",
  height: instance.value?.dimension?.height + "px",
  "--scale": scale.value,
});

const backgroundColor = computed(() => artboard.value?.fill || defaultBackgroundColor);

const computeStyle = () => {
  console.log("computeStyle");
  const bound = (sceneWrapper.value?.parentNode as HTMLElement)?.getBoundingClientRect();
  const workspace = instance.value.dimension;
  let scaleW = bound == null ? 0.1 : (bound.width / workspace.width);
  let scaleH = bound == null ? 0.1 : (bound.height / workspace.height);
  let scaleMin = Math.min(scaleW, scaleH);
  scale.value = parseFloat(scaleMin.toFixed(2));
  // if(bound.width > bound.height){//fix width
  //   scale.value = Math.min(scaleW, scaleH);
  // }
  // else{//fix height
  //   scale.value = Math.max(scaleW, scaleH);  
  // }
  style.width = workspace.width + "px";
  style.height = workspace.height + "px";
  style["--scale"] = scale.value;
};

watch([sceneWrapper, elements], (value) => {
  if (value) {
    computeStyle();
  }
})

// watch(elements, (value) => {
//   if(value){
//     computeStyle();
//   }
// });

onMounted(() => {
  // console.log(elements, style);
  computeStyle();
});

watch(artboard, (value) => {
  console.log("artboard", value);
});

const handleSceneAction = (cmd) => {
  const page = props.page;
  if (cmd == "up") {
    editor.swapPage(page, page - 1);
  }
  else if (cmd == "down") {
    editor.swapPage(page, page + 1);
  }
  else if (cmd == "copy") {
    editor.copyPage(page)
  }
  else if (cmd == "delete") {
    editor.deletePage(page);
  }
}

</script>

<template>
  <div ref="container" class="relative p-0 h-full" :style="{ backgroundColor: backgroundColor as string }">
    <div v-if="elements && elements.length > 0" ref="sceneWrapper" class="scene-wrapper" :style="style">
      <BaseElement v-for="(element, index) in elements" :key="index" :page="page" :element="element" :scale="1" />
    </div>
    <div v-else-if="loading" class="w-full h-full flex items-center justify-center bg-white/5 animate-pulse">
      <div class="h-8 w-8 rounded-full bg-white/10"></div>
    </div>
    <el-empty v-else :image-size="32" class="" :description="'Scene ' + (page + 1)" />
    <!-- <el-dropdown @command="handleSceneAction" class="absolute right-1 top-1 z-10" trigger="hover">
      <el-button type="primary" text circle @click.stop.prevent="">
        <MoreOne :size="15" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu class="min-w-20">
          <el-dropdown-item command="up" :icon="UpSquare" v-if="page > 0 && pages.length > 1">
            <span class="">Move Up</span>
          </el-dropdown-item>
          <el-dropdown-item command="down" :icon="DownSquare" v-if="page < pages.length - 1 && pages.length > 1">
            <span class="">Move Down</span>
          </el-dropdown-item>
          <el-dropdown-item command="copy" :icon="Copy">
            <span class="">Duplicate</span>
          </el-dropdown-item>
          <el-dropdown-item command="delete" :icon="Delete">
            <span class="">Delete</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
</el-dropdown> -->
  </div>
</template>

<style>
.scene-wrapper {
  --scale: 0.1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  transform: scale(var(--scale));
  transform-origin: top left;
}
</style>