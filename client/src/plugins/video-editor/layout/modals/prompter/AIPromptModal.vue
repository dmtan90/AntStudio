<script setup lang="ts">
import { computed } from 'vue';
import { ElDialog } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';

const editor = useEditorStore();

const prompterModal = computed(() => editor.prompter.modal);

const handleClose = () => {
  (editor.prompter as any).onToggleModal(false);
};

</script>

<template>
  <el-dialog :model-value="prompterModal" class="cinematic-dialog prompter-dialog !p-0 overflow-hidden"
    @close="handleClose" width="800px" destroy-on-close :show-close="false">
    <div class="h-[600px] flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      <!-- Cinematic Modal Header -->
      <div
        class="h-14 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <div class="h-6 w-1 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <span class="text-[12px] font-black uppercase tracking-[0.2em] text-white/90">AI Prompter</span>
        </div>

        <button @click="handleClose"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="group-hover:rotate-90 transition-transform duration-300">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div
          class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/10 ring-1 ring-white/5 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
            class="text-white/80">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 10 10 0 0 0-10 0Z" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
            <path d="M11 17v.01" />
            <path d="M7 14v.01" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">AI Assistant Coming Soon</h3>
        <p class="text-[13px] text-white/50 max-w-sm leading-relaxed">
          Our advanced AI prompting engine is currently being tuned for optimal performance. Check back soon for
          intelligent script-to-video capabilities.
        </p>
      </div>
    </div>
  </el-dialog>
</template>
