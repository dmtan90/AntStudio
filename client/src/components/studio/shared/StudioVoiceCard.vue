<template>
  <div class="voice-card group" :class="{'active': active}">
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-blue-500/40 transition-all">
          <avatar theme="outline" size="20" class="text-white/60" />
        </div>
        <div class="text-left">
          <div class="text-[11px] font-black uppercase text-white/90 leading-tight">{{ name }}</div>
          <div class="text-[9px] opacity-40 uppercase tracking-tighter">{{ gender }} • {{ $t('studio.common.highFidelity') }}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <el-button 
          size="small" 
          circle 
          class="voice-preview-btn bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-500/40 text-white" 
          @click.stop="$emit('preview')"
          :loading="loading"
        >
          <play v-if="!playing" theme="outline" size="14" />
          <pause-one v-else theme="outline" size="14" />
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Avatar, Play, PauseOne } from '@icon-park/vue-next';

defineProps<{
  name: string;
  gender: string;
  active: boolean;
  playing?: boolean;
  loading?: boolean;
}>();

defineEmits(['preview']);
</script>

<style lang="postcss" scoped>
.voice-card {
  @apply p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-blue-500/40 hover:bg-white/10 transition-all;
}
.voice-card.active {
  @apply border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_-10px_rgba(59,130,246,0.5)];
}
</style>
