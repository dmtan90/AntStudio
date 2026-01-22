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
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Clip Mask</h2>
      <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10" @click="editor.setActiveSidebarRight(null)">
        <X :size="14" />
      </button>
    </div>

    <section class="flex-1 overflow-y-auto custom-scrollbar relative">
      <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
      
      <template v-if="!expanded">
        <div class="p-5 flex flex-col gap-8 pb-10">
          <!-- Active Clip Mask Preview -->
          <div v-if="clipMask" class="flex flex-col gap-4">
            <div class="group relative bg-black/40 border border-white/10 rounded-2xl overflow-hidden p-8 flex items-center justify-center shadow-inner">
               <div class="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent opacity-50"></div>
               <img :src="clipMask" class="max-w-full max-h-[150px] w-auto h-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10" />
            </div>
            <button class="w-full h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-[0.15em] transition-all border border-red-500/20 shadow-lg shadow-red-500/5 active:scale-[0.98]" @click="editor.canvas.clipper.removeClipMaskFromActiveObject()">
              Remove Clip Mask
            </button>
          </div>
          
          <!-- Basic Shapes Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Basic Shapes</h4>
              <button class="text-[9px] font-bold text-brand-primary hover:text-white uppercase tracking-[0.1em] transition-all bg-brand-primary/5 hover:bg-brand-primary/20 px-2 py-1 rounded-md border border-brand-primary/20" @click="expanded = 'basic'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden pb-2 -mx-5 px-5">
              <button
                v-for="({ name, path, klass, params }) in basic.slice(0, 10)"
                :key="name"
                @click="editor.canvas.clipper.clipActiveObjectFromBasicShape(klass, params)"
                class="group shrink-0 h-[60px] w-[60px] border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3.5 text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
              >
                <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform duration-300 group-hover:scale-110">
                  <path :d="path" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Abstract Shapes Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Abstract</h4>
              <button class="text-[9px] font-bold text-brand-primary hover:text-white uppercase tracking-[0.1em] transition-all bg-brand-primary/5 hover:bg-brand-primary/20 px-2 py-1 rounded-md border border-brand-primary/20" @click="expanded = 'abstract'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden pb-2 -mx-5 px-5">
              <button
                v-for="({ name, path, height, width, id }) in abstract.slice(0, 10)"
                :key="id"
                @click="editor.canvas.clipper.clipActiveObjectFromAbstractShape(path, name)"
                class="group shrink-0 h-[60px] w-[60px] border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3.5 text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
              >
                <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform duration-300 group-hover:scale-110">
                  <path :d="path" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Frames Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Frames</h4>
              <button class="text-[9px] font-bold text-brand-primary hover:text-white uppercase tracking-[0.1em] transition-all bg-brand-primary/5 hover:bg-brand-primary/20 px-2 py-1 rounded-md border border-brand-primary/20" @click="expanded = 'frames'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative min-h-[72px] pb-2 -mx-5 px-5">
              <template v-if="scene.length">
                <SceneElement v-for="element in scene.slice(0, 10)" :key="element.name" :element="element" class="shrink-0 h-[64px] w-auto rounded-xl border border-white/5 bg-white/5 p-1 transition-all hover:border-white/20 hover:scale-105" />
              </template>
              <template v-else>
                 <div class="w-full h-16 rounded-2xl border border-dashed border-white/10 flex items-center justify-center bg-white/2">
                    <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest">No Element Samples</span>
                 </div>
              </template>
            </div>
          </div>
        </div>
      </template>
      
      <template v-else>
        <div class="px-5 pt-4 flex flex-col gap-6 pb-20">
           <!-- Breadcrumbs -->
           <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-white/5 w-fit">
              <button class="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest" @click="expanded = false">Shapes</button>
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none" class="text-white/20">
                <path d="M1 9L5 5L1 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ expanded }}</span>
           </div>

          <div class="grid grid-cols-3 gap-3">
            <ExpandedGridView :match="expanded" :scene="scene" />
          </div>
        </div>
      </template>

      <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
    </section>
  </div>
</template>
