<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { abstract, basic, frames } from 'video-editor/constants/elements';
import { propertiesToInclude } from 'video-editor/fabric/constants';
import { cn } from 'video-editor/lib/utils';

import ExpandedGridView from './ExpandedGridView.vue';
import SceneElement from './SceneElement.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, instance, elements } = storeToRefs(canvasStore);

const clipMask = ref<string | undefined>(undefined);
const expanded = ref<false | string>(false);

watch(selected, (newSelected) => {
  if (!newSelected?.clipPath) {
    clipMask.value = undefined;
  } else {
    const clipPath = instance.value?.getItemByName(newSelected.clipPath.name);
    if (clipPath) {
      clipPath.clone((clone: fabric.Object) => {
        clone.set({ visible: true, opacity: 1 });
        clipMask.value = clone.toDataURL({ format: "image/webp" });
      }, propertiesToInclude);
    } else {
      clipMask.value = undefined;
    }
  }
}, { immediate: true });

const scene = computed(() => {
  return elements.value.filter((element) => element.name !== selected.value?.name);
});

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Clip Mask</h2>
      <el-button plain circle class="bg-card h-7 w-7 ml-auto" @click="editor.setActiveSidebarRight(null)">
        <X :size="15" />
      </el-button>
    </div>
    <template v-if="!expanded">
      <div class="p-4 flex flex-col gap-4 sidebar-container">
        <div v-if="clipMask" class="flex flex-col gap-3 pb-2">
          <div class="bg-transparent-pattern p-6">
            <img :src="clipMask" class="w-full h-auto" />
          </div>
          <el-button type="primary" text bg round class="w-full" @click="editor.canvas.clipper.removeClipMaskFromActiveObject()">
            Remove clip mask
          </el-button>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-xs font-semibold line-clamp-1">Basic Shapes</h4>
            <el-button size="small" link class="text-primary font-medium line-clamp-1" @click="expanded = 'basic'">
              See All
            </el-button>
          </div>
          <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden">
            <button
              v-for="({ name, path, klass, params }) in basic.slice(0, 10)"
              :key="name"
              @click="editor.canvas.clipper.clipActiveObjectFromBasicShape(klass, params)"
              class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
            >
              <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
                <path :d="path" class="h-full" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-xs font-semibold line-clamp-1">Abstract Shapes</h4>
            <el-button size="small" link class="text-primary font-medium line-clamp-1" @click="expanded = 'abstract'">
              See All
            </el-button>
          </div>
          <div class="flex gap-2.5 items-center overflow-x-scroll relative scrollbar-hidden">
            <button
              v-for="({ name, path, height, width, id }) in abstract.slice(0, 10)"
              :key="id"
              @click="editor.canvas.clipper.clipActiveObjectFromAbstractShape(path, name)"
              class="group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
            >
              <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
                <path :d="path" class="h-full" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-xs font-semibold line-clamp-1">Frames</h4>
            <el-button size="small" link class="text-primary font-medium line-clamp-1" @click="expanded = 'frames'">
              See All
            </el-button>
          </div>
          <div class="flex gap-2.5 items-center overflow-x-scroll relative scrollbar-hidden">
            <template v-if="scene.length">
              <SceneElement v-for="element in scene.slice(0, 10)" :key="element.name" :element="element" />
            </template>
            <template v-else>
              <el-skeleton v-for="(_, index) in 3" :key="index" class="h-16 flex-1 rounded-md" />
              <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">No Elements</span>
            </template>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="px-3 pt-4 flex flex-col gap-4 sidebar-container">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-button link size="small" class="text-xs h-6 px-2 text-foreground/30 hover:text-foreground/40" @click="expanded = false">
              Shapes
            </el-button>
          </el-breadcrumb-item>
          <el-breadcrumb-item>
            <el-button disabled link size="small" class="text-xs h-6 px-2 capitalize disabled:opacity-100">
              {{ expanded }}
            </el-button>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="grid grid-cols-3 gap-2.5 relative">
          <ExpandedGridView :match="expanded" :scene="scene" />
        </div>
      </div>
    </template>
  </div>
</template>
