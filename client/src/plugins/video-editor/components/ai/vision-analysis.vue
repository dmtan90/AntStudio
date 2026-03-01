<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { extractTextFromImage } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Scan, Eyes, FileSearch, Peoples, Pic, Magic, Close, Copy, Loading } from '@icon-park/vue-next';
import { clientAiService } from 'video-editor/services/ClientAiService';

const props = defineProps<{ type: 'face' | 'ocr' | 'object' }>();

const editor = useEditorStore();
const loading = ref(false);
const progress = ref(0);
const resultText = ref("");
const detections = ref<any[]>([]);
const selectedMediaId = ref('');

const activeTimelineMedia = computed(() => {
  const _ = editor.tick;
  const userMediaStore = useUserMediaStore();
  const mediaMap = new Map<string, any>();

  editor.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((el: any) => {
        if (el.type === 'image' || el.type === 'video') {
          const url = el.originalSrc || el.src || el.url;
          if (!url || url.startsWith('blob:')) return;
          if (!mediaMap.has(url)) {
            const match = [...userMediaStore.images.items, ...userMediaStore.videos.items].find(m => m.url === url || m.key === url || url.endsWith(m.key));
            mediaMap.set(url, { url, fileName: match?.fileName || (url.split('/').pop()?.split('?')[0] || 'Untitled'), type: el.type });
          }
        }
      });
    }
  });
  return Array.from(mediaMap.values());
});

const onAnalyze = async () => {
    const source = selectedMediaId.value || (editor.canvas.selection.active as any)?.src;
    if (!source) {
        toast.error("Please select a media source first");
        return;
    }

    loading.value = true;
    progress.value = 0;
    try {
        if (props.type === 'ocr') {
            const text = await clientAiService.runTool<string>('ocr', { mediaUrl: source }, (p) => progress.value = p);
            resultText.value = text;
        } else if (props.type === 'face') {
            const faces = await clientAiService.runTool<any[]>('face-detection', { videoUrl: source }, (p) => progress.value = p);
            detections.value = faces.map(f => ({ ...f, name: 'Face' }));
        } else if (props.type === 'object') {
            const objects = await clientAiService.runTool<any[]>('object-detection', { videoUrl: source }, (p) => progress.value = p);
            detections.value = objects.map(o => ({ ...o, name: o.label }));
        }
        
        toast.success("Client-side analysis complete!");
    } catch (err: any) {
        console.error(err);
        toast.error(`Analysis failed: ${err.message}`);
    } finally {
        loading.value = false;
        progress.value = 0;
    }
};

const copyResult = () => {
    if (resultText.value) {
        navigator.clipboard.writeText(resultText.value);
        toast.success("Text copied to clipboard!");
    }
};
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
      <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
      <div class="flex items-center gap-2 mb-3">
        <Scan :size="14" class="text-brand-primary" />
        <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
            {{ type === 'face' ? 'Face Analysis' : type === 'ocr' ? 'Text Extraction' : 'Object Detection' }}
        </span>
      </div>
      <p class="text-[10px] text-white/40 leading-relaxed italic">
        {{ type === 'face' ? 'Identify faces, expressions, and gender within the selected frame.' : type === 'ocr' ? 'Automatically extract and digitize all visible text from the image.' : 'Detect and label individual objects and their scale.' }}
      </p>
    </div>

    <div class="flex flex-col gap-3 px-1">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Select Source</label>
        <el-select v-model="selectedMediaId" class="cinematic-select" placeholder="Choose image" clearable>
            <el-option v-for="img in activeTimelineMedia" :key="img.url" :label="img.fileName" :value="img.url" />
        </el-select>
    </div>

    <div v-if="loading" class="flex flex-col gap-2 px-1">
        <div class="flex justify-between items-center px-1">
            <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest">Scanning...</span>
            <span class="text-[9px] font-black text-brand-primary">{{ Math.round(progress) }}%</span>
        </div>
        <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-brand-primary transition-all duration-300" :style="{ width: `${progress}%` }"></div>
        </div>
    </div>

    <div v-if="resultText || detections.length > 0" class="flex flex-col gap-4">
        <div v-if="type === 'ocr'" class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 relative group">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest">Extracted Text</span>
                <button @click="copyResult" class="text-white/20 hover:text-white transition-colors flex items-center gap-1">
                    <Copy size="12" /> <span class="text-[10px] font-bold uppercase tracking-tighter">Copy</span>
                </button>
            </div>
            <p class="text-[11px] text-white/80 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar italic">
                {{ resultText || 'No text detected' }}
            </p>
        </div>

        <div v-else class="flex flex-col gap-2">
            <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest px-1 mb-1">Detections ({{ detections.length }})</span>
            <div v-for="(d, idx) in detections" :key="idx" 
                 class="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-colors">
                <div class="flex items-center gap-3">
                    <component :is="type === 'face' ? Peoples : Magic" size="14" class="text-white/20 group-hover:text-brand-primary transition-colors" />
                    <span class="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                        {{ type === 'face' ? `Person ${idx + 1}` : d.name }}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <div v-if="type === 'face' && d.emotion" class="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/40 font-black uppercase tracking-tighter">{{ d.emotion }}</div>
                    <span class="text-[9px] font-black text-brand-primary">{{ Math.round((d.confidence || 0.9) * 100) }}%</span>
                </div>
            </div>
        </div>

        <button @click="resultText = ''; detections = []" class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors mt-2 text-center">
            Run New Scan
        </button>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-col items-center justify-center h-[180px] rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01]">
          <component :is="type === 'face' ? Eyes : type === 'ocr' ? FileSearch : Scan" :size="32" class="text-white/5 mb-3" />
          <span class="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">Awaiting Analysis Signal</span>
      </div>
      
      <el-button 
        type="primary" 
        class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/10 mt-2" 
        :loading="loading"
        @click="onAnalyze"
      >
        <template #icon><Scan :size="16" /></template>
        <span class="text-xs font-black uppercase tracking-widest">Begin Scan</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="postcss">
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
