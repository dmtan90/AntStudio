<template>
  <div class="product-landing min-h-screen bg-[#0a0a0c] text-white font-outfit overflow-x-hidden">
    <!-- Ambient Background Effects -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/10 via-transparent to-transparent"></div>
      <div class="absolute -top-48 -left-48 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s"></div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen relative z-10">
       <div class="w-16 h-16 rounded-full border-t-2 border-blue-500 animate-spin mb-4"></div>
       <p class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/60">{{ t('productLanding.loading') }}</p>
    </div>

    <div v-else-if="product" class="relative z-10">
      <!-- Sticky Navigation -->
      <nav class="fixed top-0 left-0 w-full z-50 px-8 py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
         <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-3">
               <img v-if="product.brand_logo" :src="product.brand_logo" class="h-8 w-auto rounded-lg shadow-lg border border-white/10" />
               <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-xs" v-else>
                  {{ product.brand_name ? product.brand_name[0] : 'P' }}
               </div>
               <span class="text-sm font-black uppercase tracking-tighter">{{ product.brand_name || t('common.unknownProduct') }}</span>
            </div>
            <button @click="redirectToOrder" class="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95">
               {{ t('productLanding.orderNow') }}
            </button>
         </div>
      </nav>

      <!-- Hero Section: The Ad Video -->
      <section class="pt-32 pb-20 px-8 h-[100vh] overflow-y-scroll">
         <div class="max-w-7xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
               <!-- Product Info -->
               <div class="lg:col-span-5 space-y-8">
                  <div class="space-y-2">
                     <span class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 opacity-80">{{ product.brand_slogan || 'Revolutionary Design' }}</span>
                     <h1 class="text-6xl font-black leading-[0.9] tracking-tighter">{{ product.name }}</h1>
                  </div>

                  <p class="text-lg text-gray-400 leading-relaxed max-w-md">{{ product.description }}</p>

                  <div class="flex items-baseline gap-2">
                     <span class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{{ product.currency }} {{ product.price }}</span>
                     <span class="text-xs text-gray-500 uppercase font-black tracking-widest">{{ t('productLanding.freeShipping') }}</span>
                  </div>

                  <div class="flex flex-wrap gap-3">
                     <div v-for="feat in product.features" :key="feat" class="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {{ feat }}
                     </div>
                  </div>

                  <div class="pt-6">
                     <button @click="redirectToOrder" class="group relative px-12 py-5 rounded-3xl bg-white text-black text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] overflow-hidden">
                        <span class="relative z-10 flex items-center gap-3">
                           {{ t('productLanding.secureCheckout') }} <rocket theme="filled" size="14" />
                        </span>
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     </button>
                  </div>
               </div>

               <!-- Video Player -->
               <div class="lg:col-span-7 relative group">
                  <div class="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div class="relative aspect-video rounded-[32px] overflow-hidden bg-black border border-white/10 shadow-2xl overflow-hidden">
                     <video 
                        v-if="product.video"
                        :src="getFileUrl(product.video)" 
                        controls 
                        autoplay 
                        muted 
                        loop
                        class="w-full h-full object-contain"
                     ></video>
                     <img v-else :src="product.image || '/placeholder-product.png'" class="w-full h-full object-cover" />
                     
                     <div v-if="!product.video" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white">{{ t('productLanding.previewUnavailable') }}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Image Gallery -->
      <section class="py-20 px-8 bg-white/[0.02] border-y border-white/5">
         <div class="max-w-7xl mx-auto">
            <h2 class="text-sm font-black uppercase tracking-[0.3em] text-gray-500 mb-12 text-center">{{ t('productLanding.visualGallery') }}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div 
                  v-for="(img, idx) in product.images" 
                  :key="idx" 
                  class="rounded-[24px] overflow-hidden border border-white/10 aspect-square group cursor-pointer"
               >
                  <img :src="img" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               </div>
            </div>
         </div>
      </section>

      <!-- Specs & Brand -->
      <section class="py-32 px-8">
         <div class="max-w-4xl mx-auto text-center space-y-12">
            <div class="inline-flex items-center gap-6 px-10 py-5 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl">
               <div class="text-left py-2">
                  <div class="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">{{ t('productLanding.authenticProduct') }}</div>
                  <div class="text-sm font-black uppercase text-white">{{ product.brand_name || t('common.verifiedCollection') }}</div>
               </div>
               <div class="w-px h-10 bg-white/10"></div>
               <div class="text-left py-2">
                  <div class="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">{{ t('productLanding.stockStatus') }}</div>
                  <div class="text-sm font-black uppercase" :class="product.stock > 0 ? 'text-green-400' : 'text-red-400'">{{ product.stock > 0 ? t('productLanding.limitedStock') : t('productLanding.outOfStock') }}</div>
               </div>
            </div>

            <p class="text-3xl font-black text-white/50 leading-tight italic">
               &ldquo;{{ product.tagline || t('productLanding.getItNow') }}&rdquo;
            </p>

            <div class="pt-12">
               <button @click="redirectToOrder" class="text-xs font-black uppercase tracking-[0.3em] text-blue-400 hover:text-white transition-colors">
                  {{ t('productLanding.getItNow') }} &rarr;
               </button>
            </div>
         </div>
      </section>

      <!-- Footer -->
      <footer class="py-12 border-t border-white/5 px-8 text-center">
         <p class="text-[8px] font-black uppercase tracking-widest text-gray-600">
            {{ t('productLanding.poweredBy', { appName: String(uiStore.appName) }) }} &bull; &copy; {{ new Date().getFullYear() }}
         </p>
      </footer>
    </div>

    <div v-else class="flex flex-col items-center justify-center min-h-screen relative z-10 px-8">
       <div class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-8 border border-red-500/20">
          <close-one size="32" />
       </div>
       <h2 class="text-2xl font-black uppercase tracking-tighter mb-4 text-white">{{ t('productLanding.notFound.title') }}</h2>
       <p class="text-xs text-gray-500 uppercase tracking-widest mb-10 text-center">{{ t('productLanding.notFound.desc') }}</p>
       <button @click="$router.push('/')" class="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white">{{ t('productLanding.notFound.backHome') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Rocket, Check, CloseOne, VideoFile, Broadcast } from '@icon-park/vue-next';
import { useUserStore } from '@/stores/user';
import api, { getFileUrl } from '@/utils/api';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui';

const { t } = useI18n()
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();
const id = route.params.id as string;

const loading = ref(true);
const product = ref<any>(null);

// Analytics Session Management
const getAnalyticsSessionId = () => {
   let sid = localStorage.getItem('af_analytics_sid');
   if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('af_analytics_sid', sid);
   }
   return sid;
};

const trackEvent = async (type: 'view' | 'click') => {
   try {
      await api.post(`/commerce/products/${id}/track`, {
         type,
         sessionId: getAnalyticsSessionId(),
         userId: userStore.user?._id,
         userDemographics: userStore.user ? {
            ageGroup: userStore.user.preferences?.ageGroup, // Placeholder if field exists
            gender: userStore.user.preferences?.gender
         } : null
      });
   } catch (err) {
      console.warn('Silent analytics fail', err);
   }
};

const fetchData = async () => {
   loading.value = true;
   try {
      const res: any = await api.get(`/commerce/products/${id}/public`);
      if (res.success) {
         product.value = res.data;
      }
   } catch (err) {
      console.error('Failed to load product landing page', err);
   } finally {
      loading.value = false;
   }
};

const redirectToOrder = () => {
   trackEvent('click');
   if (product.value?.inventoryUrl) {
      window.location.href = product.value.inventoryUrl;
   }
};

onMounted(() => {
   fetchData();
   trackEvent('view');
});
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.product-landing {
   &::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0);
      background-size: 32px 32px;
      pointer-events: none;
   }
}
</style>
