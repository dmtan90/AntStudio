<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search } from '@icon-park/vue-next';
import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { createAdsFromPrompt as createAdsFromPromptApi } from 'video-editor/api/prompt';
import { PromptSession } from 'video-editor/types/prompt';

const editor = useEditorStore();

const format = ref("banner");
const prompt = ref("Generate an ad for Nike Running Shoes");

const createAdsFromPrompt = useMutation({
  mutationFn: async ({ prompt, format }: { prompt: string; format: string }) => {
    const result = await createAdsFromPromptApi(prompt, format);
    await editor.prompter.createSceneFromPromptSession(result);
  },
});

const handleCreateVideo = () => {
  const promise = createAdsFromPrompt.mutateAsync({ prompt: prompt.value, format: format.value });
  toast.promise(promise, { loading: "Generating your video ads...", success: "Your video ads is generated", error: "Ran into an error while generating your ads" });
};

const tabOptions = [
  {
    label: 'Feed',
    value: 'feed'
  },
  {
    label: 'Story',
    value: 'story'
  },
  {
    label: 'Banner',
    value: 'banner'
  },
];

</script>


<template>
  <section class="sidebar-container py-4 px-3.5 create-prompt-container">
    <div class="flex flex-col gap-4">
      <div class="space-y-1.5">
        <Label class="text-xs text-foreground/75">Which format do you want?</Label>
        <el-segmented v-model="format" :options="tabOptions" class="w-full" />
        <!--<el-tabs v-model="format" type="card" stretch>
          <el-tab-pane label="Feed" name="feed" />
          <el-tab-pane label="Story" name="story" />
          <el-tab-pane label="Banner" name="banner" />
        </el-tabs>-->
      </div>
      <div class="space-y-1.5">
        <Label class="text-xs text-foreground/75">Provide topic with detailed instructions</Label>
        <el-input type="textarea" :rows="5" class="text-xs min-h-20 h-24 max-h-40" :model-value="prompt" @update:model-value="prompt = $event" />
      </div>
    </div>
    <el-button type="primary" class="w-full mt-10" @click="handleCreateVideo">
      Generate
    </el-button>
  </section>
</template>

<style>
.create-prompt-container {
  .el-segmented {
    /*--el-segmented-item-selected-color: var(--el-color-primary) !important;
    --el-segmented-item-selected-bg-color: var(--el-fill-color-light) !important;*/
    --el-border-radius-base: 16px !important;
    .el-segmented__item {
      padding: 1px !important;
    }
  }
}
</style>
