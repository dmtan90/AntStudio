<template>
  <div class="product-ad-wizard glass-panel p-8 rounded-[2rem] border border-white/5 animate-in">
    <header class="mb-10 flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-black text-white tracking-tight uppercase mb-2">Product Ad Wizard</h1>
        <p class="text-gray-400 text-sm">Create high-converting video ads in seconds with AI.</p>
      </div>
      <div class="step-indicator flex gap-2">
        <div v-for="i in 4" :key="i" class="w-8 h-1 rounded-full transition-all duration-500" :class="step >= i ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'"></div>
      </div>
    </header>

    <AnimatePresence mode="wait">
      <!-- Step 1: Initialization (AI Extraction) -->
      <Motion v-if="step === 1" key="step1" class="space-y-8" v-bind="motionProps">
        <div class="input-group">
          <label class="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Analyze Product</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="url-input relative group">
              <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                <link-one size="18" />
              </div>
              <input 
                v-model="productUrl" 
                type="text" 
                placeholder="Paste Shopify or Amazon URL..." 
                class="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-500/50 outline-none transition-all"
                @keyup.enter="analyzeProduct"
              />
            </div>
            <div class="file-upload flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500/30 hover:bg-white/[0.02] transition-all cursor-pointer group p-4">
              <div class="text-center">
                <p class="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity">UPLOAD PRODUCT IMAGE</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center pt-8">
          <button 
            class="primary-btn px-12 py-4 rounded-2xl text-[12px] font-black tracking-widest flex items-center gap-3 disabled:opacity-50"
            :disabled="!productUrl || loading"
            @click="analyzeProduct"
          >
            <loading-three v-if="loading" class="animate-spin" size="18" />
            <magic v-else size="18" />
            ANALYZE WITH AI
          </button>
        </div>
      </Motion>

      <!-- Step 2: Review & Refine -->
      <Motion v-else-if="step === 2" key="step2" class="space-y-6" v-bind="motionProps">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
               <div>
                 <label class="block text-[8px] font-black opacity-30 uppercase mb-2">Product Name</label>
                 <input v-model="extractedData.product.name" type="text" class="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs" />
               </div>
               <div>
                 <label class="block text-[8px] font-black opacity-30 uppercase mb-2">Price</label>
                 <input v-model="extractedData.product.price" type="text" class="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs" />
               </div>
            </div>
            <div>
              <label class="block text-[8px] font-black opacity-30 uppercase mb-2">Description</label>
              <textarea v-model="extractedData.product.description" rows="3" class="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs resize-none"></textarea>
            </div>
            <div>
               <label class="block text-[8px] font-black opacity-30 uppercase mb-2">Brand Name</label>
               <input v-model="extractedData.brand.name" type="text" class="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs" />
            </div>
          </div>

          <div class="media-preview grid grid-cols-2 gap-2 content-start">
             <div v-for="(img, idx) in extractedData.product.images" :key="idx" class="aspect-square bg-black rounded-xl overflow-hidden border border-white/5 relative group">
                <img :src="img" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                <div class="absolute top-2 right-2">
                   <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">
                      <check size="12" />
                   </div>
                </div>
             </div>
             <div class="aspect-square border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                <plus size="24" />
             </div>
          </div>
        </div>

        <div class="flex justify-end gap-4 pt-6">
          <button class="secondary-btn px-6 py-3 rounded-xl text-[10px] font-black" @click="step = 1">BACK</button>
          <button class="primary-btn px-10 py-3 rounded-xl text-[10px] font-black" @click="step = 3">CHOOSE TEMPLATE</button>
        </div>
      </Motion>

      <!-- Step 3: Format & Template Selection -->
      <Motion v-else-if="step === 3" key="step3" class="space-y-8" v-bind="motionProps">
        <div>
          <label class="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Select Output Format</label>
          <div class="grid grid-cols-3 gap-6">
            <div 
              v-for="f in formats" 
              :key="f.id" 
              class="format-card p-6 rounded-3xl border transition-all duration-300 cursor-pointer group relative overflow-hidden"
              :class="selectedRatio === f.ratio ? 'bg-blue-500 border-blue-400 shadow-[0_20px_40px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20'"
              @click="selectedRatio = f.ratio"
            >
              <div class="mb-4 opacity-40 group-hover:opacity-100 transition-opacity" :class="{ 'opacity-100': selectedRatio === f.ratio }">
                <component :is="f.icon" size="32" :theme="selectedRatio === f.ratio ? 'filled' : 'outline'" />
              </div>
              <h3 class="text-sm font-black uppercase mb-1" :class="selectedRatio === f.ratio ? 'text-white' : 'text-gray-400'">{{ f.name }}</h3>
              <p class="text-[8px] font-black opacity-40 uppercase">{{ f.desc }}</p>
            </div>
          </div>
        </div>

        <div class="template-grid grid grid-cols-4 gap-4">
           <!-- Template selection logic would go here -->
           <div v-for="i in 4" :key="i" class="aspect-[9/16] bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
              <div class="h-full w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                 <play-two class="opacity-20" size="40" />
              </div>
           </div>
        </div>

        <div class="flex justify-end gap-4">
          <button class="secondary-btn px-6 py-3 rounded-xl text-[10px] font-black" @click="step = 2">BACK</button>
          <button class="primary-btn px-10 py-3 rounded-xl text-[10px] font-black" @click="step = 4">NEXT</button>
        </div>
      </Motion>

      <!-- Step 4: Finalizing & Render Options -->
      <Motion v-else-if="step === 4" key="step4" class="space-y-10" v-bind="motionProps">
        <div class="text-center py-10">
           <div class="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400 mb-6 pulse-glow">
              <rocket size="40" />
           </div>
           <h2 class="text-2xl font-black text-white uppercase mb-2 tracking-tight">Ready to Launch</h2>
           <p class="text-gray-400 text-sm max-w-md mx-auto">Your high-converting ad is ready. Choose how you want to proceed.</p>
        </div>

        <div class="grid grid-cols-2 gap-8 px-10">
           <button class="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.08] transition-all group text-left" @click="launchEditor(false)">
              <div class="mb-6 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition-all">
                 <edit size="24" />
              </div>
              <h3 class="text-lg font-black text-white uppercase mb-2">Editor Studio</h3>
              <p class="text-xs text-gray-400">Full control over every frame, transition, and brand asset.</p>
           </button>

           <button class="p-8 rounded-[2rem] bg-blue-500 border border-blue-400 shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all text-left" @click="launchEditor(true)">
              <div class="mb-6 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <lightning size="24" />
          </div>
          <h3 class="text-lg font-black text-white uppercase mb-2">Quick Render</h3>
          <p class="text-xs text-blue-100">AI builds and exports the video in the background instantly.</p>
        </button>
        </div>

        <div class="flex justify-center">
           <button class="text-[10px] font-black text-gray-500 hover:text-white transition-colors" @click="step = 3">RESELECT TEMPLATE</button>
        </div>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Motion, AnimatePresence } from 'motion-v';
import { 
  Magic, LinkOne, LoadingThree, Check, Plus, Rocket, 
  Edit, Lightning, Iphone, Monitor, Square, PlayTwo 
} from '@icon-park/vue-next';
import api from '@/utils/api';
import { toast } from 'vue-sonner';
import { useRouter } from 'vue-router';
import { useAIStore } from '@/stores/ai';

const router = useRouter();
const aiStore = useAIStore();
const step = ref(1);
const loading = ref(false);
const productUrl = ref('');
const selectedRatio = ref('9:16');

const motionProps = {
  initial: { opacity: 0, x: 20 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4, ease: 'easeOut' }
} as any;

const extractedData = reactive({
  product: {
    name: 'Lumix Glow Case Pro',
    price: '$29.99',
    description: 'The ultimate protection with ambient LED lighting for professional content creators.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'
    ]
  },
  brand: {
    name: 'Lumix Dynamic',
    logo: ''
  }
});

const formats = [
  { id: 'vertical', name: 'Vertical', ratio: '9:16', icon: Iphone, desc: 'TikTok / Reels' },
  { id: 'square', name: 'Square', ratio: '1:1', icon: Square, desc: 'Instagram / Feed' },
  { id: 'landscape', name: 'Landscape', ratio: '16:9', icon: Monitor, desc: 'YouTube / Ads' }
];

const analyzeProduct = async () => {
  if (!productUrl.value) return;
  loading.value = true;
  try {
    const data = await aiStore.analyzeProduct(productUrl.value);
    if (data) {
      Object.assign(extractedData.product, data.product);
      Object.assign(extractedData.brand, data.brand);
      toast.success('Product analyzed successfully!');
      step.value = 2;
    }
  } catch (err) {
    toast.error('AI could not analyze this URL. Please try another or fill manually.');
    step.value = 2; // Allow manual entry as fallback
  } finally {
    loading.value = false;
  }
};

const launchEditor = (headless: boolean) => {
  const payload = {
    product: extractedData.product,
    brand: extractedData.brand,
    objective: 'E-commerce Ad',
    adapter: 'create',
    ratio: selectedRatio.value,
    headless
  };

  const encodedState = btoa(JSON.stringify(payload));
  router.push(`/editor?mode=adapter&state=${encodedState}${headless ? '&headless=true' : ''}`);
};
</script>

<style lang="scss" scoped>
.glass-panel {
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(40px);
}

.primary-btn {
  background: #3b82f6;
  color: white;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
  }
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  color: #888;
  border: 1px border white/5;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

.pulse-glow {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
</style>
