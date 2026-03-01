<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { AutoEditorService } from '../../services/AutoEditorService';
import type { BrandKit } from '../../api/ai';
import { Google as BrandIcon, Magic, Google as Palette, LinkOne, AlignTextLeft, BringToFront, CheckSmall } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const editor = useEditorStore();

const isDetecting  = ref(false);
const isApplying   = ref(false);
const isCloning    = ref(false);
const referenceUrl = ref('');
const clonedPalette = ref<string[]>([]);

const logoPositions = [
  { id: 'top-left',     label: '↖ Top Left' },
  { id: 'top-right',    label: '↗ Top Right' },
  { id: 'bottom-left',  label: '↙ Bottom Left' },
  { id: 'bottom-right', label: '↘ Bottom Right' },
] as const;

const brandKit = reactive<BrandKit>({
  primaryColor:   '#6366f1',
  secondaryColor: '#a855f7',
  logoUrl:        '',
  fontFamily:     '',
  logoPosition:   'bottom-right',
});

const handleAutoDetect = async () => {
  if (isDetecting.value) return;
  isDetecting.value = true;
  try {
    const kit = await AutoEditorService.detectBrandKit(editor.id);
    if (kit) {
      Object.assign(brandKit, kit);
      toast.success('Brand kit auto-detected from your project assets!');
    } else {
      toast.info('No brand assets detected. Configure your kit manually.');
    }
  } catch {
    toast.error('Brand detection failed.');
  } finally {
    isDetecting.value = false;
  }
};

const handleApply = async () => {
  if (isApplying.value) return;
  isApplying.value = true;
  try {
    await AutoEditorService.applyBrandKitToProject(editor.id, { ...brandKit });
  } catch {
    toast.error('Failed to apply brand kit.');
  } finally {
    isApplying.value = false;
  }
};

const handleClone = async () => {
  if (!referenceUrl.value.trim() || isCloning.value) return;
  isCloning.value = true;
  clonedPalette.value = [];
  try {
    const res = await AutoEditorService.cloneVisualStyleFromReference(referenceUrl.value.trim());
    if (res?.palette) {
      clonedPalette.value = res.palette;
      // Apply first two colors to the brand kit
      if (res.palette[0]) brandKit.primaryColor   = res.palette[0];
      if (res.palette[1]) brandKit.secondaryColor = res.palette[1];
      toast.success('Visual style cloned! Palette applied to your brand kit.');
    }
  } catch {
    toast.error('Style cloning failed.');
  } finally {
    isCloning.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
        <BrandIcon :size="16" class="text-fuchsia-400" />
        Brand Kit
      </h3>
      <p class="text-[10px] text-white/40 italic">Enforce your brand identity across every scene.</p>
    </div>

    <!-- Colors -->
    <div class="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
          <Palette :size="12" class="text-fuchsia-400" /> Brand Colors
        </span>
        <el-button size="small" class="!h-6 !text-[8px] !font-black !uppercase !tracking-widest !border-white/10 !bg-white/5 !text-white/60 !rounded-lg" :loading="isDetecting" @click="handleAutoDetect">
          <template #icon><Magic :size="10" /></template> Auto-Detect
        </el-button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-[8px] text-white/30 uppercase font-black tracking-wider">Primary</span>
          <div class="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <input type="color" v-model="brandKit.primaryColor"
                   class="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer" />
            <span class="text-[9px] text-white/50 font-mono">{{ brandKit.primaryColor }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[8px] text-white/30 uppercase font-black tracking-wider">Secondary</span>
          <div class="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <input type="color" v-model="brandKit.secondaryColor"
                   class="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer" />
            <span class="text-[9px] text-white/50 font-mono">{{ brandKit.secondaryColor }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logo & Font -->
    <div class="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
        <BringToFront :size="12" class="text-fuchsia-400" /> Logo & Typography
      </span>

      <div class="flex flex-col gap-2">
        <label class="text-[8px] text-white/30 uppercase font-black tracking-wider">Logo URL</label>
        <el-input v-model="brandKit.logoUrl" size="small" placeholder="https://…/logo.png"
                  class="cinematic-input !rounded-xl" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-[8px] text-white/30 uppercase font-black tracking-wider">Font Family</label>
        <el-input v-model="brandKit.fontFamily" size="small" placeholder="Inter, Poppins, Roboto…"
                  class="cinematic-input !rounded-xl" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-[8px] text-white/30 uppercase font-black tracking-wider">Logo Position</label>
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="p in logoPositions" :key="p.id"
                  class="text-[8px] font-black uppercase py-1.5 px-2 rounded-lg border transition-all"
                  :class="brandKit.logoPosition === p.id
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300'
                    : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/10'"
                  @click="brandKit.logoPosition = p.id">
            {{ p.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Style Transfer -->
    <div class="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
        <LinkOne :size="12" class="text-fuchsia-400" /> Style Transfer
      </span>
      <p class="text-[8px] text-white/30 italic">Paste a reference URL to clone its visual palette.</p>

      <el-input v-model="referenceUrl" size="small" placeholder="https://example.com/reference-video"
                class="cinematic-input !rounded-xl" />

      <!-- Cloned palette preview -->
      <div v-if="clonedPalette.length" class="flex gap-2 mt-1">
        <div v-for="(c, i) in clonedPalette" :key="i"
             class="w-6 h-6 rounded-md border border-white/10 shadow-lg"
             :style="{ background: c }" :title="c" />
      </div>

      <el-button class="cinematic-button !bg-white/5 !text-white !h-9 !rounded-xl !border-white/10 hover:!border-fuchsia-500/30"
                 :loading="isCloning" @click="handleClone">
        <template #icon><AlignTextLeft :size="12" /></template>
        <span class="text-[9px] font-black uppercase tracking-widest ml-1">Clone Style</span>
      </el-button>
    </div>

    <!-- Apply CTA -->
    <el-button class="cinematic-button !bg-fuchsia-600 !text-white !h-12 !rounded-xl !border-none shadow-xl shadow-fuchsia-500/20 !text-[11px] !font-black !uppercase !tracking-widest"
               :loading="isApplying" @click="handleApply">
      <template #icon><CheckSmall :size="16" /></template>
      Apply to All Scenes
    </el-button>
  </div>
</template>

<style scoped lang="postcss">
/* Inherits global cinematic styles */
</style>
