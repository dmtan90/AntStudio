<script setup lang="ts">
import { ref } from 'vue';
import { useCanvasStore } from 'video-editor/store/canvas';
import { generateImage } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { Magic, Close, Plus } from '@icon-park/vue-next';

const canvasStore = useCanvasStore();
const userMediaStore = useUserMediaStore();

const loading = ref(false);
const imagePrompt = ref('');
const imageStyle = ref('Cinematic');
const imageAspectRatio = ref('16:9');
const generatedImageMedia = ref<any>(null);

const onGenerateImage = async () => {
    if (!imagePrompt.value) {
        toast.error("Please enter a description for the image");
        return;
    }

    loading.value = true;
    try {
        const res = await generateImage({
            prompt: imagePrompt.value,
            style: imageStyle.value,
            aspectRatio: imageAspectRatio.value
        });
        if (res && (res as any).media) {
            const media = (res as any).media;
            toast.success("Image generated successfully!");
            userMediaStore.addLocalItem('image', media);
            generatedImageMedia.value = media;
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Image generation failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};

const addToEditor = () => {
    if (!generatedImageMedia.value) return;
    canvasStore.canvas?.onAddImageFromSource(getFileUrl(generatedImageMedia.value.key), { top: 100, left: 100 });
    toast.success('Added to editor');
    generatedImageMedia.value = null;
};
</script>

<template>
    <div class="flex flex-col gap-4 p-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Prompt</label>
        <el-input 
            v-model="imagePrompt" 
            type="textarea" 
            :rows="4" 
            placeholder="Describe the image..."
            class="cinematic-input !bg-white/5" 
            resize="none" 
        />

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Style</label>
            <el-select v-model="imageStyle" class="cinematic-select">
              <el-option label="Cinematic" value="Cinematic" />
              <el-option label="Anime" value="Anime" />
              <el-option label="Photorealistic" value="Photorealistic" />
              <el-option label="3D Render" value="3D Render" />
            </el-select>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Ratio</label>
            <el-select v-model="imageAspectRatio" class="cinematic-select">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
              <el-option label="1:1" value="1:1" />
            </el-select>
          </div>
        </div>

        <el-button 
            type="primary"
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-4 shadow-lg shadow-brand-primary/20" 
            :loading="loading"
            @click="onGenerateImage"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-bold uppercase tracking-widest">Generate Image</span>
        </el-button>

        <!-- Image Preview -->
        <div v-if="generatedImageMedia" class="flex flex-col gap-3 mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div class="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div class="flex items-center justify-between px-1">
                <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Magic size="12" /> Result
                </span>
                <button class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors" @click="generatedImageMedia = null">
                    <Close size="12" />
                </button>
            </div>

            <div class="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <img :src="getFileUrl(generatedImageMedia.key)" class="w-full h-full object-cover" />
            </div>

            <button 
                class="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-brand-primary text-black hover:bg-brand-primary/90 transition-all font-bold text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)] mt-1"
                @click="addToEditor"
            >
                <Plus size="14" /> Add to Editor
            </button>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-input .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-4 shadow-inner transition-all duration-300;
}
</style>
