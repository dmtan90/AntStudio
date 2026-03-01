<template>
    <div class="analytics-dashboard h-full flex flex-col bg-gray-900 text-white font-sans p-4 space-y-4 overflow-y-auto custom-scrollbar">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <analysis theme="filled" size="24" class="text-blue-400" />
                <h2 class="text-xl font-black uppercase tracking-wider">{{ $t('studio.analytics.liveAnalyticsTitle') || 'Live Analytics' }}</h2>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-xs font-bold text-green-400">{{ $t('common.connect') || 'CONNECT' }}</span>
            </div>
        </div>

        <!-- Top Metrics Grid -->
        <div class="grid grid-cols-2 gap-3">
            <!-- CCU -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col shadow-lg">
                <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{{ $t('studio.analytics.audience') || 'Audience' }}</span>
                <div class="flex items-end justify-between">
                    <span class="text-2xl font-black text-white leading-none">{{ metrics.ccu }}</span>
                    <peoples theme="filled" size="16" class="text-blue-400 mb-1" />
                </div>
            </div>

            <!-- Credits -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col shadow-lg">
                 <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{{ $t('studio.analytics.economy') || 'Economy' }}</span>
                 <div class="flex items-end justify-between">
                     <span class="text-2xl font-black text-yellow-400 leading-none">{{ formatNumber(metrics.creditsSpent) }}</span>
                     <currency theme="filled" size="16" class="text-yellow-600 mb-1" />
                 </div>
            </div>

            <!-- Chat Velocity -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col shadow-lg">
                 <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{{ $t('studio.analytics.chatVel') || 'Chat Vel' }}</span>
                 <div class="flex items-end justify-between">
                     <span class="text-2xl font-black text-white leading-none">{{ metrics.messagesPerMinute }}</span>
                     <span class="text-[10px] font-bold text-white/30 mb-1">msg/m</span>
                 </div>
            </div>
            
            <!-- Vibe Score -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col shadow-lg relative overflow-hidden">
                 <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{{ $t('studio.rail.vibe') || 'Vibe' }}</span>
                 <div class="flex items-end justify-between relative z-10">
                     <span class="text-2xl font-black leading-none" :class="getSentimentColor(metrics.avgSentiment)">{{ metrics.avgSentiment }}</span>
                     <heart theme="filled" size="16" :class="getSentimentColor(metrics.avgSentiment) + ' mb-1'" />
                 </div>
                 <!-- Mini Bar BG -->
                 <div class="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                     <div class="h-full transition-all duration-500" :class="getSentimentBg(metrics.avgSentiment)" :style="{ width: metrics.avgSentiment + '%' }"></div>
                 </div>
            </div>
        </div>

        <!-- Hype Meter (Gauge) -->
        <div class="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center relative overflow-hidden">
             <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 z-10">{{ $t('studio.analytics.hypeMeter') || 'Hype Meter' }}</span>
             
             <!-- Circular Gauge (CSS) -->
             <div class="relative w-32 h-16 overflow-hidden z-10">
                 <div class="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-white/10 box-border"></div>
                 <div class="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-transparent border-t-purple-500 border-r-purple-500 box-border transition-transform duration-1000 ease-out"
                      :style="{ transform: `rotate(${ -45 + (metrics.messagesPerMinute / 100 * 180) }deg)` }"></div>
             </div>
             <div class="absolute bottom-4 text-2xl font-black text-white z-10">{{ Math.min(100, metrics.messagesPerMinute) }}%</div>

             <!-- Background Pulse -->
             <div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full scale-0 animate-pulse" :class="{ 'scale-150': metrics.messagesPerMinute > 50 }"></div>
        </div>

        <!-- Recent Events Log -->
        <div class="flex-1 bg-black/20 rounded-xl border border-white/5 p-3 overflow-hidden flex flex-col">
             <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{{ $t('studio.analytics.liveFeed') || 'Live Feed' }}</span>
             <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                 <transition-group name="list">
                     <div v-for="event in recentEvents" :key="event.id" class="flex gap-2 items-start text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                         <div class="mt-0.5">
                             <component :is="getEventIcon(event.type)" theme="filled" size="12" :class="getEventColor(event.type)" />
                         </div>
                         <div class="flex-1">
                             <div class="font-bold text-white/90 leading-tight">{{ event.description }}</div>
                             <div class="text-[9px] text-white/40 font-mono mt-0.5">{{ formatTime(event.timestamp) }}</div>
                         </div>
                         <div v-if="event.value" class="font-bold font-mono" :class="getEventColor(event.type)">
                            {{ event.type === 'purchase' ? '+' : '' }}{{ event.value }}
                         </div>
                     </div>
                 </transition-group>
             </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { Analysis, Peoples, Currency, Heart, Lightning, ShoppingBag, Trophy, User } from '@icon-park/vue-next';

interface Metrics {
    ccu: number;
    messagesPerMinute: number;
    creditsSpent: number;
    avgSentiment: number;
}

interface AnalyticsEvent {
    id: string;
    timestamp: number;
    type: string;
    description: string;
    value?: number;
}

const metrics = ref<Metrics>({
    ccu: 0,
    messagesPerMinute: 0,
    creditsSpent: 0,
    avgSentiment: 50
});

const recentEvents = ref<AnalyticsEvent[]>([]);

const handleUpdate = (event: Event) => {
    const data = (event as CustomEvent).detail;
    metrics.value = data.metrics;
    
    // Merge events distinct
    // The server sends the last 5 events list. We should just replace or smarter merge?
    // Replacing is easier for sync.
    recentEvents.value = data.recentEvents;
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getSentimentColor = (score: number) => {
    if (score > 60) return 'text-green-400';
    if (score < 40) return 'text-red-400';
    return 'text-white';
};

const getSentimentBg = (score: number) => {
    if (score > 60) return 'bg-green-500';
    if (score < 40) return 'bg-red-500';
    return 'bg-gray-500';
};

const getEventIcon = (type: string) => {
    switch(type) {
        case 'purchase': return ShoppingBag;
        case 'levelup': return Trophy;
        case 'subscription': return User;
        case 'raid': return Lightning;
        default: return Analysis;
    }
}

const getEventColor = (type: string) => {
    switch(type) {
        case 'purchase': return 'text-yellow-400';
        case 'levelup': return 'text-purple-400';
        case 'subscription': return 'text-blue-400';
        case 'raid': return 'text-red-400';
        default: return 'text-gray-400';
    }
}

onMounted(() => {
    window.addEventListener('analytics:update', handleUpdate);
    // Request initial state? Or wait for push.
    // Ideally request, but socket pushes every 5s anyway. The store might not have it yet unless we persist.
});

onUnmounted(() => {
    window.removeEventListener('analytics:update', handleUpdate);
});
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
