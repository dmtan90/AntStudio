<script setup lang="ts">
import { ref } from 'vue';
import { generateSocialMeta } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Share, Loading, Copy, CheckOne, Tag, MessageOne } from '@icon-park/vue-next';

interface SocialMeta {
  headlines: string[];
  descriptions: string[];
  tags: string[];
  ctas: string[];
}

const loading = ref(false);
const meta = ref<SocialMeta | null>(null);
const contentSummary = ref("");

const onGenerateMeta = async () => {
  if (!contentSummary.value) {
    toast.error("Please describe your video content first");
    return;
  }
  loading.value = true;
  try {
    const result = await generateSocialMeta({ text: contentSummary.value });
    meta.value = result as any;
    toast.success("Generated social media kit!");
  } catch (err: any) {
    console.error(err);
    toast.error("Failed to generate metadata");
  } finally {
    loading.value = false;
  }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard!");
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 relative overflow-hidden group">
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
      <div class="flex items-center gap-3 mb-3">
        <Share :size="18" class="text-indigo-400" />
        <span class="text-xs font-black text-white uppercase tracking-[0.2em]">Social Media Kit</span>
      </div>
      <p class="text-[11px] text-white/50 leading-relaxed italic pr-4">
        AI will draft viral headlines, descriptions, and tags for your social media posts.
      </p>
    </div>

    <div v-if="meta" class="flex flex-col gap-6">
      <!-- Headlines -->
      <div class="flex flex-col gap-3">
        <label class="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 px-1">
          <MessageOne :size="10" /> Headlines
        </label>
        <div v-for="(h, idx) in meta.headlines" :key="idx" 
             class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center group/item">
          <span class="text-[10px] text-white/80 pr-4">{{ h }}</span>
          <button @click="copyToClipboard(h)" class="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all">
            <Copy :size="12" />
          </button>
        </div>
      </div>

      <!-- Tags -->
      <div class="flex flex-col gap-3">
        <label class="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 px-1">
          <Tag :size="10" /> Hashtags
        </label>
        <div class="flex flex-wrap gap-2 p-2">
          <span v-for="tag in meta.tags" :key="tag" 
                class="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] text-indigo-300 font-bold hover:bg-indigo-500/20 cursor-pointer transition-colors"
                @click="copyToClipboard(tag)">
            #{{ tag }}
          </span>
        </div>
      </div>

      <el-button @click="meta = null" class="cinematic-button !h-10 !text-[9px] !bg-white/5 !border-white/10 !text-white/40 hover:!text-white">
        Reset
      </el-button>
    </div>

    <div v-else class="flex flex-col gap-4">
      <el-input
          v-model="contentSummary"
          type="textarea"
          placeholder="Describe your video for the meta generator..."
          :rows="4"
          class="cinematic-textarea"
      />
      <el-button 
        type="primary" 
        class="cinematic-button is-primary !h-14 !rounded-2xl !border-none w-full shadow-xl shadow-indigo-500/20 group overflow-hidden" 
        :loading="loading"
        @click="onGenerateMeta"
      >
        <template #icon><Share :size="16" /></template>
        <span class="text-xs font-black uppercase tracking-[0.2em]">Generate Social Kit</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-textarea .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-indigo-500/30 py-4 shadow-inner transition-all duration-300;
}
</style>
