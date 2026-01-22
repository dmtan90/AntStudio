<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, type PropType } from 'vue';
import { AutoWidth as ChevronsLeftRight } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import VueDraggable from 'vue-draggable-resizable';

import Spinner from 'video-editor/components/ui/spinner.vue';

import { rmbgAI, WEBGPU_MODEL_ID } from 'video-editor/models/rmbgAI';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { getFileUrl } from '@/utils/api';

const { selectionActive: selected, canvas, replacer, instance } = storeToRefs(useCanvasStore());

const position = ref(0);
const refContainer = ref<HTMLElement | null>(null);
const dimensions = ref({ width: 0, height: 0 });
const entry = ref(null);
const pending = ref(null);

const updateEntry = () => {
  const sel = selected.value as any;
  entry.value = rmbgAI.cache.get(sel?.name || '');
  pending.value = rmbgAI.pending.get(sel?.name || '');
};

const loading = ref(false);

const updateDimensions = () => {
  if (refContainer.value) {
    dimensions.value = { 
      width: refContainer.value.offsetWidth,
      height: refContainer.value.offsetHeight
    };
  }
};

onMounted(() => {
  updateEntry();
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
});

watch(() => dimensions.value.width, (newWidth) => {
  position.value = newWidth / 2;
});

const handleRemoveBackground = async () => {
  try {
    updateDimensions();
    loading.value = true;
    const sel = selected.value as any;
    const original = entry.value ? entry.value.original : sel.src;
    const resolvedOriginal = await getFileUrl(original, { cached: true });

    if(!rmbgAI.getModelInfo().isLoaded){
      toast.info("Loading Background Remove Model");
      await rmbgAI.initializeModel(WEBGPU_MODEL_ID);
    }
    const blob = await rmbgAI.removeBackground(resolvedOriginal, sel.name);
    if(!blob){
      toast.error("Unable to remove background from image");
      return;
    }
    const modified = URL.createObjectURL(blob);
    const selName = sel.name || '';
    entry.value ? rmbgAI.updateCacheEntry(selName, { modified }) : rmbgAI.addCacheEntry(selName, original, modified, "original");
    updateEntry();
  } catch (error) {
    toast.error("Unable to remove background from image: " + error);
    console.error(error);
  } finally {
    loading.value = false
  }
};

const handleAdd = () => {
  if (!entry.value) return;
  const sel = selected.value as any;
  const { scaleX, scaleY, cropX, cropY, angle, height, width, top = 0, left = 0 } = sel;
  canvas.value?.onAddImageFromSource(entry.value.modified, { top: top + 50, left: left + 50, scaleX, scaleY, cropX, cropY, angle, height, width }, true);
  toast.success("The modified image has been added to your artboard");
  updateEntry();
};

const handleReplaceOriginal = () => {
  if (!entry.value) return;
  const sel = selected.value as any;
  replacer.value?.mark((instance.value as any)?.getActiveObject());
  replacer.value.replace(entry.value.modified).then(() => {
    rmbgAI.updateCacheEntry(sel.name, { usage: "modified" });
    toast.success("The selected image has been replaced");
    updateEntry();
  });
};

const handleRestoreOriginal = async () => {
  if (!entry.value) return;
  const sel = selected.value as any;
  replacer.value?.mark((instance.value as any)?.getActiveObject());
  try {
    const resolvedOriginal = await getFileUrl(entry.value.original, { cached: true });
    replacer.value.replace(resolvedOriginal).then(() => {
      rmbgAI.updateCacheEntry(sel.name, { usage: "original" });
      toast.success("The selected image has been restored");
      updateEntry();
    });
  } catch (error) {
    toast.error("Failed to restore original image");
  }
};

const onDrag = (x: number, y: number) => {
  if(x < 0) return false;
  if(x > dimensions.value.width) return false;
  position.value = x;
};

</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="w-full relative h-full min-h-[200px]" ref="refContainer" v-loading="loading">
      <template v-if="entry">
        <div class="bg-transparent-pattern h-full">
          <img :src="entry.modified" class="w-full h-auto" />
        </div>
        <div class="bg-transparent-pattern absolute inset-0 overflow-hidden" :style="{ width: position + 'px', height: dimensions.height + 'px' }">
          <img :src="entry.original" class="w-full h-auto object-cover object-left-top" />
        </div>
        <VueDraggable
          class-name="draggable-wrapper"
          :w="40"
          :h="40"
          axis="x"
          :x="position"
          :y="dimensions.height/2 - 20"
          :z="10"
          :active="true"
          :draggable="true"
          @dragging="onDrag"
        >
          <div class="w-10 h-10 bg-primary/80 rounded-full flex items-center justify-center cursor-ew-resize">
            <ChevronsLeftRight :size="20" class="text-white" />
          </div>
        </VueDraggable>
      </template>
      <div v-else class="flex flex-col items-center justify-center p-8 bg-muted/20 border-2 border-dashed rounded-lg">
        <div class="bg-transparent-pattern mb-4 rounded overflow-hidden" v-if="selected">
          <img :src="(selected as any).src" class="max-h-[150px] w-auto" />
        </div>
        <p class="text-sm text-muted-foreground text-center mb-4">Background removal</p>
        <el-button type="primary" :loading="loading" @click="handleRemoveBackground">Remove Background</el-button>
      </div>
    </div>
    
    <div v-if="entry" class="flex flex-col gap-2">
      <el-button type="primary" plain @click="handleAdd">Add to canvas</el-button>
      <el-button type="primary" plain @click="handleReplaceOriginal" v-if="entry.usage == 'original'">Replace current image</el-button>
      <el-button type="primary" plain @click="handleRestoreOriginal" v-else>Restore original image</el-button>
    </div>
  </div>
</template>

<style>
.bg-transparent-pattern {
  background-image: 
    linear-gradient(45deg, #ccc 25%, transparent 25%), 
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
.draggable-wrapper {
  background: transparent !important;
  border: none !important;
}
</style>