<script setup lang="ts">
import { ref } from 'vue';
import { extractTextFromImage, detectFaces, detectObjects } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Scan, Loading, CheckOne, Eyes, FileSearch, Peoples } from '@icon-park/vue-next';

const props = defineProps<{ type: 'face' | 'ocr' | 'object' }>();

const loading = ref(false);
const resultText = ref("");
const detections = ref<any[]>([]);

const onAnalyze = async () => {
    loading.value = true;
    try {
        // In a real app, we'd take a screenshot of the canvas or use the selected media
        // For now we'll simulate with an empty image body or specific logic
        const dummyImage = "BASE64_PLACEHOLDER"; 

        if (props.type === 'ocr') {
            const res: any = await extractTextFromImage({ image: dummyImage });
            resultText.value = res.text;
        } else if (props.type === 'face') {
            const res: any = await detectFaces({ image: dummyImage });
            detections.value = res.faces || [];
        } else if (props.type === 'object') {
            const res: any = await detectObjects({ image: dummyImage });
            detections.value = res.objects || [];
        }
        
        toast.success("Analysis complete!");
    } catch (err: any) {
        console.error(err);
        toast.error("Vision analysis failed");
    } finally {
        loading.value = false;
    }
};

const copyResult = () => {
    if (resultText.value) {
        navigator.clipboard.writeText(resultText.value);
        toast.success("Text copied!");
    }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 relative overflow-hidden group">
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
      <div class="flex items-center gap-3 mb-3">
        <Scan :size="18" class="text-blue-400" />
        <span class="text-xs font-black text-white uppercase tracking-[0.2em]">
            {{ type === 'face' ? 'Face Analysis' : type === 'ocr' ? 'OCR Text Extraction' : 'Object Detection' }}
        </span>
      </div>
      <p class="text-[11px] text-white/50 leading-relaxed italic pr-4">
        AI will analyze the current frame to {{ type === 'face' ? 'detect faces and emotions' : type === 'ocr' ? 'extract all visible text' : 'identify objects and their positions' }}.
      </p>
    </div>

    <div v-if="resultText || detections.length > 0" class="flex flex-col gap-4">
        <div v-if="type === 'ocr'" class="p-4 rounded-xl bg-white/[0.03] border border-white/5 relative">
            <span class="text-[10px] text-white/80 whitespace-pre-wrap leading-relaxed">{{ resultText }}</span>
            <button @click="copyResult" class="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all">
                <FileSearch :size="12" />
            </button>
        </div>

        <div v-else class="flex flex-col gap-2">
            <div v-for="(d, idx) in detections" :key="idx" 
                 class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center px-4">
                <span class="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                    {{ type === 'face' ? `Face ${idx + 1}: ${d.emotion || 'neutral'}` : d.name }}
                </span>
                <span class="text-[9px] font-black text-blue-500">{{ Math.round((d.confidence || 0.9) * 100) }}%</span>
            </div>
        </div>

        <el-button @click="resultText = ''; detections = []" class="cinematic-button !h-10 !text-[9px] !bg-white/5 !border-white/10 !text-white/40 hover:!text-white">
            Reset
        </el-button>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="flex items-center justify-center py-10 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01]">
          <div class="flex flex-col items-center gap-3">
              <Eye :size="32" class="text-white/10" />
              <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Ready for Scan</span>
          </div>
      </div>
      
      <el-button 
        type="primary" 
        class="cinematic-button is-primary !h-14 !rounded-2xl !border-none w-full shadow-xl shadow-blue-500/20 group overflow-hidden mt-2" 
        :loading="loading"
        @click="onAnalyze"
      >
        <template #icon><Scan :size="16" /></template>
        <span class="text-xs font-black uppercase tracking-[0.2em]">Run Vision Analysis</span>
      </el-button>
    </div>
  </div>
</template>
