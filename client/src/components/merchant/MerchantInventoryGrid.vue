<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Edit, Delete, Magic } from '@icon-park/vue-next';

const { t } = useI18n();

defineProps<{
    products: any[];
    loading: boolean;
}>();

const emit = defineEmits(['edit', 'delete', 'create-ad', 'preview']);
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div v-for="i in 8" :key="i" class="aspect-[3/4] bg-white/5 rounded-3xl animate-pulse"></div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         <div 
            v-for="p in products" 
            :key="p._id" 
            class="group relative bg-white/5 border border-white/5 rounded-3xl overflow-hidden hover:bg-white/[0.08] hover:border-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            @click="emit('preview', p)"
         >
            <!-- Image -->
            <div class="aspect-square bg-black relative overflow-hidden">
               <img :src="p.image || '/placeholder-product.png'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
               
               <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  <button @click.stop="emit('edit', p)" class="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white text-white hover:text-black transition-colors">
                     <edit size="12" />
                  </button>
                  <button @click.stop="emit('delete', p)" class="w-8 h-8 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center hover:bg-red-500 text-red-500 hover:text-white transition-colors">
                     <delete size="12" />
                  </button>
               </div>
            </div>

            <!-- Details -->
            <div class="p-6">
               <div class="flex justify-between items-start mb-2">
                  <h3 class="text-lg font-black leading-tight line-clamp-1" :title="p.name">{{ p.name }}</h3>
               </div>
               <div class="flex items-end justify-between mb-4 flex-wrap">
                  <div class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                     {{ p.currency }} {{ p.price }}
                  </div>
                  <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500" :class="{ 'text-red-500': p.stock < 5 }">
                     {{ $t('merchant.inventory.inStock', { count: p.stock }) }}
                  </div>
               </div>

               <button 
                  @click.stop="emit('create-ad', p)" 
                  class="w-full py-3 rounded-xl bg-white/5 hover:bg-blue-600 text-gray-300 hover:text-white text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 group-btn"
               >
                  <magic class="group-btn-hover:animate-pulse" size="14" />
                  {{ $t('merchant.inventory.generateAd') }}
               </button>
            </div>
         </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
