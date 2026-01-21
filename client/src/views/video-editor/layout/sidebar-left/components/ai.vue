<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search, Close as X } from '@icon-park/vue-next';
import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { createAdsFromPrompt as createAdsFromPromptApi } from 'video-editor/api/prompt';
import { PromptSession } from 'video-editor/types/prompt';
import { cn } from 'video-editor/lib/utils';
import ExpandedAiView from './ExpandedAiView.vue';

const editor = useEditorStore();

// const format = ref("banner");
// const prompt = ref("Generate an ad for Nike Running Shoes");

// const createAdsFromPrompt = useMutation({
//   mutationFn: async ({ prompt, format }: { prompt: string; format: string }) => {
//     const result = await createAdsFromPromptApi(prompt, format);
//     await editor.prompter.createSceneFromPromptSession(result);
//   },
// });

// const handleCreateVideo = () => {
//   const promise = createAdsFromPrompt.mutateAsync({ prompt: prompt.value, format: format.value });
//   toast.promise(promise, { loading: "Generating your video ads...", success: "Your video ads is generated", error: "Ran into an error while generating your ads" });
// };

const expanded = ref<false | string>(false);

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Gemini</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <section class="sidebar-container pb-4">
      <div :class="cn('px-3 pt-4 flex flex-col gap-2.5 border-b', expanded ? 'border-b pb-2.5' : 'pb-6 border-b-0')">
        <template v-if="expanded">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <el-button link size="small" class="text-xs h-6 px-2 text-foreground/30 hover:text-foreground/40" @click="expanded = false">
                Tools
              </el-button>
            </el-breadcrumb-item>
            <el-breadcrumb-item>
              <el-button disabled link size="small" class="text-xs h-6 px-2 capitalize disabled:opacity-100">
                {{ expanded }}
              </el-button>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </template>
      </div>
      <div class="px-3 flex flex-col gap-6" v-if="!expanded">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3">
            <button @click="" class="h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-lg font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Voice Generation</span>
            </button>
            <button @click="" class="h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-lg font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Image Generation</span>
            </button>
            <button @click="" class="h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-lg font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Video Generation</span>
            </button>
            <button @click="" class="h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-lg font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Caption Generation</span>
            </button>
          </div>
        </div>
      </div>
      <template v-else>
        <div class="px-3 grid grid-cols-3 gap-2.5 pt-4">
          <ExpandedAiView :match="expanded" />
        </div>
      </template>
    </section>
  </div>
</template>
