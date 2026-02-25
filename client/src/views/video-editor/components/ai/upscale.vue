<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { rmbgAI } from 'video-editor/models/rmbgAI';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Transform, Magic } from '@icon-park/vue-next';

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);
const loading = ref(false);
const factor = ref(2);

const onUpscale = async () => {
  if (!selected.value || selected.value.type !== 'image') {
    toast.error("Please select an image first");
    return;
  }

  loading.value = true;
  try {
    const url = await getFileUrl((selected.value as any).src);
    const blob = await rmbgAI.upscale(url, factor.value);
    if (blob) {
      const newUrl = URL.createObjectURL(blob);
      (selected.value as any).setSrc(newUrl, () => {
        editor.canvas.instance.requestRenderAll();
        editor.onModified();
      });
      toast.success("Image upscaled!");
    }
  } catch (err) {
    console.error(err);
    toast.error("Upscale failed");
  } finally {
    loading.value = false;
  }
};

const onDenoise = async () => {
  if (!selected.value || selected.value.type !== 'image') return;
  loading.value = true;
  try {
    const url = await getFileUrl((selected.value as any).src);
    const blob = await rmbgAI.denoise(url);
    if (blob) {
      const newUrl = URL.createObjectURL(blob);
      (selected.value as any).setSrc(newUrl, () => {
        editor.canvas.instance.requestRenderAll();
        editor.onModified();
      });
      toast.success("Noise removed!");
    }
  } catch (err) {
    console.error(err);
    toast.error("Denoise failed");
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
        <Transform :size="14" class="text-brand-primary" />
        <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">AI Upscale</span>
      </div>
      <p class="text-[10px] text-white/40 leading-relaxed italic">
        Enhance image resolution and clarity using super-resolution AI.
      </p>
    </div>

    <div class="flex flex-col gap-4 px-1">
      <div class="flex flex-col gap-2">
        <label class="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Scale Factor</label>
        <div class="flex p-1 bg-white/5 rounded-xl border border-white/5">
          <button 
            @click="factor = 2"
            :class="[factor === 2 ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : 'text-white/40 border-transparent']"
            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all border"
          >
            2x
          </button>
          <button 
            @click="factor = 4"
            :class="[factor === 4 ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : 'text-white/40 border-transparent']"
            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all border"
          >
            4x
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 mt-2">
        <el-button 
            type="primary" 
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none shadow-lg shadow-brand-primary/10" 
            :loading="loading"
            @click="onUpscale"
        >
            <template #icon><Transform /></template>
            <span class="text-xs font-black uppercase tracking-[0.1em]">Upscale Image</span>
        </el-button>

        <el-button 
            class="cinematic-button !h-12 !rounded-2xl !bg-white/5 !border-white/10 !text-white/60 hover:!bg-white/10" 
            :loading="loading"
            @click="onDenoise"
        >
            <template #icon><Magic /></template>
            <span class="text-xs font-black uppercase tracking-[0.1em]">Remove Noise</span>
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
  @apply opacity-80;
}
</style>
