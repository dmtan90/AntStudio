<template>
  <div @click="inputRef?.click()" 
       class="upload-dropzone group transition-all duration-300 relative overflow-hidden"
       :class="{'has-file': hasFile, 'loading': loading}">
    
    <input type="file" ref="inputRef" style="display: none" :accept="accept" @change="handleChange" @click="($event.target as any).value = null" />
    
    <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
      <el-icon class="is-loading text-blue-400 text-2xl mb-2"><loading /></el-icon>
      <span class="text-[9px] font-black uppercase tracking-widest text-white/80">{{ $t('studio.common.syncing') }}</span>
    </div>

    <template v-if="!hasFile">
      <slot name="icon">
        <component :is="icon" theme="outline" size="32" class="mb-2 opacity-40 group-hover:scale-110 transition-transform" />
      </slot>
      <div class="text-[11px] font-black uppercase tracking-widest text-white/80">{{ title }}</div>
      <div class="text-[9px] opacity-40 mt-1">{{ subtitle }}</div>
    </template>
    
    <template v-else>
      <div class="flex items-center gap-4 w-full px-6">
        <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <CheckOne theme="outline" size="20" class="text-blue-400" />
        </div>
        <div class="flex-1 text-left">
          <div class="text-[10px] font-black uppercase tracking-widest text-blue-400">
            {{ activeTitle }}
          </div>
          <div class="text-[9px] opacity-40 truncate">{{ activeSubtitle }}</div>
        </div>
        <el-button size="small" link class="text-blue-400 font-bold hover:text-white" @click.stop="inputRef?.click()">{{ $t('studio.common.changeBtn') || 'Change' }}</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Loading, CheckOne, UploadOne } from '@icon-park/vue-next';

withDefaults(defineProps<{
  title: string;
  subtitle: string;
  activeTitle: string;
  activeSubtitle: string;
  hasFile: boolean;
  loading?: boolean;
  accept?: string;
  icon?: any;
}>(), {
  icon: UploadOne
});

const emit = defineEmits(['change']);
const inputRef = ref<HTMLInputElement | null>(null);

const handleChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit('change', file);
};
</script>

<style lang="postcss" scoped>
.upload-dropzone {
  @apply flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5;
}
.upload-dropzone.has-file {
  @apply border-blue-500/20 bg-blue-500/5 p-4 border-solid;
}
</style>
