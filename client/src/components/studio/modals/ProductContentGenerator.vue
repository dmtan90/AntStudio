<template>
  <el-dialog v-model="isVisible" :show-close="false" :align-center="true" :width="800"
    class="generator-modal glass-dark">
    <template #header>
      <div class="flex justify-between items-center p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <cpu theme="outline" size="20" class="text-purple-400" />
          </div>
          <div>
            <h2 class="text-lg font-black text-white uppercase tracking-tighter">AI Content Generator</h2>
            <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Intelligent asset production via Veo3</p>
          </div>
        </div>
        <button @click="$emit('update:modelValue', false)" class="close-btn">
          <close theme="outline" size="20" />
        </button>
      </div>
    </template>

    <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
      <div v-for="product in studioStore.liveProducts" :key="product.id" 
           class="p-6 rounded-[32px] bg-white/5 border border-white/5 flex flex-col gap-6 hover:border-purple-500/30 transition-all">
        
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0">
            <img :src="product.image" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1">
            <h3 class="text-md font-black text-white uppercase tracking-tight">{{ product.name }}</h3>
            <p class="text-xs text-white/40 mt-1 line-clamp-2">{{ product.description }}</p>
            
            <div class="flex items-center gap-3 mt-4">
              <div class="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full" :class="product.video ? 'bg-green-500' : 'bg-red-500'"></div>
                <span class="text-[9px] font-black text-white/40 uppercase tracking-widest">TVC Status</span>
              </div>
              <div class="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full" :class="product.eventClip?.['product'] ? 'bg-green-500' : 'bg-red-500'"></div>
                <span class="text-[9px] font-black text-white/40 uppercase tracking-widest">AIdol Clip</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Action: Generate TVC -->
          <div class="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <div class="flex items-center gap-2">
              <movie theme="outline" size="14" class="text-orange-400" />
              <span class="text-[10px] font-black text-white/60 uppercase tracking-widest">Product TVC (Visual Only)</span>
            </div>
            <button 
              @click="generateAsset(product, 'tvc')"
              :disabled="studioStore.assetGeneration[product.id + '_tvc'] === 'pending'"
              class="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              :class="studioStore.assetGeneration[product.id + '_tvc'] === 'pending' ? 'bg-white/5 text-white/20' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white'"
            >
              <loading-four v-if="studioStore.assetGeneration[product.id + '_tvc'] === 'pending'" theme="outline" size="14" class="animate-spin" />
              <flash-lamp v-else theme="outline" size="14" />
              {{ studioStore.assetGeneration[product.id + '_tvc'] === 'pending' ? 'Generating...' : 'Regenerate TVC' }}
            </button>
          </div>

          <!-- Action: Generate AIdol Clip -->
          <div class="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <div class="flex items-center gap-2">
              <robot theme="outline" size="14" class="text-purple-400" />
              <span class="text-[10px] font-black text-white/60 uppercase tracking-widest">Model Product Showcase</span>
            </div>
            <button 
              @click="generateAsset(product, 'aidol')"
              :disabled="studioStore.assetGeneration[product.id + '_aidol'] === 'pending'"
              class="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              :class="studioStore.assetGeneration[product.id + '_aidol'] === 'pending' ? 'bg-white/5 text-white/20' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white'"
            >
              <loading-four v-if="studioStore.assetGeneration[product.id + '_aidol'] === 'pending'" theme="outline" size="14" class="animate-spin" />
              <Magic theme="outline" size="14" v-else />
              {{ studioStore.assetGeneration[product.id + '_aidol'] === 'pending' ? 'Synthesizing...' : 'Generate AI Gesture' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="p-6 text-center border-t border-white/5 bg-white/[0.02]">
        <p class="text-[10px] text-white/20 font-bold uppercase tracking-widest">
          Veo3 Engine v1.0 • Autonomous Multi-Ratio Rendering Active
        </p>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useAIStore } from '@/stores/ai';
import { VeoPromptService } from '@/utils/ai/VeoPromptService';
import { toast } from 'vue-sonner';
import { 
  Close, Cpu, LoadingFour, Flashlamp, Movie, Robot, Magic 
} from '@icon-park/vue-next';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const studioStore = useStudioStore();
const aiStore = useAIStore();

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const generateAsset = async (product: any, type: 'tvc' | 'aidol') => {
  const genKey = `${product.id}_${type}`;
  if (studioStore.assetGeneration[genKey] === 'pending') return;
  
  studioStore.assetGeneration[genKey] = 'pending';
  
  try {
    const prompt = VeoPromptService.generateVeoPrompt({
      hostType: 'aidol', 
      product,
      vibe: studioStore.studioVibe,
      customEvent: type === 'aidol' ? 'product' : undefined
    });
    
    toast.info(`Triggering Veo3 for: ${product.name} (${type})`);
    
    // 1. Start generation
    const genRes = await aiStore.generateVideo({
      prompt,
      duration: 10,
      aspectRatio: '16:9'
    });
    
    const jobId = genRes.jobId;
    if (!jobId) throw new Error('No Job ID returned from AI Engine');

    // 2. Poll for completion
    const result = await aiStore.pollVideoStatus(jobId);
    
    if (result.status === 'completed' && result.videoUrl) {
      studioStore.linkProductToAidolClip(
        product.id, 
        result.videoUrl, 
        type === 'aidol' ? 'product' : undefined
      );
      
      studioStore.assetGeneration[genKey] = 'success';
      toast.success(`${type === 'tvc' ? 'TVC' : 'AI Clip'} generated successfully!`);
    } else {
      throw new Error(result.error || 'Generation failed to return video URL');
    }
    
  } catch (e: any) {
    console.error(e);
    studioStore.assetGeneration[genKey] = 'failed';
    toast.error(`Generation failed: ${e.message || 'Check AI quota'}`);
  }
};
</script>

<style scoped lang="scss">
.generator-modal {
  :deep(.el-dialog) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :deep(.el-dialog__header) { padding: 0; margin: 0; }
  :deep(.el-dialog__body) { padding: 0; }
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: rotate(90deg);
  }
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
