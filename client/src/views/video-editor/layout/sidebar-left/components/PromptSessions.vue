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
  <section class="sidebar-container py-4 px-3.5">
    <el-input placeholder="Search..." class="text-xs" >
      <template #prefix>
        <Search :size="15" class="text-foreground/60" />
      </template>
    </el-input>
    <div class="my-3.5">
      <el-button size="small" class="gap-1 pl-2 w-full" @click="emit('create-session')">
        <Plus :size="15" />
        <span>Create Prompt</span>
      </el-button>
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-4">
        <h4 class="text-xs font-semibold line-clamp-1">Sessions</h4>
        <el-button size="small" type="text" class="text-primary h-6 font-medium line-clamp-1 px-1.5">
          See All
        </el-button>
      </div>
      <div class="flex flex-col">
        <el-button v-for="session in editor.prompter.sessions.values()" :key="session.id" size="small" type="info" class="w-full h-auto py-2.5 px-4 gap-0.5 flex flex-col items-start" @click="handleLoadPromptSession(session)">
          <span class="line-clamp-1">
            <span class="font-semibold">Prompt: </span>
            <span>{{ session.prompt }}</span>
          </span>
          <span class="line-clamp-1">
            <span class="font-semibold">Duration: </span>
            <span>{{ session.duration }}s</span>
          </span>
          <span class="line-clamp-1">
            <span class="font-semibold">Format: </span>
            <span class="capitalize">{{ session.format }}</span>
          </span>
        </el-button>
      </div>
    </div>
  </section>
</template>
