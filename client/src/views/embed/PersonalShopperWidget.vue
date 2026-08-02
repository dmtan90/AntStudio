<template>
  <div class="personal-shopper-widget-container fixed bottom-6 right-6 z-50 font-sans">
    
    <!-- Floating Circular Action Bubble (Visible when minimized) -->
    <button v-if="isMinimized" 
            @click="toggleExpand"
            class="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-white/20 shadow-2xl flex items-center justify-center text-white active:scale-95 hover:scale-105 transition-all relative overflow-hidden group">
      <!-- Glow effect -->
      <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 blur-md opacity-30 animate-pulse"></div>
      
      <!-- Virtual Agent Avatar Icon or Pulsing Dot -->
      <span class="relative z-10 font-black text-xs tracking-tighter uppercase leading-none">AI Agent</span>
      
      <!-- Pulsing Online Ring -->
      <div class="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-[#0a0a0c] animate-ping"></div>
      <div class="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-[#0a0a0c]"></div>
    </button>

    <!-- Expanded 1-on-1 Personal Shopping Assistant Panel -->
    <div v-else 
         class="w-[360px] h-[580px] rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-3xl shadow-3xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      <!-- Dynamic Header -->
      <div class="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
         <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 relative">
               <span class="font-black text-xs">AI</span>
               <div class="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-400 rounded-full border-2 border-[#0a0a0c]"></div>
            </div>
            <div>
               <h3 class="text-xs font-black uppercase tracking-wider text-white">Neural Assistant</h3>
               <p class="text-[8px] font-black text-green-400 uppercase tracking-widest leading-none mt-0.5">Online &bull; Localized ({{ activeLanguage.toUpperCase() }})</p>
            </div>
         </div>
         <button @click="toggleExpand" class="h-8 w-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
            &times;
         </button>
      </div>

      <!-- Avatar Visual Hub (PixiJS Chroma-Key Bubble) -->
      <div class="relative flex-1 bg-black/30 overflow-hidden flex items-center justify-center">
         <AgentVideoPlayer
             v-if="avatarClips"
             :video-clips="avatarClips"
             :active-state="fsmState"
             :chroma-key-color="[0, 1, 0]"
             :chroma-similarity="0.32"
             :chroma-smoothness="0.15"
             class="w-full h-full object-cover"
         />
         
         <div v-else class="flex flex-col items-center gap-3 text-center p-6 opacity-30">
            <div class="h-10 w-10 rounded-full border-t border-white animate-spin"></div>
            <p class="text-[9px] font-black uppercase tracking-widest">Bridging WebRTC Link...</p>
         </div>

         <!-- Local Voice Transcription Overlay -->
         <div v-if="transcriptionText" 
              class="absolute bottom-4 inset-x-4 p-3 rounded-2xl bg-black/60 border border-white/5 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-300">
            <p class="text-[10px] font-medium leading-relaxed text-white/95">
               {{ transcriptionText }}
            </p>
         </div>

         <!-- Flash Deal overlay trigger (closing state) -->
         <transition name="scale-in">
           <div v-if="fsmState === 'CLOSING'" 
                class="absolute inset-x-4 top-4 p-4 rounded-3xl bg-gradient-to-br from-yellow-500/90 to-yellow-400/90 text-black shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 text-center border border-yellow-300">
              <span class="text-[8px] font-black uppercase tracking-widest opacity-60">EXCLUSIVE DEAL APPLIED</span>
              <h4 class="text-xs font-black uppercase leading-none">Flash Discount - 15% OFF!</h4>
              <p class="text-[10px] font-medium opacity-80 leading-tight">Order within this voice session to claim your deal.</p>
              
              <!-- Instant Checkout QR Simulated Code -->
              <div class="h-20 w-20 bg-white p-1 rounded-xl shadow-lg mt-1 flex items-center justify-center">
                 <!-- Mock QR visual -->
                 <div class="w-full h-full border border-black border-dashed flex items-center justify-center font-mono text-[8px] font-bold">QR PAY</div>
              </div>
           </div>
         </transition>
      </div>

      <!-- Live Chat Feed & Interaction Controls -->
      <div class="p-5 border-t border-white/5 bg-black/30 flex flex-col gap-3">
         
         <!-- Audio Input / Microphone Trigger -->
         <div class="flex items-center justify-center gap-3">
            <button @click="toggleRecording" 
                    class="h-12 w-12 rounded-full border flex items-center justify-center transition-all duration-300 relative group"
                    :class="isRecording ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'">
               <span v-if="isRecording" class="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"></span>
               <!-- Mic Icon -->
               <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
            <div class="flex-1 min-w-0">
               <p class="text-[9px] font-black uppercase tracking-wider text-white/40">
                  {{ isRecording ? 'Listening...' : 'Tap Mic to speak with Agent' }}
               </p>
               <p class="text-[10px] font-bold text-white/80 line-clamp-1 mt-0.5">
                  {{ isRecording ? 'Speech detection active...' : 'Or query product specifications directly' }}
               </p>
            </div>
         </div>

         <!-- Static Actions / Instant buy trigger -->
         <button v-if="fsmState === 'CLOSING'"
                 @click="triggerCheckout" 
                 class="w-full py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
            CLAIM 15% DISCOUNT NOW
         </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import AgentVideoPlayer from '@/components/influencer/AgentVideoPlayer.vue';
import api from '@/utils/api';
import { toast } from 'vue-sonner';

const route = useRoute();
const productId = (route.params.id || route.query.productId) as string;

// UI States
const isMinimized = ref(true);
const loading = ref(true);
const isRecording = ref(false);
const activeLanguage = ref('en');

// Dynamic FSM / Audio States
const fsmState = ref('GREETING');
const transcriptionText = ref('');
const avatarClips = ref<any>(null);

const toggleExpand = () => {
    isMinimized.value = !isMinimized.value;
    if (!isMinimized.value) {
        initShopperSession();
    }
};

const detectLocalLanguage = () => {
    // 1. Scrape document structure and browser parameters
    const rootLang = document.documentElement.lang || 'en';
    const browserLang = navigator.language || 'en';
    
    // 2. Parse language segment path in active routes
    const routePath = route.path;
    let resolved = 'en';

    if (rootLang.startsWith('vi') || browserLang.startsWith('vi') || routePath.includes('/vi/')) {
        resolved = 'vi';
    }
    
    activeLanguage.value = resolved;
    console.log(`[ShopperWidget] Stores detected localized preference: ${resolved.toUpperCase()}`);
};

const initShopperSession = async () => {
    if (!productId) return;
    loading.value = true;
    
    try {
        detectLocalLanguage();
        
        // Handshake dynamic shopper initiation call
        const response: any = await api.post(`/google-agent/shopper/init`, {
            productId,
            langCode: activeLanguage.value,
            sessionId: 'shop_' + Math.random().toString(36).substring(2, 12)
        });

        if (response.success || response.greetingPitch) {
            // Setup mock clips aligned to test profiles
            avatarClips.value = {
                idle: '/clips/idle.mp4',
                speaking: '/clips/speaking.mp4',
                product: '/clips/pitch.mp4',
                checkout: '/clips/closing.mp4'
            };
            
            transcriptionText.value = response.greetingPitch || 'Xin chào! Mình thấy bạn đang xem sản phẩm này. Có ưu đãi giảm giá độc quyền dành riêng cho bạn!';
            
            setTimeout(() => {
                fsmState.value = 'PITCHING';
            }, 6000);
        }
    } catch (e) {
        console.error('Failed to init shopper session:', e);
    } finally {
        loading.value = false;
    }
};

const toggleRecording = () => {
    isRecording.value = !isRecording.value;
    if (isRecording.value) {
        toast.info("Microphone captures enabled. Speak naturally to query the assistant.");
        
        // Simulating speech detection & RAG trigger loop
        setTimeout(() => {
            if (isRecording.value) {
                isRecording.value = false;
                transcriptionText.value = activeLanguage.value === 'vi' 
                    ? "RAG Answer: Sản phẩm này được thiết kế khung kim loại cao cấp và có pin sử dụng liên tục lên đến 48 giờ!"
                    : "RAG Answer: This premium device features 48 hours of continuous battery runtime!";
                fsmState.value = 'Q_AND_A';
                
                setTimeout(() => {
                    fsmState.value = 'CLOSING';
                }, 5000);
            }
        }, 4000);
    }
};

const triggerCheckout = () => {
    toast.success("Promo code V3_SHOPPER_15 applied successfully!");
    // Trigger custom window callback to mother page if available
    window.dispatchEvent(new CustomEvent('shopper:discount_applied', { detail: { discount: 15 } }));
};

onMounted(() => {
    detectLocalLanguage();
});
</script>

<style scoped>
.personal-shopper-widget-container {
  perspective: 1000px;
}
.shadow-3xl {
  box-shadow: 0 50px 100px -20px rgba(0,0,0,0.85);
}
.scale-in-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-in-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
</style>
