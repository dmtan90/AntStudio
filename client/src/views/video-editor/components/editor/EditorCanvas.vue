<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import EditorActivityIndicator from './EditorActivityIndicator.vue';
import { cn } from '@/utils/ui';
import { useCanvasStore } from 'video-editor/store/canvas';
import { fabric } from 'fabric';
import { storeToRefs } from "pinia";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const refCanvas = ref(null);
const { page, pages } = storeToRefs(editor);
const container = ref(null);
const canvas = ref(null);
const selected = ref(false);
onMounted(() => {
  console.log("onMounted", props.id);
  canvas.value = editor.getPageById(props.id);
  selected.value = (page.value != undefined && pages.value != undefined && props != undefined && pages.value[page.value].id == props.id);
});

watch([page, pages], (values) => {
  selected.value = (page.value != undefined && pages.value != undefined && props != undefined && pages.value[page.value].id == props.id);
  // console.log(values, selected.value);
}, { deep: true, immediate: true });

// const selected = computed({
//   get(){
//     if(page.value != undefined && pages.value != undefined && props != undefined && pages.value[page.value].id == props.id){
//       return true;
//     }
//     return false;
//   }
// });

const pending = computed(() => canvas.value?.template?.pending ?? true);
watch(refCanvas, (value) => {
  if (value) {
    console.log("refCanvas", canvas.value);
    canvasStore.initializeCanvas(canvas.value, value);
  }
});

const resizeObserver = new ResizeObserver((entries) => {
  try {
    const zoom = entries.length > 0 ? entries[0].contentRect.height / canvas.value?.workspace.height : 1;
    // console.log("zoom", zoom);
    canvas.value?.workspace?.changeZoom(zoom);
  } catch (error) {

  }
});

watch(container, (el) => {
  if (el) {
    resizeObserver.observe(el);
  }
});

onUnmounted(() => {
  resizeObserver.disconnect();
});

</script>

<template>
  <div ref="container" :class="cn('absolute', selected ? 'opacity-100 z-10' : 'opacity-0 z-0')">
    <canvas ref="refCanvas" />
    <EditorActivityIndicator :pending="pending" />
  </div>
</template>