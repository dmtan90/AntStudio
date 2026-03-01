<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { rmbgAI } from 'video-editor/models/rmbgAI';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Magic, Pic } from '@icon-park/vue-next';

const editor = useEditorStore();
const canvasStore = useCanvasStore();

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

const onVectorize = async () => {
    const source = selectedImageId.value || (canvasStore.selectionActive as any)?.src;
    if (!source) {
        toast.error("Please select an image first");
        return;
    }

    loading.value = true;
    try {
        const url = await getFileUrl(source, { cached: true });
        const svg = await rmbgAI.vectorize(url);
        
        if (svg) {
            canvasStore.canvas?.onAddAbstractShape(svg, "vectorized-svg");
            toast.success("Image vectorized and added to canvas!");
            editor.onModified();
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Vectorization failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-2xl bg-orange-400/5 border border-orange-400/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <Magic :size="14" class="text-orange-400" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Image Vectorizer</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Convert your raster images into sharp, infinitely scalable SVG vectors. Best for logos and icons.
            </p>
        </div>

        <div class="flex flex-col gap-3 px-1">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Source Image</label>
            <el-select v-model="selectedImageId" class="cinematic-select" placeholder="Select image" clearable>
                <el-option v-for="img in activeTimelineMedia" :key="img.url" :label="img.fileName" :value="img.url" />
            </el-select>
        </div>

        <el-button 
            type="primary" 
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-orange-500/10 mt-2" 
            :loading="loading"
            @click="onVectorize"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Convert to SVG</span>
        </el-button>

        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 opacity-60">
            <p class="text-[9px] text-white/40 leading-relaxed font-medium italic">
                Note: Highly detailed photos may take longer and produce complex paths.
            </p>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
