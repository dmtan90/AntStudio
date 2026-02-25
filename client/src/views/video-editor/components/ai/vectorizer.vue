<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { rmbgAI } from 'video-editor/models/rmbgAI';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Magic } from '@icon-park/vue-next';

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);
const loading = ref(false);

const onVectorize = async () => {
    if (!selected.value || selected.value.type !== 'image') {
        toast.error("Please select an image first");
        return;
    }

    loading.value = true;
    try {
        const url = await getFileUrl((selected.value as any).src);
        const svg = await rmbgAI.vectorize(url);
        
        if (svg) {
            // Add as a path object or custom SVG object to canvas
            editor.canvas.onAddAbstractShape(svg, "vectorized-svg");
            toast.success("Image vectorized and added to canvas!");
            editor.onModified();
        }
    } catch (err) {
        console.error(err);
        toast.error("Vectorization failed");
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="flex flex-col gap-5">
        <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <Magic :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Image Vectorizer</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Convert your raster images into sharp, infinitely scalable SVG vectors.
            </p>
        </div>

        <div class="px-1 mt-2">
            <el-button 
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/10" 
                :loading="loading"
                @click="onVectorize"
            >
                <template #icon><Magic /></template>
                <span class="text-xs font-black uppercase tracking-[0.1em]">Convert to SVG</span>
            </el-button>
        </div>

        <div class="p-3 rounded-xl bg-orange-400/5 border border-orange-400/10">
            <p class="text-[9px] text-orange-400/60 leading-relaxed font-medium">
                Note: Vectorization is best for logos, icons, and simple graphics. Highly detailed photos may take longer.
            </p>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
