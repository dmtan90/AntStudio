<template>
  <el-drawer
    v-model="visible"
    :title="$t('drawers.comments.title')"
    direction="rtl"
    size="500px"
    class="comment-drawer"
    :before-close="handleClose"
  >
    <template #header>
      <div class="flex items-center justify-between w-full pr-8">
        <div>
          <h2 class="text-lg font-black text-white tracking-tight uppercase">{{ $t('drawers.comments.platformEngagement') }}</h2>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{{ $t('drawers.comments.moderation') }}</p>
        </div>
      </div>
    </template>

    <div v-if="loading" class="p-20 text-center">
      <div class="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{{ $t('drawers.comments.analyzing') }}</p>
    </div>

    <div v-else-if="!comments.length" class="p-20 text-center">
      <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
        <communication theme="outline" size="32" class="text-gray-700" />
      </div>
      <h3 class="text-lg font-bold text-white mb-2">{{ $t('drawers.comments.noComments') }}</h3>
      <p class="text-gray-500 text-sm">{{ $t('drawers.comments.waiting') }}</p>
    </div>

    <div v-else class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto px-6 space-y-6 pb-20">
        <div v-for="comment in comments" :key="comment.id" class="comment-item group">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-full bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
              <img v-if="comment.avatar" :src="comment.avatar" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600">
                {{ comment.author?.[0] || '?' }}
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-black text-white truncate max-w-[150px]">{{ comment.author }}</span>
                <span :class="getSentimentBadge(comment.sentiment)" class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border">
                  {{ comment.sentiment }}
                </span>
              </div>
              
              <p class="text-xs text-gray-400 leading-relaxed mb-3">{{ comment.text }}</p>
              
                <div class="flex items-center gap-4 mb-3">
                  <div class="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/5">
                    <button 
                      v-for="tone in ['friendly', 'witty', 'professional']" 
                      :key="tone"
                      @click="selectedTones[comment.id] = tone"
                      class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all"
                      :class="(selectedTones[comment.id] || 'friendly') === tone ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'"
                    >
                      {{ $t(`drawers.comments.tones.${tone}`) }}
                    </button>
                  </div>
                  <button 
                    class="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1 ml-auto"
                    @click="suggestReply(comment)"
                    :disabled="generating === comment.id"
                  >
                    <magic theme="outline" size="12" :class="{ 'animate-pulse': generating === comment.id }" />
                    {{ $t('drawers.comments.aiSuggest') }}
                  </button>
                  <button 
                    class="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 flex items-center gap-1"
                    @click="activeReplyId = activeReplyId === comment.id ? null : comment.id"
                  >
                    <corner-down-left theme="outline" size="12" />
                    {{ $t('drawers.comments.reply') }}
                  </button>
                </div>
                
                <div class="flex items-center gap-1 text-[9px] text-gray-700 font-bold uppercase mb-3">
                  <like theme="outline" size="10" />
                  {{ comment.likes }}
                </div>

              <!-- Reply Input Area -->
              <div v-if="activeReplyId === comment.id || suggestedReplies[comment.id]" class="mt-4 animate-in slide-in-from-top-2">
                <div class="relative">
                  <textarea 
                    v-model="replyTexts[comment.id]"
                    class="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-gray-700 focus:border-blue-500/50 outline-none transition-all resize-none h-20"
                    :placeholder="$t('drawers.comments.replyPlaceholder')"
                  ></textarea>
                  <div class="absolute bottom-2 right-2 flex items-center gap-2">
                    <button 
                      class="h-8 px-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-blue-500 transition-all disabled:opacity-50"
                      @click="postReply(comment)"
                      :disabled="!replyTexts[comment.id] || replying === comment.id"
                    >
                      {{ replying === comment.id ? $t('drawers.comments.sending') : $t('drawers.comments.postReply') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlatformStore } from '@/stores/platform';
import { Communication, Magic, CornerDownLeft, Like } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  recordId: string | null;
  videoTitle?: string;
}>();

const emit = defineEmits(['close']);

const visible = ref(false);
const loading = ref(false);
const comments = ref<any[]>([]);
const store = usePlatformStore();

const activeReplyId = ref<string | null>(null);
const replyTexts = ref<Record<string, string>>({});
const selectedTones = ref<Record<string, string>>({});
const generating = ref<string | null>(null);
const replying = ref<string | null>(null);
const suggestedReplies = ref<Record<string, boolean>>({});

watch(() => props.recordId, (newId) => {
  if (newId) {
    visible.value = true;
    fetchComments(newId);
  } else {
    visible.value = false;
  }
}, { immediate: true });

const fetchComments = async (id: string) => {
  loading.value = true;
  comments.value = [];
  try {
    const data = await store.fetchSyndicationComments(id);
    if (data) {
      comments.value = data;
    }
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  visible.value = false;
  emit('close');
};

const getSentimentBadge = (sentiment: string) => {
  switch (sentiment) {
    case 'POSITIVE': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'NEGATIVE': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const suggestReply = async (comment: any) => {
  generating.value = comment.id;
  try {
    const tone = selectedTones.value[comment.id] || 'friendly';
    const context = `${props.videoTitle ? t('drawers.comments.aiContext.videoTitle', { title: props.videoTitle }) : ''} ${t('drawers.comments.aiContext.tone', { tone: tone })}.`;
    const suggestion = await store.getAiReplySuggestion(comment.text, context);
    if (suggestion) {
      replyTexts.value[comment.id] = suggestion;
      suggestedReplies.value[comment.id] = true;
      activeReplyId.value = comment.id;
    }
  } finally {
    generating.value = null;
  }
};

const postReply = async (comment: any) => {
  if (!props.recordId) return;
  replying.value = comment.id;
  try {
    const success = await store.replyToSyndicationComment(props.recordId, replyTexts.value[comment.id], comment.id);
    if (success) {
      replyTexts.value[comment.id] = '';
      activeReplyId.value = null;
      suggestedReplies.value[comment.id] = false;
      // Refresh comments to show the reply if the platform supports it in the list
      await fetchComments(props.recordId);
    }
  } finally {
    replying.value = null;
  }
};
</script>

<style lang="scss">
.comment-drawer {
  background: rgba(10, 10, 15, 0.95) !important;
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.05);

  .el-drawer__header {
    margin-bottom: 20px;
    padding: 32px 32px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .el-drawer__body {
    padding: 0;
    background: transparent;
  }
}

.comment-item {
  transition: all 0.2s;
  &:hover {
    transform: translateX(4px);
  }
}

textarea::placeholder {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
