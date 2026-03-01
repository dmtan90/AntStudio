<template>
  <div class="viral-hub p-6 animate-in min-h-screen">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <div>
        <h1 class="text-4xl font-black text-white tracking-tighter uppercase mb-2">
          {{ t('viral.header.viral') }} <span class="text-blue-500">{{ t('viral.header.syndication') }}</span> {{ t('viral.header.hub') }}
        </h1>
        <p class="text-gray-400 font-medium">{{ t('viral.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-4">
        <button 
          class="glass-btn h-12 px-6 flex items-center gap-2 group border-blue-500/20 text-blue-400"
          @click="syncEngagement"
          :disabled="loading"
        >
          <chart-line :class="{ 'animate-pulse': loading }" theme="outline" size="18" />
          <span class="text-xs font-bold uppercase tracking-widest">{{ t('viral.sync') }}</span>
        </button>
        <button 
          class="glass-btn h-12 px-6 flex items-center gap-2 group"
          @click="fetchRecords"
          :disabled="loading"
        >
          <refresh :class="{ 'animate-spin': loading }" theme="outline" size="18" />
          <span class="text-xs font-bold uppercase tracking-widest">{{ t('viral.refresh') }}</span>
        </button>
      </div>
    </header>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div v-for="stat in statsCards" :key="stat.label" class="stat-card glass-panel p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <component :is="stat.icon" size="64" />
        </div>
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{{ t('viral.stats.' + stat.key) }}</p>
        <div class="text-3xl font-black text-white mb-1">{{ stat.value }}</div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            {{ stat.trend }}
          </span>
          <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{{ t('viral.stats.vsLastWeek') }}</span>
        </div>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="flex items-center gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
      <button 
        class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
        :class="activeView === 'overview' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'"
        @click="activeView = 'overview'"
      >
        {{ t('viral.views.overview') }}
      </button>
      <button 
        class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
        :class="activeView === 'analytics' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'"
        @click="activeView = 'analytics'"
      >
        {{ t('viral.views.analytics') }}
      </button>
      <button 
        class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
        :class="activeView === 'calendar' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'"
        @click="activeView = 'calendar'"
      >
        {{ t('viral.views.calendar') }}
      </button>
      <button 
        class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
        :class="activeView === 'ab_lab' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'"
        @click="activeView = 'ab_lab'"
      >
        {{ t('viral.views.abLab') }}
      </button>
    </div>

    <!-- Analytics View -->
    <PerformanceCharts v-if="activeView === 'analytics'" :stats="syndicationStats" />

    <!-- Calendar View -->
    <SyndicationCalendar v-if="activeView === 'calendar'" :records="records" @select-record="handleSelectRecord" />

    <!-- A/B Lab View -->
    <HookPerformance v-if="activeView === 'ab_lab'" :stats="hookStats" :loading="loadingHookStats" @promote="handlePromoteHook" />

    <!-- Content Area (Overview) -->
    <div v-show="activeView === 'overview'" class="glass-panel overflow-hidden">
      <div class="p-6 border-b border-white/5 flex items-center justify-between">
        <h2 class="text-sm font-black uppercase tracking-widest text-gray-400">{{ t('viral.history.title') }}</h2>
        <div class="flex items-center gap-2">
          <div class="filter-chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">{{ t('viral.history.filters.all') }}</div>
          <div class="filter-chip" :class="{ active: activeFilter === 'success' }" @click="activeFilter = 'success'">{{ t('viral.history.filters.success') }}</div>
          <div class="filter-chip" :class="{ active: activeFilter === 'failed' }" @click="activeFilter = 'failed'">{{ t('viral.history.filters.failed') }}</div>
        </div>
      </div>

      <!-- Table Logic -->
      <div v-if="loading && !records.length" class="p-20 text-center">
        <div class="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500 text-sm font-bold uppercase tracking-widest">{{ t('viral.history.syncing') }}</p>
      </div>

      <div v-else-if="!records.length" class="p-32 text-center">
        <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <share-two theme="outline" size="32" class="text-gray-600" />
        </div>
        <h3 class="text-xl font-bold text-white mb-2">{{ t('viral.history.empty.title') }}</h3>
        <p class="text-gray-500 max-w-sm mx-auto mb-8">{{ t('viral.history.empty.desc') }}</p>
        <router-link to="/projects" class="primary-btn h-12 px-8 inline-flex items-center">{{ t('viral.history.empty.start') }}</router-link>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-white/[0.02]">
              <th class="px-6 py-4 cursor-pointer hover:text-white transition-colors" @click="handleSort('content')">{{ t('viral.history.columns.content') }}</th>
              <th class="px-6 py-4">{{ t('viral.history.columns.channel') }}</th>
              <th class="px-6 py-4 font-black">{{ t('viral.history.columns.status') }}</th>
              <th class="px-6 py-4 cursor-pointer hover:text-white transition-colors" @click="handleSort('views')">
                {{ t('viral.history.columns.performance') }}
                <span v-if="sortBy === 'views'" class="ml-1">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
              </th>
              <th class="px-6 py-4 cursor-pointer hover:text-white transition-colors" @click="handleSort('date')">
                {{ t('viral.history.columns.date') }}
                <span v-if="sortBy === 'date'" class="ml-1">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
              </th>
              <th class="px-6 py-4">{{ t('viral.history.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="record in sortedRecords" :key="record._id" class="hover:bg-white/[0.02] transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-9 rounded bg-black relative overflow-hidden flex-shrink-0">
                    <img v-if="record.metadata.thumbnail" :src="getFileUrl(record.metadata.thumbnail)" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center bg-white/5">
                      <play theme="outline" size="16" class="text-gray-600" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-bold text-white truncate max-w-[200px]">{{ record.metadata.title }}</div>
                    <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{{ record.projectId?.title || t('common.unknownProject') }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center" :class="getPlatformBg(record.platform)">
                    <component :is="getPlatformIcon(record.platform)" theme="filled" size="12" class="text-white" />
                  </div>
                  <span class="text-xs font-bold text-gray-400 capitalize">{{ record.platform }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :class="getStatusColor(record.status)"></div>
                  <span class="text-[10px] font-black uppercase tracking-widest" :class="getStatusText(record.status)">
                    {{ t('viral.status.' + record.status) }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-4 text-xs font-bold text-gray-400">
                  <div class="flex items-center gap-1">
                    <preview-open size="12" class="opacity-30" />
                    {{ record.engagement.views }}
                  </div>
                  <div class="flex items-center gap-1">
                    <like size="12" class="opacity-30" />
                    {{ record.engagement.likes }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-bold text-gray-500 whitespace-nowrap">
                  {{ formatDate(record.publishedAt || record.scheduledAt || record.createdAt) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    class="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 hover:text-purple-400 transition-all"
                    :title="t('viral.history.actions.manageComments')"
                    @click="openComments(record)"
                  >
                    <communication theme="outline" size="14" />
                  </button>
                  <a 
                    v-if="record.externalUrl" 
                    :href="record.externalUrl" 
                    target="_blank" 
                    class="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                    :title="t('viral.history.actions.viewExternal')"
                  >
                    <external-transmission theme="outline" size="14" />
                  </a>
                  <button 
                    v-if="record.status === 'failed'"
                    class="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    :title="t('viral.history.actions.retry')"
                    @click="handleRetry(record._id)"
                    :disabled="loading"
                  >
                    <refresh theme="outline" size="14" :class="{ 'animate-spin': loading }" />
                  </button>
                  <button 
                    v-if="record.status === 'scheduled'"
                    class="p-2 rounded-lg bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 transition-all"
                    :title="t('viral.history.actions.cancelSchedule')"
                    @click="store.cancelScheduledSyndication(record._id)"
                  >
                    <close theme="outline" size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Comment Management Drawer -->
    <CommentDrawer 
      :record-id="activeCommentRecordId" 
      :video-title="activeCommentVideoTitle"
      @close="activeCommentRecordId = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Refresh, ShareTwo, Tiktok, Youtube, Facebook, 
  Play, PreviewOpen, Like, ExternalTransmission,
  ChartLine, CheckCorrect, TrendingUp, Communication,
  Left, Right, Close
} from '@icon-park/vue-next';
import { usePlatformStore } from '@/stores/platform';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import PerformanceCharts from '@/components/studio/analytics/PerformanceCharts.vue';
import CommentDrawer from '@/components/studio/drawers/CommentDrawer.vue';
import SyndicationCalendar from '@/components/studio/analytics/SyndicationCalendar.vue';
import HookPerformance from '@/components/studio/analytics/HookPerformance.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const store = usePlatformStore();
const loading = computed(() => store.syndicationLoading);
const records = computed(() => store.syndicationRecords);
const total = computed(() => store.syndicationTotal);
const syndicationStats = computed(() => store.syndicationStats);

const activeFilter = ref('all');
const activeView = ref('overview'); // overview, analytics, calendar, ab_lab
const sortBy = ref('date');
const sortOrder = ref('desc');

const activeCommentRecordId = ref<string | null>(null);
const activeCommentVideoTitle = ref('');

const hookStats = ref<any[]>([]);
const loadingHookStats = ref(false);

const openComments = (record: any) => {
    activeCommentRecordId.value = record._id;
    activeCommentVideoTitle.value = record.metadata.title;
};

const handlePromoteHook = (type: string) => {
    toast.success(t('viral.toasts.hookPromoted', { type }));
};

const handleSelectRecord = (record: any) => {
    if (record.status === 'scheduled') {
        // Option to cancel or reschedule? For now just show info or open comments if success
        toast.info(t('viral.toasts.scheduled', { date: formatDate(record.scheduledAt) }));
    } else {
        openComments(record);
    }
};

const fetchRecords = async () => {
    await store.fetchSyndicationRecords();
    if (activeView.value === 'ab_lab') {
        fetchHookInsights();
    }
};

const fetchHookInsights = async () => {
    loadingHookStats.value = true;
    try {
        // Get all unique project IDs from records to aggregate? 
        // Or just show for the last project. 
        // Better: SocialSyndicationService currently needs a projectId.
        // Let's use the first record's projectId if available.
        if (records.value.length > 0) {
            const pid = records.value[0].projectId?._id || records.value[0].projectId;
            if (pid) {
                hookStats.value = await store.fetchHookStats(pid);
            }
        }
    } finally {
        loadingHookStats.value = false;
    }
};

watch(activeView, (newView) => {
    if (newView === 'ab_lab') {
        fetchHookInsights();
    }
});

const syncEngagement = async () => {
    await store.syncSyndicationMetrics();
};

const handleRetry = async (id: string) => {
    await store.retrySyndication(id);
};

const handleSort = (field: string) => {
    if (sortBy.value === field) {
        sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
    } else {
        sortBy.value = field;
        sortOrder.value = 'desc';
    }
};

const statsCards = computed(() => [
    { key: 'totalReach', label: 'Total Reach', value: formatLargeNumber(syndicationStats.value.totalViews), trend: syndicationStats.value.trends?.views || '0%', icon: TrendingUp },
    { key: 'engagement', label: 'Engagement', value: formatLargeNumber(syndicationStats.value.totalLikes), trend: syndicationStats.value.trends?.likes || '0%', icon: CheckCorrect },
    { key: 'shares', label: 'Platform Shares', value: formatLargeNumber(syndicationStats.value.totalShares), trend: '+0%', icon: ShareTwo },
    { key: 'stability', label: 'Viral Stability', value: calculateStability(), trend: '+0.4%', icon: ChartLine }
]);

const calculateStability = () => {
    if (total.value === 0) return '100%';
    const successCount = records.value.filter(r => r.status === 'success').length;
    return ((successCount / total.value) * 100).toFixed(1) + '%';
};

const filteredRecords = computed(() => {
    if (activeFilter.value === 'all') return records.value;
    return records.value.filter(r => r.status === activeFilter.value);
});

const sortedRecords = computed(() => {
    const list = [...filteredRecords.value];
    list.sort((a, b) => {
        let valA, valB;
        if (sortBy.value === 'date') {
            valA = new Date(a.publishedAt || a.createdAt).getTime();
            valB = new Date(b.publishedAt || b.createdAt).getTime();
        } else if (sortBy.value === 'views') {
            valA = a.engagement?.views || 0;
            valB = b.engagement?.views || 0;
        } else if (sortBy.value === 'content') {
            valA = a.metadata.title;
            valB = b.metadata.title;
            return sortOrder.value === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        } else {
            return 0;
        }
        return sortOrder.value === 'desc' ? valB - valA : valA - valB;
    });
    return list;
});

const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
        case 'tiktok': return Tiktok;
        case 'youtube': return Youtube;
        case 'facebook': return Facebook;
        default: return ShareTwo;
    }
};

const getPlatformBg = (platform: string) => {
    switch (platform.toLowerCase()) {
        case 'tiktok': return 'bg-black';
        case 'youtube': return 'bg-red-600';
        case 'facebook': return 'bg-blue-600';
        default: return 'bg-gray-700';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'success': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
        case 'failed': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
        case 'pending': return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
        case 'scheduled': return 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
        default: return 'bg-gray-500';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'success': return 'text-green-400';
        case 'failed': return 'text-red-400';
        case 'pending': return 'text-yellow-400';
        case 'scheduled': return 'text-purple-400';
        default: return 'text-gray-400';
    }
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatLargeNumber = (num: number) => {
    return new Intl.NumberFormat(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

onMounted(fetchRecords);
</script>

<style scoped lang="scss">
.viral-hub {
  background-color: #0a0a0a;
  background-image: 
    radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05), transparent 400px),
    radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.05), transparent 400px);
}

.glass-panel {
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: translateY(-4px);
    background: rgba(25, 25, 30, 0.8);
    border-color: rgba(59, 130, 246, 0.2);
  }
}

.filter-chip {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    color: #999;
    background: rgba(255, 255, 255, 0.03);
  }

  &.active {
    color: #fff;
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
  }
}

.primary-btn {
    background: #3b82f6;
    color: white;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.1em;
    border-radius: 12px;
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
    transition: all 0.3s;
    
    &:hover {
        background: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
    }
}

.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    color: #9ca3af;
    border-radius: 12px;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(59, 130, 246, 0.3);
        color: white;
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>
