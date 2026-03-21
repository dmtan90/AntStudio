<template>
  <div class="sales-overlay absolute inset-0 pointer-events-none overflow-hidden">

    <!-- ─── TOP BAR ─── -->
    <div class="absolute top-6 inset-x-6 flex items-center justify-between pointer-events-auto gap-4 z-20">
      <!-- Live Badge + Stats -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 shadow-lg shadow-red-500/30">
          <div class="h-2 w-2 rounded-full bg-white animate-pulse"></div>
          <span class="text-xs font-black uppercase tracking-wider text-white">LIVE</span>
        </div>
        <div class="flex items-center gap-3 text-sm font-bold text-white/60">
          <span>● {{ viewers }}</span>
          <span>● {{ duration }}</span>
        </div>
      </div>

      <!-- Flash Sale Timer -->
      <div v-if="flashSale" class="timer-card flex flex-col items-center px-8 py-3 rounded-2xl border border-yellow-500/30 bg-[#1a1100]/80 backdrop-blur-xl shadow-2xl">
        <span class="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-500/70">FLASH SALE ENDS IN</span>
        <span class="text-4xl font-black tabular-nums tracking-tighter text-white leading-none">{{ timerDisplay }}</span>
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400 mt-0.5">{{ activeProduct?.name?.toUpperCase() || 'SUMMER TECH DEALS' }}</span>
      </div>
    </div>

    <!-- ─── RIGHT SIDEBAR: PRODUCT SPOTLIGHT ─── -->
    <div class="absolute top-6 right-6 bottom-6 w-72 flex flex-col gap-3 pointer-events-auto z-20">
      <!-- Header -->
      <div class="flex items-center justify-between px-1 pt-14">
        <h2 class="text-base font-black text-white tracking-tight">Product Spotlight</h2>
      </div>

      <!-- Current Product Card -->
      <div v-if="activeProduct" class="spotlight-card flex flex-col overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0f0f14]/80 backdrop-blur-xl shadow-2xl">
        <div class="px-4 py-2 border-b border-white/5">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">CURRENT SPOTLIGHT</span>
        </div>
        <!-- Product Image -->
        <div class="relative aspect-square overflow-hidden bg-[#1a1a24] p-4 mx-3 my-2 rounded-2xl border border-white/5">
          <img :src="activeProduct.image" class="h-full w-full object-contain" />
          <span v-if="activeProduct.category"
            class="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-[9px] font-black text-white uppercase backdrop-blur-sm">
            {{ activeProduct.category }}
          </span>
        </div>
        <!-- Product Info -->
        <div class="px-4 pb-4 flex flex-col gap-2">
          <h3 class="text-sm font-bold text-white leading-tight line-clamp-2">{{ activeProduct.name }}</h3>
          <div class="flex items-baseline gap-2">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/30">SALE PRICE</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-xl font-black text-pink-500">{{ currency }}{{ activeProduct.price }}</span>
            <span v-if="flashSale" class="text-sm text-white/30 line-through">{{ currency }}{{ (activeProduct.price * 1.4).toFixed(0) }}</span>
          </div>
          <!-- Features -->
          <ul class="space-y-1">
            <li v-for="feat in (activeProduct.features || []).slice(0, 3)" :key="feat"
              class="flex items-center gap-2 text-[10px] text-white/50 font-medium">
              <span class="text-pink-500">•</span> {{ feat }}
            </li>
          </ul>
          <!-- CTA -->
          <button @click.stop="$emit('highlight-product', activeProduct.id)"
            class="mt-2 w-full rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 py-2.5 text-[11px] font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-500/20 active:scale-95 transition-transform">
            ADD TO CART
          </button>
        </div>
      </div>

      <!-- Up Next -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">COMING UP NEXT</span>
        </div>
        <div class="space-y-2">
          <div v-for="(product, idx) in upNextProducts" :key="idx"
            class="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0f0f14]/80 px-3 py-2.5 backdrop-blur-xl">
            <div class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5 border border-white/5 p-1">
              <img :src="product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=100'"
                class="h-full w-full object-contain" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-bold text-white leading-tight line-clamp-1">{{ product.name }}</p>
              <p class="text-[9px] font-black uppercase text-white/30 mt-0.5">{{ product.category || 'Standard' }}</p>
            </div>
          </div>
          <!-- Placeholder rows if empty -->
          <div v-for="i in Math.max(0, 3 - upNextProducts.length)" :key="`ph-${i}`"
            class="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0f0f14]/40 px-3 py-2.5">
            <div class="h-12 w-12 rounded-xl bg-white/5"></div>
            <div class="space-y-1.5">
              <div class="h-2.5 w-28 rounded bg-white/5"></div>
              <div class="h-2 w-16 rounded bg-white/5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── CHAT OVERLAY (Bottom Left) ─── -->
    <div class="absolute bottom-6 left-6 w-[340px] pointer-events-auto z-20">
      <div class="rounded-[1.5rem] border border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-3 border-b border-white/5">
          <span class="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">LIVE CHAT</span>
        </div>
        <div class="p-5 space-y-4 max-h-40 overflow-y-auto scrollbar-hide">
          <div v-for="msg in recentMessages" :key="msg.id" class="flex gap-3">
            <div class="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-black"
              :style="`background:${msg.color}20; color:${msg.color}`">
              {{ msg.name?.[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="text-xs font-black"
                :class="msg.isAI ? 'text-indigo-400' : 'text-white'">
                {{ msg.name }}{{ msg.isAI ? '' : ':' }}
              </p>
              <p class="text-xs text-white/70 leading-snug mt-0.5">{{ msg.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── SUPERVISOR MODE DOCK (Bottom Right) ─── -->
    <div class="absolute bottom-6 right-6 pointer-events-auto z-20">
      <div class="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0f0f14]/80 px-5 py-3 backdrop-blur-xl shadow-2xl">
        <div class="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" class="h-5 w-5 text-blue-400"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-white leading-none">SUPERVISOR MODE</p>
          <p class="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">AUTONOMOUS AI ASSISTANT</p>
          <p class="text-[8px] text-green-400 uppercase tracking-widest">STATUS: ACTIVE · SUPERVISOR MODE</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStudioStore } from '@/stores/studio';

defineEmits(['highlight-product']);

const studioStore = useStudioStore();
const currency = '$';

const activeProduct = computed(() => studioStore.highlightedProduct || studioStore.featuredProducts?.[0]);
const flashSale = computed(() => studioStore.activeFlashSale);
const upNextProducts = computed(() => {
  const products = studioStore.featuredProducts || [];
  const cur = activeProduct.value;
  return products.filter(p => p !== cur).slice(0, 3);
});

const viewers = computed(() => {
  const v = studioStore.viewerCount || 0;
  return v > 1000 ? `${(v / 1000).toFixed(1)}K Viewers` : `${v} Viewers`;
});

const duration = computed(() => {
  const s = studioStore.liveTime || 0;
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
});

const recentMessages = computed(() => {
  const msgs: any[] = [];
  const colors = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ef4444', '#3b82f6'];
  return msgs.slice(-5).map((m: any, i: number) => ({
    id: m.id || i,
    name: m.isAI ? 'AI Sales Assistant' : (m.username || m.from || 'User'),
    content: m.content || m.text || m.message,
    isAI: m.isAI || m.type === 'ai',
    color: m.isAI ? '#6366f1' : colors[i % colors.length],
  }));
});

// Timer
const timerDisplay = ref('00:14:32');
let timerInterval: any = null;

const updateTimer = () => {
  if (!flashSale.value) { timerDisplay.value = '00:00:00'; return; }
  const start = Number(flashSale.value.startTime) || Date.now();
  const durationMs = (Number(flashSale.value.durationMinutes) || 0) * 60000;
  const end = start + durationMs;
  const diff = Math.max(0, end - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  timerDisplay.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

onMounted(() => { timerInterval = setInterval(updateTimer, 1000); updateTimer(); });
onUnmounted(() => { if (timerInterval) clearInterval(timerInterval); });
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.timer-card { box-shadow: 0 0 60px rgba(234,179,8,0.1); }
</style>
