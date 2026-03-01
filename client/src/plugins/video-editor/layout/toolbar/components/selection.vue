<script setup lang="ts">
import { Mask as Blend } from '@icon-park/vue-next';
import { ElButton } from 'element-plus';

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap px-1 py-1">
    <button class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group transition-all duration-300 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white shadow-sm active:scale-95">
      <Blend :size="16" class="text-white/40 group-hover:text-white transition-colors" />
      <span class="text-[10px] font-bold uppercase tracking-widest">Combine</span>
    </button>
  </div>
</template>