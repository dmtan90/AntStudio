<template>
  <div class="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
     <h3 class="text-sm font-black uppercase tracking-widest text-gray-500 mb-6">Connected Accounts</h3>
     
     <div class="space-y-4">
        <div v-for="acc in accounts.slice(0, 3)" :key="acc._id" class="flex items-center justify-between group">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                 <youtube v-if="acc.platform === 'youtube'" class="text-red-500" size="20" theme="filled" />
                 <facebook v-else-if="acc.platform === 'facebook'" class="text-blue-500" size="20" theme="filled" />
                 <tiktok v-else-if="acc.platform === 'tiktok'" class="text-white" size="20" theme="outline" />
                 <share-three v-else class="text-gray-400" size="20" />
              </div>
              <div>
                 <div class="font-bold text-sm">{{ acc.name || acc.platform }}</div>
                 <div class="text-[10px] text-gray-500 uppercase tracking-wilder font-bold">Connected</div>
              </div>
           </div>
           <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>

        <button @click="router.push('/platforms')" class="w-full py-3 mt-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white transition-all">
           Manage Platforms
        </button>
     </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Youtube, Facebook, Tiktok, ShareThree } from '@icon-park/vue-next';

defineProps<{
  accounts: any[];
}>();

const router = useRouter();
</script>
