<template>
  <div class="moderation-log p-6 animate-in">
    <header class="page-header mb-10 flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-black text-white tracking-tight mb-2">{{ t('admin.moderation.title') }}</h1>
        <p class="text-gray-400">{{ t('admin.moderation.subtitle') }}</p>
      </div>
      <div class="stats flex gap-8">
         <div class="stat text-right">
            <p class="text-[8px] font-black opacity-30 uppercase">{{ t('admin.moderation.stats.flaggedToday') }}</p>
            <p class="text-2xl font-black text-orange-500">12</p>
         </div>
         <div class="stat text-right">
            <p class="text-[8px] font-black opacity-30 uppercase">{{ t('admin.moderation.stats.blocked') }}</p>
            <p class="text-2xl font-black text-red-500">4</p>
         </div>
      </div>
    </header>

    <div class="filters-bar flex gap-4 mb-8">
       <el-select v-model="filterStatus" :placeholder="t('admin.moderation.filters.status')" size="small" class="glass-input w-40">
          <el-option :label="t('admin.moderation.filters.all')" value="" />
          <el-option :label="t('admin.moderation.filters.flagged')" value="flagged" />
          <el-option :label="t('admin.moderation.filters.blocked')" value="blocked" />
          <el-option :label="t('admin.moderation.filters.approved')" value="approved" />
       </el-select>
       <el-input v-model="searchQuery" :placeholder="t('admin.moderation.filters.searchPlaceholder')" size="small" class="glass-input flex-1" />
    </div>

    <div class="audit-list space-y-4">
       <div v-if="loading" class="p-20 text-center opacity-30">{{ t('admin.moderation.loading') }}</div>
       
       <div v-for="log in audits" :key="log.id" class="audit-card glass-card p-6 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
          <div class="flex justify-between items-start mb-6">
             <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-400">
                   <text-message v-if="log.type === 'text'" />
                   <video-file v-else />
                </div>
                <div>
                   <p class="text-xs font-black uppercase tracking-widest opacity-40">{{ t('admin.moderation.card.violation', { type: log.type }) }}</p>
                   <p class="text-[10px] font-bold">{{ log.user.name }}</p>
                   <div class="flex items-center gap-2">
                       <span class="text-[10px] font-bold text-brand-primary font-mono">{{ ((log as any).scores.toxicity || (log as any).scores.nsfw || 0).toFixed(2) }}</span>
                       <span class="text-[8px] opacity-30">{{ t('admin.moderation.card.risk') }}</span>
                   </div>
                   <p class="text-[10px] font-bold"> ({{ (log as any).tenant?.name || t('common.unknown') }})</p>
                </div>
             </div>
             <div class="flex items-center gap-3">
                <div class="score-pill px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase">
                   {{ t('admin.moderation.card.vulnerability', { score: ((log as any).scores.toxicity || (log as any).scores.nsfw || 0).toFixed(2) }) }}
                </div>
                <span class="status-badge" :class="log.status">{{ log.status }}</span>
             </div>
          </div>

          <div class="content-preview bg-black/40 p-4 rounded-xl border border-white/5 mb-6">
             <p class="text-xs text-gray-300 font-mono italic leading-relaxed">"{{ log.content }}"</p>
          </div>

          <div class="card-footer pt-6 border-t border-white/5 flex justify-between items-center">
             <span class="text-[9px] font-black opacity-20 uppercase tracking-widest">{{ log.timestamp }}</span>
             <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="secondary-btn text-[10px] px-4 py-1.5" @click="resolve(log.id, 'blocked')">{{ t('admin.moderation.card.hardBlock') }}</button>
                <button class="primary-btn text-[10px] px-4 py-1.5" @click="resolve(log.id, 'approved')">{{ t('admin.moderation.card.forceApprove') }}</button>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui';
import {
    Audit, Search, Filter, Caution, Check, Close,
    CameraFive, Play, FileText, DeleteOne,
    TextMessage, VideoFile
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n()
const uiStore = useUIStore();
const loading = ref(false);
const filterStatus = ref('');
const searchQuery = ref('');

const audits = ref([
 { id: '1', type: 'text', content: 'Create a video of a heated political riot with explicit violence...', user: { name: 'John Doe' }, tenant: { name: 'Acme News' }, scores: { toxicity: 0.92 }, status: 'blocked', timestamp: '2 mins ago' },
 { id: '2', type: 'video', content: 'https://antstudio.agrhub.com/s3/media/gen_921bc.mp4', user: { name: 'Sarah Key' }, tenant: { name: 'Social Labs' }, scores: { nsfw: 0.78 }, status: 'flagged', timestamp: '1 hour ago' },
 { id: '3', type: 'text', content: 'Promote our competitor BrandX by showing their flaws...', user: { name: 'Mike Ross' }, tenant: { name: 'Dentsu Corp' }, scores: { toxicity: 0.1 }, status: 'flagged', timestamp: '3 hours ago' }
]);

const resolve = (id: string, decision: string) => {
    toast.success(t('admin.moderation.toasts.resolved', { id, decision: decision.toUpperCase() }));
};
</script>

<style lang="scss" scoped>
.status-badge {
    @include status-pill;
    &.flagged { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    &.blocked { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    &.approved { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
}
</style>
