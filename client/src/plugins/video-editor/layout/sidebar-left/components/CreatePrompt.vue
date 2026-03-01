<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { Plus, Search } from '@icon-park/vue-next';
import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { createAdsFromPrompt as createAdsFromPromptApi } from 'video-editor/api/prompt';
import { PromptSession } from 'video-editor/types/prompt';

const editor = useEditorStore();
const { t } = useI18n();

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
  toast.promise(promise, { loading: t('videoEditor.prompt.generating'), success: t('videoEditor.prompt.generated'), error: t('videoEditor.prompt.generateError') });
};

const tabOptions = computed(() => [
  {
    label: t('videoEditor.prompt.feed'),
    value: 'feed'
  },
  {
    label: t('videoEditor.prompt.story'),
    value: 'story'
  },
  {
    label: t('videoEditor.prompt.banner'),
    value: 'banner'
  },
]);

</script>


<template>
  <section class="sidebar-container pt-6 pb-20 px-5 create-prompt-container">
    <div class="flex flex-col gap-6">
      <div class="space-y-3">
        <Label class="text-[10px] font-bold uppercase tracking-widest text-white/40">{{ t('videoEditor.prompt.selectFormat') }}</Label>
        <el-segmented v-model="format" :options="tabOptions" class="w-full cinematic-segmented" />
      </div>
      <div class="space-y-3">
        <Label class="text-[10px] font-bold uppercase tracking-widest text-white/40">{{ t('videoEditor.prompt.topicInstructions') }}</Label>
        <el-input 
          type="textarea" 
          :rows="6" 
          :placeholder="t('videoEditor.prompt.placeholder')"
          class="cinematic-input !text-xs" 
          :model-value="prompt" 
          @update:model-value="prompt = $event" 
        />
      </div>
    </div>
    
    <div class="mt-10">
      <button 
        class="w-full h-10 rounded-xl bg-gradient-to-r from-brand-primary to-purple-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
        @click="handleCreateVideo"
      >
        <Plus :size="14" :stroke-width="4" />
        {{ t('videoEditor.prompt.generateScene') }}
      </button>
      
      <p class="text-[9px] font-bold uppercase tracking-wider text-white/20 text-center mt-4 px-4 leading-relaxed">
        {{ t('videoEditor.prompt.footerNote') }}
      </p>
    </div>
  </section>
</template>

<style>
.cinematic-segmented.el-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.03);
  --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.05);
  --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.1);
  --el-segmented-item-selected-color: #fff;
  --el-border-radius-base: 12px;
  background-color: var(--el-segmented-bg-color);
  padding: 4px;
  border: 1px border rgba(255, 255, 255, 0.05);
}

.cinematic-segmented .el-segmented__item {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
}

.cinematic-segmented .el-segmented__item.is-selected {
  color: #fff;
}
</style>
