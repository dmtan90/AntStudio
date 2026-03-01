<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, markRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { VueDraggable } from 'vue-draggable-plus';
import { 
  PreviewOpen, PreviewCloseOne, Lock, Unlock, Close as X, 
  Text as Type, ImageFiles as Image, VideoFile as Video, 
  Triangle, Square, GraphicDesign as Shape 
} from '@icon-park/vue-next';
import { storeToRefs } from 'pinia';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { t } = useI18n();
const { canvas, selectionActive } = storeToRefs(canvasStore);

const layers = ref<any[]>([]);

const getObjectIcon = (type: string) => {
  switch (type) {
    case 'textbox': return Type;
    case 'image':
    case 'gif': return Image;
    case 'video': return Video;
    case 'triangle': return Triangle;
    case 'rect': return Square;
    default: return Shape;
  }
};

const updateLayers = () => {
  if (!canvas.value?.instance) {
    layers.value = [];
    return;
  }
  
  const objects = canvas.value.instance.getObjects()
    .filter(obj => obj.name !== 'artboard' && !obj.excludeFromTimeline);
  
  // Fabric stores objects from bottom to top, we want top to bottom for UI
  layers.value = [...objects].reverse().map(obj => ({
    id: obj.name || Math.random().toString(36).substr(2, 9),
    name: obj.name || (obj.type.charAt(0).toUpperCase() + obj.type.slice(1)),
    type: obj.type,
    visible: obj.visible,
    locked: !obj.selectable,
    active: obj === selectionActive.value,
    raw: markRaw(obj)
  }));
};

const onReorder = (event: any) => {
  if (!canvas.value?.instance) return;
  
  // Reorder in Fabric (reverse of UI order)
  const reversed = [...layers.value].reverse();
  const artboard = canvas.value.instance.getObjects().find(o => o.name === 'artboard');
  
  // Start from base index (usually 1 if artboard is at 0)
  let baseIndex = artboard ? 1 : 0;
  
  reversed.forEach((layer, idx) => {
    canvas.value!.instance.moveTo(layer.raw, baseIndex + idx);
  });
  
  canvas.value.instance.requestRenderAll();
  editor.autoSave();
};

const selectLayer = (layer: any) => {
  if (!canvas.value?.instance) return;
  canvas.value.instance.setActiveObject(layer.raw);
  canvas.value.instance.requestRenderAll();
};

const toggleVisibility = (layer: any) => {
  layer.raw.visible = !layer.raw.visible;
  layer.visible = layer.raw.visible;
  canvas.value?.instance.requestRenderAll();
  editor.autoSave();
};

const toggleLock = (layer: any) => {
  const isLocked = !layer.raw.selectable;
  layer.raw.selectable = isLocked;
  layer.raw.evented = isLocked;
  layer.locked = !isLocked;
  canvas.value?.instance.requestRenderAll();
  editor.autoSave();
};

// Listen for canvas changes to update layer list
onMounted(() => {
  updateLayers();
  canvas.value?.instance.on('object:added', updateLayers);
  canvas.value?.instance.on('object:removed', updateLayers);
  canvas.value?.instance.on('selection:created', updateLayers);
  canvas.value?.instance.on('selection:updated', updateLayers);
  canvas.value?.instance.on('selection:cleared', updateLayers);
});

onUnmounted(() => {
  canvas.value?.instance.off('object:added', updateLayers);
  canvas.value?.instance.off('object:removed', updateLayers);
  canvas.value?.instance.off('selection:created', updateLayers);
  canvas.value?.instance.off('selection:updated', updateLayers);
  canvas.value?.instance.off('selection:cleared', updateLayers);
});

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">{{ t('videoEditor.layers.title') }}</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar sidebar-container p-3">
      <VueDraggable
        v-model="layers"
        class="flex flex-col gap-1"
        handle=".drag-handle"
        @end="onReorder"
      >
        <div 
          v-for="layer in layers" 
          :key="layer.id"
          class="flex items-center h-12 bg-white/5 border border-white/5 rounded-xl px-3 gap-3 transition-all cursor-pointer group hover:bg-white/10"
          :class="{ 'ring-1 ring-brand-primary !bg-brand-primary/10': layer.active }"
          @click="selectLayer(layer)"
        >
          <!-- Drag Handle -->
          <div class="drag-handle cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="4" cy="2" r="1" fill="currentColor" />
              <circle cx="8" cy="2" r="1" fill="currentColor" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="8" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="10" r="1" fill="currentColor" />
              <circle cx="8" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>

          <!-- Icon -->
          <div class="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-white/60 group-hover:text-white">
            <component :is="getObjectIcon(layer.type)" :size="14" />
          </div>

          <!-- Name -->
          <div class="flex-1 truncate">
            <span class="text-[11px] font-bold text-white/90">{{ layer.name }}</span>
            <div class="text-[8px] uppercase tracking-tighter text-white/30">{{ layer.type }}</div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              :class="layer.visible ? 'hover:bg-white/10 text-white/40' : 'bg-red-500/10 text-red-400'"
              @click.stop="toggleVisibility(layer)"
              :title="layer.visible ? t('videoEditor.layers.hideLayer') : t('videoEditor.layers.showLayer')"
            >
              <PreviewOpen v-if="layer.visible" :size="14" />
              <PreviewCloseOne v-else :size="14" />
            </button>
            <button 
              class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              :class="!layer.locked ? 'hover:bg-white/10 text-white/40' : 'bg-orange-500/10 text-orange-400'"
              @click.stop="toggleLock(layer)"
              :title="layer.locked ? t('videoEditor.layers.unlockLayer') : t('videoEditor.layers.lockLayer')"
            >
              <Lock v-if="layer.locked" :size="14" />
              <Unlock v-else :size="14" />
            </button>
          </div>
        </div>
      </VueDraggable>

      <div v-if="layers.length === 0" class="h-full flex flex-col items-center justify-center gap-4 py-20">
        <div class="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/10">
          <Shape :size="32" />
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-xs font-bold text-white/40 uppercase tracking-widest">{{ t('videoEditor.layers.noLayers') }}</span>
          <span class="text-[10px] text-white/20">{{ t('videoEditor.layers.emptyStateDesc') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
