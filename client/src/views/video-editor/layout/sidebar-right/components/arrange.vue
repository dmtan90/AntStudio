<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { Close as X, Aiming, Lock, Unlock, FlipHorizontally, FlipVertically } from '@icon-park/vue-next';
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

const offsetMs = computed(() => (selected.value as any)?.meta?.offset ?? (selected.value as any)?.offset * 1000 ?? 0);
const durationMs = computed(() => (selected.value as any)?.meta?.duration ?? (selected.value as any)?.timeline * 1000 ?? 0);
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
  <section class="sidebar-container flex flex-col h-full">
    <div class="relative overflow-x-scroll scrollbar-hidden">
      <div class="flex flex-col divide-y">
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Timeline</h4>
          <div class="grid grid-cols-1 gap-2.5">
            <div class="flex flex-col">
              <Label class="text-xs shrink-0">Duration (s)</Label>
              <SliderInput :model-value="durationInSecond" :min="1" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => durationInSecond = value"/>
            </div>
            <div class="flex flex-col">
              <Label class="text-xs shrink-0">Offset (s)</Label>
              <SliderInput :model-value="offsetInSecond" :min="0" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => offsetInSecond = value"/>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Order</h4>
          <div class="grid grid-cols-2 gap-2">
            <el-button text bg round class="w-full ml-0" v-for="item in move" :key="item.value" :icon="item.icon" @click="onChangeOrder(item.value)">
              <span>{{ item.label }}</span>
            </el-button>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Align to page</h4>
          <div class="grid grid-cols-3 gap-2">
            <el-button text bg round class="w-full ml-0" v-for="item in align" :key="item.value" :icon="item.icon" @click="onChangeAlign(item.value)">
              <span>{{ item.label }}</span>
            </el-button>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Flip</h4>
          <div class="grid grid-cols-2 gap-2">
            <el-button text bg round class="w-full ml-0" :icon="FlipHorizontally" @click="flipX = !flipX">
              <span>Horizontally</span>
            </el-button>
            <el-button text bg round class="w-full ml-0" :icon="FlipVertically" @click="flipY = !flipY">
              <span>Vertically</span>
            </el-button>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Advanced</h4>
          <div class="grid grid-cols-3 gap-2.5">
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Width (px)</Label>
              <el-input-number v-model="width" controls-position="right" :min="50" :max="100000" :precision="0" :step="5" class="text-xs h-8 w-full rounded" />
            </div>
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Height (px)</Label>
              <el-input-number v-model="height" :disabled="lockRatio" controls-position="right" :min="50" :max="100000" :precision="0" :step="5" class="text-xs h-8 w-full rounded" />
            </div>
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Ratio</Label>
              <Toggle v-model="lockRatio" :disabled="disabledRatio" :type="lockRatio ? 'primary' : ''" round class="!h-8 w-full" size="small" @toggle="value => lockRatio = value">
                <Lock v-if="lockRatio" :size="15" />
                <Unlock v-else :size="15" />
              </Toggle>
            </div>
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Top (px)</Label>
              <el-input-number v-model="top" controls-position="right" :precision="0" :step="5" class="text-xs h-8 w-full rounded" />
            </div>
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Left (px)</Label>
              <el-input-number v-model="left" controls-position="right" :precision="0" :step="5" class="text-xs h-8 w-full rounded" />
            </div>
            <div class="flex flex-col items-center justify-between">
              <Label class="text-xs shrink-0">Rotate (°)</Label>
              <el-input-number v-model="rotate" :min="-180" :max="180" controls-position="right" :precision="0" :step="45" class="text-xs h-8 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<style>
  .sidebar-container {
    .rounded {
      --el-border-radius-base: 16px;
    }
  }
</style>
