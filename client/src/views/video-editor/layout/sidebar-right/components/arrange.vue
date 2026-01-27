<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { Close as X, Aiming, Lock, Unlock, FlipHorizontally, FlipVertically } from '@icon-park/vue-next';
import { cn } from '@/utils/ui';
import { toast } from 'vue-sonner';
import Label from 'video-editor/components/ui/label.vue';
import Toggle from 'video-editor/components/ui/toggle.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { move, align } from 'video-editor/constants/editor';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, alignment, timeline, audio } = storeToRefs(canvasStore);

watch(selected, (value) => {
  // console.log("selected", selected);
});

const width = computed({
  get() {
    return (selected.value as any)?.width! * (selected.value as any)?.scaleX!;
  },

  set(value) {
    const type = (selected.value as any)?.type!;
    if (type == "image" || type == "video" || type == "gif") {
      let newWidth = value / (selected.value as any)?.scaleX!;
      let scaleX = newWidth * (selected.value as any)?.scaleX! / (selected.value as any)?.width!;
      (canvas.value as any).onChangeActiveObjectProperty("scaleX", scaleX);
      (canvas.value as any).onChangeActiveObjectProperty("scaleY", scaleX);
    }
    else {
      (canvas.value as any).onChangeActiveObjectProperty("width", value);
    }
  }
});

const height = computed({
  get() {
    return (selected.value as any)?.height! * (selected.value as any)?.scaleY!;
  },

  set(value) {
    const type = (selected.value as any)?.type!;
    if (type == "image" || type == "video" || type == "gif") {
      let newHeight = value / (selected.value as any)?.scaleY!;
      const scaleY = newHeight * (selected.value as any)?.scaleY / (selected.value as any)?.height;
      (canvas.value as any).onChangeActiveObjectProperty("scaleX", scaleY);
      (canvas.value as any).onChangeActiveObjectProperty("scaleY", scaleY);
    }
    else {
      (canvas.value as any).onChangeActiveObjectProperty("height", value);
    }
  }
});

const top = computed({
  get() {
    return (selected.value as any)?.top!;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("top", value);
  }
});

const left = computed({
  get() {
    return (selected.value as any)?.left!;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("left", value);
  }
});

const lockRatio = computed({
  get() {
    return (selected.value as any)?.keepRatio ?? false;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("keepRatio", value);
    // (canvas.value as any).onChangeActiveObjectProperty("lockScalingY", value);
  }
});

const rotate = computed({
  get() {
    return (selected.value as any)?.angle!;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("angle", value);
  }
});

const disabledRatio = computed(() => {
  let disabled = false;
  let type = (selected.value as any)?.type!;
  if (type == "image" || type == "video" || type == "circle" || type == "textbox" || type == "path" || type == "line") {
    disabled = true;
  }
  return disabled;
});

const flipX = computed({
  get() {
    return (selected.value as any)?.flipX!;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("flipX", value);
  }
});

const flipY = computed({
  get() {
    return (selected.value as any)?.flipY!;
  },

  set(value) {
    (canvas.value as any).onChangeActiveObjectProperty("flipY", value);
  }
});

const onChangeAlign = (align: any) => {
  (alignment.value as any)?.alignActiveObjecToPage(align);
}

const onChangeOrder = (order: any) => {
  (alignment.value as any)?.changeActiveObjectLayer(order);
}

const offsetMs = computed(() => {
  const v = selected.value as any;
  return v?.meta?.offset !== undefined ? v.meta.offset : (v?.offset * 1000 || 0);
});
const durationMs = computed(() => {
  const v = selected.value as any;
  return v?.meta?.duration !== undefined ? v.meta.duration : (v?.timeline * 1000 || 0);
});
const durationInSecond = computed({
  get() {
    return durationMs.value! / 1000;
  },

  set(value) {
    if (!(selected.value as any)?.type) {
      (audio.value as any).update((selected.value as any)?.id, { duration: value });
    }
    else {
      (canvas.value as any).onChangeActiveObjectTimelineProperty('duration', value * 1000);
    }
  }
});

const offsetInSecond = computed({
  get() {
    return offsetMs.value! / 1000;
  },

  set(value) {
    if (!(selected.value as any)?.type) {
      (audio.value as any).update((selected.value as any)?.id, { offset: value });
    }
    else {
      (canvas.value as any).onChangeActiveObjectTimelineProperty('offset', value * 1000);
    }
  }
});

</script>

<template>
  <section class="flex flex-col h-full overflow-y-auto custom-scrollbar relative px-5 pt-4 pb-20">
    <!-- Top Fade -->
    <div class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-40"></div>

    <div class="flex flex-col gap-10">
      
      <!-- Timeline -->
      <div class="flex flex-col gap-5">
        <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Timeline Management</h4>
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3">
            <div class="flex justify-between items-center px-1">
              <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Duration</span>
              <span class="text-[10px] font-bold font-mono text-brand-primary/80">{{ durationInSecond.toFixed(2) }}s</span>
            </div>
            <SliderInput :model-value="durationInSecond" :min="1" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => durationInSecond = value" class="w-full"/>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex justify-between items-center px-1">
              <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Offset</span>
              <span class="text-[10px] font-bold font-mono text-white/60">{{ offsetInSecond.toFixed(2) }}s</span>
            </div>
            <SliderInput :model-value="offsetInSecond" :min="0" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => offsetInSecond = value" class="w-full"/>
          </div>
        </div>
      </div>

      <!-- Order -->
      <div class="flex flex-col gap-5 border-t border-white/5 pt-8">
        <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Layer Order</h4>
        <div class="grid grid-cols-2 gap-2.5">
          <button v-for="item in move" :key="item.value" @click="onChangeOrder(item.value)" class="group flex items-center justify-center gap-3 h-11 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.97] transition-all text-white/40 hover:text-white">
            <component :is="item.icon" size="14" class="group-hover:scale-110 transition-transform" />
            <span class="text-[11px] font-bold uppercase tracking-widest">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Align -->
      <div class="flex flex-col gap-5 border-t border-white/5 pt-8">
        <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Alignment</h4>
        <div class="grid grid-cols-3 gap-2.5">
          <button v-for="item in align" :key="item.value" @click="onChangeAlign(item.value)" class="group flex items-center justify-center h-11 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.97] transition-all text-white/40 hover:text-white" :title="item.label">
            <component :is="item.icon" size="16" class="group-hover:scale-125 transition-transform" />
          </button>
        </div>
      </div>

      <!-- Flip -->
      <div class="flex flex-col gap-5 border-t border-white/5 pt-8">
        <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Mirroring</h4>
        <div class="grid grid-cols-2 gap-2.5">
          <button @click="flipX = !flipX" 
            :class="[
              'group flex items-center justify-center gap-2.5 h-11 rounded-xl border transition-all active:scale-[0.97]',
              flipX 
                ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary shadow-lg shadow-brand-primary/10 font-bold' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white'
            ]"
          >
            <FlipHorizontally size="16" class="group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-bold uppercase tracking-widest">Horizontal</span>
          </button>
          <button @click="flipY = !flipY" 
            :class="[
              'group flex items-center justify-center gap-2.5 h-11 rounded-xl border transition-all active:scale-[0.97]',
              flipY 
                ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary shadow-lg shadow-brand-primary/10 font-bold' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white'
            ]"
          >
            <FlipVertically size="16" class="group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-bold uppercase tracking-widest">Vertical</span>
          </button>
        </div>
      </div>

      <!-- Advanced -->
      <div class="flex flex-col gap-5 border-t border-white/5 pt-8">
        <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Transform</h4>
        <div class="grid grid-cols-2 gap-x-5 gap-y-7">
          <div class="flex flex-col gap-2.5">
            <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Width</span>
            <el-input-number v-model="width" controls-position="right" :min="1" :max="10000" :precision="0" :step="5" class="cinematic-input-number w-full" />
          </div>
          <div class="flex flex-col gap-2.5">
             <div class="flex items-center justify-between ml-1 pr-1">
                <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Height</span>
                 <button @click="lockRatio = !lockRatio" :class="cn('transition-all hover:scale-125', lockRatio ? 'text-brand-primary' : 'text-white/20 hover:text-white/60')">
                    <Lock v-if="lockRatio" size="14" />
                    <Unlock v-else size="14" />
                 </button>
             </div>
            <el-input-number v-model="height" :disabled="lockRatio" controls-position="right" :min="1" :max="10000" :precision="0" :step="5" class="cinematic-input-number w-full" />
          </div>
          <div class="flex flex-col gap-2.5">
            <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Position X</span>
            <el-input-number v-model="left" controls-position="right" :precision="0" :step="5" class="cinematic-input-number w-full" />
          </div>
          <div class="flex flex-col gap-2.5">
            <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Position Y</span>
            <el-input-number v-model="top" controls-position="right" :precision="0" :step="5" class="cinematic-input-number w-full" />
          </div>
          
           <div class="flex flex-col gap-3 col-span-2">
            <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Angle</span>
             <div class="flex items-center gap-4">
                 <el-slider v-model="rotate" :min="-180" :max="180" :step="1" :show-tooltip="false" class="flex-1 cinematic-slider" />
                 <el-input-number v-model="rotate" :min="-180" :max="180" controls-position="right" :precision="0" :step="1" class="cinematic-input-number w-24 shrink-0" />
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Fade -->
    <div class="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-80"></div>
  </section>
</template>
<style>
  .sidebar-container {
    .rounded {
      --el-border-radius-base: 16px;
    }
  }
</style>
