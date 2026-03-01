<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { rmbgAI } from 'video-editor/models/rmbgAI';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Magic, Close, Plus, Shield } from '@icon-park/vue-next';

const editor = useEditorStore();
const canvasStore = useCanvasStore();

const loading = ref(false);
const selectedImageId = ref('');
const resultImage = ref<string | null>(null);

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

const onDenoise = async () => {
    const source = selectedImageId.value || (canvasStore.selectionActive as any)?.src;
    if (!source) {
        toast.error("Please select an image first");
        return;
    }

    loading.value = true;
    try {
        const url = await getFileUrl(source, { cached: true });
        const blob = await rmbgAI.denoise(url);
        if (blob) {
            resultImage.value = URL.createObjectURL(blob);
            toast.success("Image denoised successfully!");
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Denoise failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};

const addToCanvas = () => {
    if (!resultImage.value) return;
    canvasStore.canvas?.onAddImageFromSource(resultImage.value, { top: 100, left: 100 });
    toast.success("Added to canvas");
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-2xl bg-emerald-400/5 border border-emerald-400/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <Shield :size="14" class="text-emerald-400" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">AI Denoise</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Remove digital noise and compression artifacts from your images while preserving sharp details.
            </p>
        </div>

        <div class="flex flex-col gap-4 px-1">
            <div class="flex flex-col gap-2">
                <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Source Image</label>
                <el-select v-model="selectedImageId" class="cinematic-select" placeholder="Select image" clearable>
                    <el-option v-for="img in activeTimelineMedia" :key="img.url" :label="img.fileName" :value="img.url" />
                </el-select>
            </div>
        </div>

        <div v-if="resultImage" class="flex flex-col gap-3 mt-2 p-4 bg-white/5 rounded-2xl border border-white/5 group relative overflow-hidden">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-emerald-400/20"></div>
            <div class="flex items-center justify-between mb-1 px-1">
                <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><Magic size="12" /> Denoised Result</span>
                <button @click="resultImage = null" class="text-white/20 hover:text-white transition-colors"><Close size="12" /></button>
            </div>
            <div class="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <img :src="resultImage" class="w-full h-full object-contain" />
            </div>
            <button 
                class="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all font-bold text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2"
                @click="addToCanvas"
            >
                <Plus size="14" /> Add to Canvas
            </button>
        </div>

        <el-button v-else
            type="primary" 
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-2 shadow-lg shadow-emerald-500/10" 
            :loading="loading"
            @click="onDenoise"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Clean Image</span>
        </el-button>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
  @apply opacity-80;
}
</style>
