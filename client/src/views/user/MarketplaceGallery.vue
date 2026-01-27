<template>
  <div class="marketplace-gallery p-6 animate-in">
    <header class="gallery-header flex justify-between items-end mb-10">
      <div>
        <div class="flex items-center gap-2 mb-2">
           <shopping class="text-blue-500" size="24" />
           <h1 class="text-3xl font-black text-white tracking-tight uppercase">Asset Marketplace</h1>
        </div>
        <p class="text-gray-400">Upgrade your production with community-driven premium assets.</p>
      </div>
      
      <div class="flex items-center gap-4">
         <div class="wallet-pill px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
            <span class="text-[10px] font-black opacity-40 uppercase">Your Balance</span>
            <span class="text-sm font-black text-blue-400">1,240 CRT</span>
         </div>
         <button class="action-btn px-6 py-2 text-[10px] font-black bg-white/5">+ LIST ASSET</button>
      </div>
    </header>

    <div class="filters-row flex justify-between items-center mb-10 pb-6 border-b border-white/5">
       <div class="categories flex gap-4">
          <button v-for="cat in categories" :key="cat" class="category-btn px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all" :class="activeCategory === cat ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-500 hover:text-white'" @click="activeCategory = cat">
             {{ cat }}
          </button>
       </div>
       <div class="search-box w-64 relative">
          <search class="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size="14" />
          <input type="text" placeholder="SEARCH ASSETS..." class="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 text-[10px] font-black focus:border-blue-500/50 outline-none" />
       </div>
    </div>

    <div v-if="loading" class="grid grid-cols-4 gap-8 opacity-20">
       <div v-for="i in 8" :key="i" class="h-64 bg-white/10 rounded-3xl animate-pulse"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
       <div v-for="asset in filteredAssets" :key="asset.id" class="asset-card group glass-card p-4 rounded-3xl border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.03] transition-all duration-500 cursor-pointer">
          <div class="preview-area aspect-[4/3] rounded-2xl bg-black mb-4 overflow-hidden relative">
             <img :src="asset.previewUrl" class="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" />
             <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
             
             <!-- Badges -->
             <div class="absolute top-3 left-3 flex gap-2">
                <span class="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black uppercase border border-white/10">{{ asset.type }}</span>
                <span v-if="asset.isOfficial" class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[8px] font-black uppercase border border-blue-500/20">Official</span>
             </div>
             
             <div class="buy-overlay absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="primary-btn px-6 py-3 rounded-xl text-[10px] font-black" @click.stop="confirmPurchase(asset)">GET NOW</button>
             </div>
          </div>

          <div class="asset-info space-y-2">
             <div class="flex justify-between items-start">
                <h3 class="text-sm font-black text-white px-1 leading-tight">{{ asset.title }}</h3>
                <div class="price text-blue-400 font-black text-sm">{{ asset.price }} <span class="text-[8px] opacity-40">CRT</span></div>
             </div>
             <div class="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-1">
                <div class="flex items-center gap-1.5">
                   <div class="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[6px]">{{ asset.author[0] }}</div>
                   <span class="opacity-40">{{ asset.author }}</span>
                </div>
                <div class="flex items-center gap-1 opacity-40">
                   <star size="10" /> {{ asset.rating }}
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- Purchase Dialog -->
    <el-dialog v-model="showPurchase" title="CONFIRM TRANSACTION" width="400px" custom-class="glass-dialog">
       <div v-if="selectedAsset" class="text-center py-6">
          <div class="mb-6 w-20 h-20 bg-blue-500/10 rounded-2xl border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
             <hand-down size="40" />
          </div>
          <h2 class="text-xl font-black mb-2">{{ selectedAsset.title }}</h2>
          <p class="text-gray-400 text-xs mb-8">This asset will be permanently added to your personal library and available in all projects.</p>
          
          <div class="p-6 bg-black/40 rounded-2xl border border-white/5 flex justify-between items-center mb-8">
             <div class="text-left">
                <p class="text-[8px] font-black opacity-30 uppercase">PURCHASE PRICE</p>
                <div class="text-2xl font-black text-blue-400">{{ selectedAsset.price }} CRT</div>
             </div>
             <div class="text-right">
                <p class="text-[8px] font-black opacity-30 uppercase">SYSTEM FEE</p>
                <div class="text-[10px] font-black">0 CRT</div>
             </div>
          </div>
       </div>
       <template #footer>
          <div class="flex justify-between items-center px-4 pb-4">
             <div class="text-left text-[8px] font-black uppercase opacity-20">Secured via AntFlow Economy</div>
             <div class="flex gap-2">
                <button class="secondary-btn text-[10px] px-6 py-2" @click="showPurchase = false">CANCEL</button>
                <button class="primary-btn text-[10px] px-8 py-3" @click="processPurchase">CONFIRM & BUY</button>
             </div>
          </div>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Shopping, Search, Star, HandDown, CheckOne } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const categories = ['ALL', 'OVERLAYS', 'PERSONAS', 'TEMPLATES', 'SCENES', 'AUDIO'];
const activeCategory = ref('ALL');
const loading = ref(false);
const showPurchase = ref(false);
const selectedAsset = ref<any>(null);

const assets = ref([
 { id: 1, title: 'CYBERPUNK HUD PRO', type: 'overlay', price: 450, author: 'NeonVibe', rating: 4.8, isOfficial: true, previewUrl: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
 { id: 2, title: 'ZEN MINIMALIST STUDIO', type: 'template', price: 120, author: 'SkyDesign', rating: 4.9, isOfficial: false, previewUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
 { id: 3, title: 'AI NEWS ANCHOR - EMMA', type: 'persona', price: 1500, author: 'AntFlow Labs', rating: 5.0, isOfficial: true, previewUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
 { id: 4, title: 'LO-FI BEATS COLLECTION', type: 'audio', price: 25, author: 'BeatMaster', rating: 4.5, isOfficial: false, previewUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
 { id: 5, title: 'HOLOGRAM NEWS OVERLAY', type: 'overlay', price: 85, author: 'AeroVisuals', rating: 4.7, isOfficial: false, previewUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
 { id: 6, title: 'VAPORWAVE LIVE TEMPLATE', type: 'template', price: 50, author: 'RetroMod', rating: 4.6, isOfficial: false, previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
]);

const filteredAssets = computed(() => {
 if (activeCategory.value === 'ALL') return assets.value;
 return assets.value.filter(a => a.type.toUpperCase() === activeCategory.value);
});

const confirmPurchase = (asset: any) => {
 selectedAsset.value = asset;
 showPurchase.value = true;
};

const processPurchase = () => {
 toast.success(`Deployment complete! ${selectedAsset.value.title} is now in your Studio library.`);
 showPurchase.value = false;
};
</script>

<style lang="scss" scoped>
.glass-card {
 backdrop-filter: blur(40px);
}
</style>
