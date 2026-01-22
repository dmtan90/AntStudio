<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search } from '@icon-park/vue-next';
import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { PromptSession } from 'video-editor/types/prompt';

const emit = defineEmits(['create-session']);

const editor = useEditorStore();

const handleLoadPromptSession = async (session: PromptSession) => {
  const promise = editor.prompter.createSceneFromPromptSession(session);
  toast.promise(promise, { loading: "Loading your session...", success: "Your session has been loaded", error: "Ran into an error while loading your session" });
};

</script>

<template>
  <section class="sidebar-container pt-4 pb-10 px-5">
    <div class="mb-6">
      <el-input placeholder="Search sessions..." class="cinematic-input" >
        <template #prefix>
          <Search :size="15" class="text-white/40" />
        </template>
      </el-input>
    </div>

    <div class="mb-8">
      <button 
        class="w-full h-9 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-primary hover:bg-brand-primary/20 transition-all duration-300 shadow-sm" 
        @click="emit('create-session')"
      >
        <Plus :size="12" :stroke-width="4" />
        <span>New Prompt Session</span>
      </button>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Recent Sessions</h4>
        <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors">
          See All
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <button 
          v-for="session in editor.prompter.sessions.values()" 
          :key="session.id" 
          class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 flex flex-col items-start gap-2 text-left shadow-sm hover:shadow-xl hover:shadow-purple-500/5 text-xs" 
          @click="handleLoadPromptSession(session)"
        >
          <div class="w-full flex justify-between items-start gap-3">
            <span class="font-bold text-white/90 line-clamp-2 leading-relaxed uppercase tracking-wide flex-1 text-[11px]">{{ session.prompt }}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest shrink-0">{{ session.format }}</span>
          </div>
          
          <div class="flex items-center gap-4 mt-1">
             <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest">Duration</span>
                <span class="text-[10px] font-bold text-white/60 tracking-wider font-mono">{{ session.duration }}s</span>
             </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>
