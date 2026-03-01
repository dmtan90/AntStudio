<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
// import { ElButton } from 'element-plus';
import { type AISelectPluginProps } from './ai.vue';

// interface AISelectPluginProps {
//   plugin: string;
//   onSelectPlugin: (plugin: string, label: string) => void;
// }

interface AIPluginItem {
  label: string;
  value: string;
  title: string;
  thumbnail: string;
}

const pluginElementMap: Record<string, AIPluginItem[]> = {
  image: [
    {
      title: "Background Removal",
      value: "bg-removal",
      label: "BG Removal",
      thumbnail: "/ai/bg-removal.png",
    },
    {
      title: "AI Upscale",
      value: "upscale",
      label: "Upscale & Denoise",
      thumbnail: "/ai/upscale.png",
    },
    {
      title: "Image Vectorizer",
      value: "vectorize",
      label: "SVG Vectorizer",
      thumbnail: "/ai/vectorize.png",
    },
  ],
  video: [
    {
      title: "Background Removal",
      value: "video-bg-removal",
      label: "BG Removal",
      thumbnail: "/ai/bg-removal.png",
    },
    {
      title: "Magic Write",
      value: "magic-caption",
      label: "Magic Caption",
      thumbnail: "/ai/magic-caption.png",
    },
    {
      title: "Smart Trim",
      value: "smart-trim",
      label: "Trim Silence",
      thumbnail: "/ai/smart-trim.png",
    },
    {
      title: "Auto Reframe",
      value: "auto-reframe",
      label: "9:16 Reframe",
      thumbnail: "/ai/auto-reframe.png",
    },
    {
      title: "Beat Sync",
      value: "beat-sync",
      label: "Beat Sync",
      thumbnail: "/ai/beat-sync.png",
    },
  ],
  textbox: [
    {
      title: "Magic Write",
      value: "magic-write",
      label: "Magic Write",
      thumbnail: "/ai/magic-caption.png",
    },
    {
      title: "Bulk AI Replace",
      value: "bulk-replace",
      label: "Bulk Artifacts",
      thumbnail: "/ai/beat-sync.png",
    },
  ],
  audio: [
    {
      title: "Beat Sync",
      value: "beat-sync",
      label: "Extract Beats",
      thumbnail: "/ai/beat-sync.png",
    }
  ],
  global: [
    {
      title: "AI Creative Director",
      value: "storyboard",
      label: "Generate Storyboard",
      thumbnail: "/ai/storyboard.png",
    },
    {
      title: "Viral Highlights",
      value: "highlights",
      label: "Extract Highlights",
      thumbnail: "/ai/highlights.png",
    },
    {
      title: "Social Media Meta",
      value: "social-meta",
      label: "Viral Metadata",
      thumbnail: "/ai/social-meta.png",
    },
    {
      title: "Content Translation",
      value: "translation",
      label: "Localize Project",
      thumbnail: "/ai/translation.png",
    },
    {
      title: "Vision: Face Detect",
      value: "face-detect",
      label: "Face Analysis",
      thumbnail: "/ai/vision-detect.png",
    },
    {
      title: "Vision: OCR",
      value: "ocr",
      label: "Extract Text",
      thumbnail: "/ai/vision-detect.png",
    }
  ]
};

const props = defineProps<{ onSelectPlugin: (plugin: string, label: string) => void }>();

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);

const plugins = computed(() => {
  if (selected.value && selected.value.type && pluginElementMap[selected.value.type]) {
    return pluginElementMap[selected.value.type];
  }
  return pluginElementMap.global || [];
});
</script>

<template>
  <div class="grid grid-cols-2 gap-5">
    <div v-for="item in plugins" :key="item.value" class="flex flex-col items-center gap-3 group">
      <button 
        class="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:border-brand-primary/50 hover:shadow-lg hover:shadow-brand-primary/10 active:scale-95" 
        @click="props.onSelectPlugin!(item.value, item.title)"
      >
        <img :src="item.thumbnail" alt="" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
            <span class="text-[8px] font-black text-white uppercase tracking-[0.2em]">Launch</span>
        </div>
      </button>
      <span class="text-[10px] font-bold uppercase tracking-widest text-center text-white/40 group-hover:text-white transition-colors duration-300 w-11/12 truncate">
        {{ item.label }}
      </span>
    </div>
  </div>
</template>