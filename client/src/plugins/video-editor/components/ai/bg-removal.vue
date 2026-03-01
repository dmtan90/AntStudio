<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { AutoWidth as ChevronsLeftRight, Magic, Pic, Close, Plus } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import VueDraggable from 'vue-draggable-resizable';
import { rmbgAI, WEBGPU_MODEL_ID } from 'video-editor/models/rmbgAI';
import { useCanvasStore } from 'video-editor/store/canvas';
import { useEditorStore } from 'video-editor/store/editor';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { storeToRefs } from "pinia";
import { getFileUrl } from '@/utils/api';

const editor = useEditorStore();
const { selectionActive: selected, canvas, replacer, instance } = storeToRefs(useCanvasStore());

const position = ref(0);
const refContainer = ref<HTMLElement | null>(null);
const dimensions = ref({ width: 0, height: 0 });
const entry = ref<any>(null);
const loading = ref(false);
const selectedImageId = ref('');

const activeTimelineMedia = computed(() => {
  const _ = editor.tick;
  const userMediaStore = useUserMediaStore();
  const mediaMap = new Map<string, any>();

  editor.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((el: any) => {
        if (el.type === 'image') {
          const url = el.originalSrc || el.src || el.url;
          if (!url || url.startsWith('blob:')) return;
          if (!mediaMap.has(url)) {
            const match = userMediaStore.images.items.find(m => m.url === url || m.key === url || url.endsWith(m.key));
            mediaMap.set(url, { url, fileName: match?.fileName || (url.split('/').pop()?.split('?')[0] || 'Untitled') });
          }
        }
      });
    }
  });
  return Array.from(mediaMap.values());
});

const updateEntry = () => {
    const sel = (selected.value as any);
    const key = selectedImageId.value || sel?.name || '';
    entry.value = rmbgAI.cache.get(key);
};

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

watch(selectedImageId, () => {
    updateEntry();
});

const handleRemoveBackground = async () => {
  try {
    const source = selectedImageId.value || (selected.value as any)?.src;
    if (!source) {
        toast.error("Please select an image first");
        return;
    }

    updateDimensions();
    loading.value = true;
    
    const resolvedOriginal = await getFileUrl(source, { cached: true });

    if(!rmbgAI.getModelInfo().isLoaded){
      toast.info("Loading Background Removal Model (WASM)...");
      await rmbgAI.initializeModel(WEBGPU_MODEL_ID);
    }
    
    const cacheKey = selectedImageId.value || (selected.value as any)?.name || 'temp_bg_removal';
    const blob = await rmbgAI.removeBackground(resolvedOriginal, cacheKey);
    
    if(!blob){
      toast.error("Unable to remove background from image");
      return;
    }

    const modified = URL.createObjectURL(blob);
    rmbgAI.addCacheEntry(cacheKey, resolvedOriginal, modified, "original");
    updateEntry();
    toast.success("Background removed successfully!");
  } catch (error) {
    toast.error("Background removal failed: " + error);
    console.error(error);
  } finally {
    loading.value = false
  }
};

const handleAdd = () => {
  if (!entry.value) return;
  canvas.value?.onAddImageFromSource(entry.value.modified, { top: 100, left: 100 });
  toast.success("Added to canvas");
};

const onDrag = (x: number, y: number) => {
  if(x < 0) return false;
  if(x > dimensions.value.width) return false;
  position.value = x;
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <Pic :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">BG Removal</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                AI will professionally isolate the subject from the background. Works best with clear contrast.
            </p>
        </div>

        <div class="flex flex-col gap-3 px-1">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Image</label>
            <el-select v-model="selectedImageId" class="cinematic-select" placeholder="Choose from timeline or current selection" clearable>
                <el-option v-for="img in activeTimelineMedia" :key="img.url" :label="img.fileName" :value="img.url" />
            </el-select>
        </div>

        <div class="w-full relative h-[240px] rounded-2xl overflow-hidden bg-black/40 border border-white/5" ref="refContainer" v-loading="loading">
            <template v-if="entry">
                <div class="bg-transparent-pattern h-full">
                    <img :src="entry.modified" class="w-full h-full object-contain" />
                </div>
                <div class="bg-transparent-pattern absolute inset-0 overflow-hidden" :style="{ width: position + 'px', height: dimensions.height + 'px' }">
                    <img :src="entry.original" class="w-full h-full object-contain object-left-top" />
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
                    <div class="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center cursor-ew-resize shadow-lg shadow-brand-primary/40">
                        <ChevronsLeftRight :size="14" class="text-black" />
                    </div>
                </VueDraggable>
            </template>
            <div v-else class="flex flex-col items-center justify-center h-full p-8 text-center bg-white/[0.02]">
                <Pic :size="32" class="text-white/10 mb-4" />
                <p class="text-[11px] text-white/30 font-bold uppercase tracking-widest">Ready for analysis</p>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <el-button 
                v-if="!entry"
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/20" 
                :loading="loading"
                @click="handleRemoveBackground"
            >
                <template #icon><Magic :size="16" /></template>
                <span class="text-xs font-black uppercase tracking-widest">Remove Background</span>
            </el-button>

            <template v-else>
                <button 
                    class="flex items-center justify-center gap-2 h-12 w-full rounded-2xl bg-brand-primary text-black hover:bg-brand-primary/90 transition-all font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]"
                    @click="handleAdd"
                >
                    <Plus size="16" /> Add to Canvas
                </button>
                <button 
                    class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2 text-center"
                    @click="entry = null; selectedImageId = ''"
                >
                    Clear Result
                </button>
            </template>
        </div>
    </div>
</template>

<style scoped>
.bg-transparent-pattern {
  background-image: 
    linear-gradient(45deg, #222 25%, transparent 25%), 
    linear-gradient(-45deg, #222 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #222 75%),
    linear-gradient(-45deg, transparent 75%, #222 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
.draggable-wrapper {
  background: transparent !important;
  border: none !important;
}
</style>
