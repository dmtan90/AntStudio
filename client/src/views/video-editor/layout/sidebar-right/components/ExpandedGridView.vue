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
      class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3.5 text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-[1.05] shadow-lg shadow-black/20"
    >
      <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform duration-300 group-hover:scale-110">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'abstract'">
    <button
      v-for="({ name, id, path, height, width }) in abstract"
      :key="id"
      @click="clipActiveObjectFromAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3.5 text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-[1.05] shadow-lg shadow-black/20"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform duration-300 group-hover:scale-110">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'frames'">
    <button
      v-for="({ name, id, path, height, width }) in frames"
      :key="id"
      @click="clipActiveObjectFromAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3.5 text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-[1.05] shadow-lg shadow-black/20"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform duration-300 group-hover:scale-110">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'scene'">
    <template v-if="scene.length">
      <SceneElement v-for="element in scene" :key="element.name" :element="element" class-name="w-full h-full aspect-square rounded-xl" />
    </template>
    <template v-else>
      <div class="col-span-3 py-20 flex flex-col items-center justify-center gap-4 bg-white/2 rounded-2xl border border-dashed border-white/10">
        <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-white/20">
                <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 6L6 6C4.89543 6 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <span class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">No Scene Elements Available</span>
      </div>
    </template>
  </template>
</template>