<script setup lang="ts">
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { abstract, basic, frames } from 'video-editor/constants/elements';
import SceneElement from './SceneElement.vue';
const props = defineProps<{ match: string; scene: fabric.Object[] }>();

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, clipper } = storeToRefs(canvasStore);

const clipActiveObjectFromBasicShape = (klass: string, params: any) => {
  clipper.value?.clipActiveObjectFromBasicShape(klass, params);
};

const clipActiveObjectFromAbstractShape = (path: string, name: string) => {
  clipper.value?.clipActiveObjectFromAbstractShape(path, name);
};
</script>

<template>
  <template v-if="match === 'basic'">
    <button
      v-for="({ name, path, klass, params }) in basic"
      :key="name"
      @click="clipActiveObjectFromBasicShape(klass, params)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'abstract'">
    <button
      v-for="({ name, id, path, height, width }) in abstract"
      :key="id"
      @click="clipActiveObjectFromAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'frames'">
    <button
      v-for="({ name, id, path, height, width }) in frames"
      :key="id"
      @click="clipActiveObjectFromAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'scene'">
    <template v-if="scene.length">
      <SceneElement v-for="element in scene" :key="element.name" :element="element" class-name="w-full h-full aspect-square" />
    </template>
    <template v-else>
      <el-skeleton v-for="(_, index) in 3" :key="index" class="h-full w-full aspect-square rounded-md" />
      <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Elements</span>
    </template>
  </template>
</template>