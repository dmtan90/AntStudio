<template>
  <div class="neural-dashboard-wrapper">
    <div class="neural-dashboard">
      <div class="glow-status" :class="{ 'active': showrunner.isRunning, 'planning': showrunner.isPlanning }"></div>
      <span class="title">{{ showrunner.isPlanning ? 'NEURAL PLANNING IN PROGRESS' : 'NEURAL SINGULARITY MONITOR' }}</span>
      <div class="pulse-indicator"></div>
    </div>

    <div class="arc-container">
      <div class="arc-label">NARRATIVE ARC: <span class="highlight">{{ showrunner.narrativeArc.toUpperCase() }}</span></div>
      <div class="arc-visual">
         <div v-for="i in 40" :key="i" 
              class="arc-bar" 
              :style="{ 
                height: getArcHeight(i), 
                opacity: i / 40,
                backgroundColor: showrunner.isRunning ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)'
              }">
         </div>
      </div>
    </div>

    <!-- Context-Specific Metrics (Phase 20 Redesign) -->
    <div v-if="contextMetrics" class="context-metrics-section">
      <div class="box-label">{{ contextMetrics.label.toUpperCase() }} MONITOR</div>
      <div class="metrics-grid">
        <div v-for="metric in contextMetrics.items" :key="metric.name" class="metric-card">
          <div class="metric-header">
            <span class="m-name">{{ metric.name }}</span>
            <div class="m-trend" :class="metric.trend">
               <el-icon v-if="metric.trend === 'up'"><CaretTop /></el-icon>
               <el-icon v-else-if="metric.trend === 'down'"><CaretBottom /></el-icon>
            </div>
          </div>
          <span class="m-value">{{ metric.value }}<span class="m-unit">{{ metric.unit }}</span></span>
        </div>
      </div>
    </div>

    <!-- Phase 34: Engagement Heatmap -->
    <div class="engagement-section" v-if="guestScores.length > 0">
      <div class="box-label">CAST ENGAGEMENT HEATMAP</div>
      <div class="engagement-grid">
        <div v-for="guest in guestScores" :key="guest.id" class="guest-score-card">
          <div class="guest-meta">
            <span class="guest-name">{{ guest.name }}</span>
            <span class="guest-val">{{ Math.round(guest.score) }}%</span>
          </div>
          <div class="score-bar">
            <div class="score-fill" :style="{ 
              width: guest.score + '%',
              backgroundColor: guest.score < 30 ? '#ff4757' : (guest.score < 60 ? '#ffa502' : '#2ed573')
            }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="segments-list">
      <div v-for="(seg, idx) in showrunner.segments" :key="seg.id" 
           class="segment-item" 
           :class="{ 'active': idx === showrunner.currentSegmentIndex }">
        <div class="seg-info">
          <span class="seg-title">{{ seg.title }}</span>
          <span class="seg-time" v-if="idx === showrunner.currentSegmentIndex">{{ formatElapsed }}</span>
        </div>
        <div class="seg-progress" v-if="idx === showrunner.currentSegmentIndex">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Phase 35: Commerce HUD -->
    <div class="commerce-hud" v-if="studioStore.liveProducts.length > 0">
      <div class="box-label">NEURAL COMMERCE HUD</div>
      <div class="intent-gauge">
        <div class="gauge-label">BUYING INTENT: {{ Math.round(studioStore.intentScore * 100) }}%</div>
        <div class="gauge-bar">
          <div class="gauge-fill" :style="{ width: (studioStore.intentScore * 100) + '%' }"></div>
        </div>
      </div>
      <div class="active-promo" v-if="studioStore.activeFlashSale">
        <div class="promo-tag">FLASH SALE ACTIVE</div>
        <div class="promo-details">
          {{ studioStore.activeFlashSale.discount }}% OFF | 
          <span class="timer">{{ formatFlashSaleTimer }}</span>
        </div>
      </div>
    </div>

    <!-- Phase 36: Neural Knowledge Stream -->
    <div class="knowledge-stream" v-if="showrunner.researchState.currentTopic">
      <div class="box-label">NEURAL KNOWLEDGE STREAM</div>
      <div class="knowledge-item" :class="{ 'scanning': showrunner.researchState.isSearching }">
        <el-icon v-if="showrunner.researchState.isSearching" class="is-loading"><Search /></el-icon>
        <span class="topic-text">
          <span v-if="!showrunner.researchState.isSearching" class="gemini-badge">GEMINI INSIGHT</span>
          <span v-if="!showrunner.researchState.isSearching && !showrunner.researchState.currentTopic.includes('FAILED')" class="verify-badge">VERIFIED</span>
          {{ showrunner.researchState.isSearching ? 'SCANNING' : 'RETRIEVED' }}: {{ showrunner.researchState.currentTopic }}
        </span>
      </div>
    </div>

    <!-- Phase 44: Neural Archive (Persistence) -->
    <div class="archive-section" v-if="neuralMemory.state.learnings.length > 0">
      <div class="box-label">NEURAL ARCHIVE (LONG-TERM MEMORY)</div>
      <div class="archive-items">
        <div v-for="(item, iIdx) in neuralMemory.state.learnings.slice(-3).reverse()" :key="iIdx" class="archive-item">
          <div class="archive-topic">
            <el-icon><Collection /></el-icon> {{ item.topic }}
            <span class="mention-count">x{{ item.mentions }}</span>
          </div>
          <div class="archive-text">{{ item.keyTakeaway }}</div>
        </div>
      </div>
    </div>

    <!-- Phase 45: Viral Highlights & Syndication -->
    <div class="viral-section" v-if="recapOrchestrator.state.moments.length > 0">
      <div class="box-label">NEURAL VIRAL ASSETS & SYNDICATION</div>
      <div class="viral-moments">
        <div v-for="moment in recapOrchestrator.state.moments.slice(-4).reverse()" :key="moment.id" class="moment-card" :class="{ 'viral': moment.viralityScore > 0.8 }">
          <div class="moment-header">
            <span class="moment-title">{{ moment.reason }}</span>
            <span class="virality-badge" v-if="moment.viralityScore > 0.8">VIRAL PEAK</span>
          </div>
          <div class="moment-meta">
            <span>Score: {{ Math.round(moment.viralityScore * 100) }}%</span>
            <span>Seg: {{ moment.segmentTitle }}</span>
          </div>
          <div class="syndication-status" v-if="syndicationLogs[moment.reason]">
            <span class="platform-tag" v-for="p in syndicationLogs[moment.reason].platforms" :key="p">{{ p }}</span>
            <span class="status-icon"><Check /></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 41: Neural Evidence Stream -->
    <div class="evidence-stream" v-if="evidenceOverlay.state.activeCards.length > 0">
      <div class="box-label">NEURAL EVIDENCE STREAM</div>
      <div class="evidence-items">
        <div v-for="card in evidenceOverlay.state.activeCards" :key="card.id" class="evidence-card" :class="card.type">
          <div class="ev-header">
            <span class="ev-type badge">{{ card.type.toUpperCase() }}</span>
            <span class="ev-conf">CONF: {{ Math.round(card.confidence * 100) }}%</span>
          </div>
          <div class="ev-body">
            <div v-if="card.type === 'stat'" class="stat-view">
              <span class="stat-val">{{ card.data.value }}</span>
              <span class="stat-unit">{{ card.data.unit }}</span>
            </div>
            <div class="ev-title">{{ card.title }}</div>
            <div class="ev-desc">{{ card.description }}</div>
          </div>
          <div class="ev-footer" v-if="card.sourceUrl">
             <span class="source-link">SOURCE: {{ card.sourceUrl }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 43: Neural Session Recap -->
    <div class="recap-section" v-if="recapOrchestrator.state.currentRecap">
      <div class="box-label">NEURAL SESSION RECAP</div>
      <div class="recap-card">
        <div class="recap-header">
          <span class="recap-title">{{ recapOrchestrator.state.currentRecap.title }}</span>
          <span class="performance-badge">SCORE: {{ recapOrchestrator.state.currentRecap.performanceScore }}</span>
        </div>
        <div class="recap-summary">{{ recapOrchestrator.state.currentRecap.summary }}</div>
        <div class="recap-highlights" v-if="recapOrchestrator.state.currentRecap.highlights.length > 0">
          <div v-for="(hl, hIdx) in recapOrchestrator.state.currentRecap.highlights" :key="hIdx" class="hl-item">
            <el-icon><Check /></el-icon> {{ hl }}
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 39: Autonomous Poll HUD -->
    <div class="poll-hud" v-if="showrunner.activePoll">
      <div class="box-label">NEURAL INTERACTIVE POLL</div>
      <div class="poll-question">{{ showrunner.activePoll.question }}</div>
      <div class="poll-results">
        <div v-for="(opt, oIdx) in showrunner.activePoll.options" :key="oIdx" class="poll-option">
          <div class="opt-label">
            <span>{{ opt }}</span>
            <span>{{ showrunner.activePoll.results[oIdx] }}%</span>
          </div>
          <div class="opt-bar">
            <div class="opt-fill" :style="{ width: showrunner.activePoll.results[oIdx] + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 33: Neural Pivot Log -->
    <div class="pivot-log" v-if="showrunner.pivots.length > 0">
      <div class="box-label">NEURAL PIVOT LOG</div>
      <div class="pivot-items">
        <div v-for="(pivot, pIdx) in showrunner.pivots.slice(-3).reverse()" :key="pIdx" class="pivot-item">
          <span class="pivot-reason">{{ pivot.reason }}</span>
          <span class="pivot-meta">{{ formatTime(pivot.timestamp) }} | From: {{ pivot.fromSegment }}</span>
        </div>
      </div>
    </div>

    <!-- Phase 33: Neural Reasoning Central (Consensus Visualization) -->
    <div class="reasoning-section" v-if="latestDirectorLogs.length > 0">
      <div class="box-label">NEURAL REASONING CENTRAL</div>
      <div class="reasoning-timeline">
        <div v-for="(log, lIdx) in latestDirectorLogs" :key="lIdx" class="reasoning-group">
          <div class="reasoning-header">
            <span class="reasoning-action">{{ log.action }}</span>
            <span class="reasoning-time">{{ formatTime(log.timestamp) }}</span>
          </div>
          <div class="agent-dialogue">
            <div v-for="(agentLog, aIdx) in (log.agentLogs || [])" :key="aIdx" class="agent-msg" :class="agentLog.agent.toLowerCase()">
              <span class="agent-name">{{ agentLog.agent.toUpperCase() }}:</span>
              <span class="agent-text">{{ agentLog.message }}</span>
            </div>
          </div>
          <div class="reasoning-footer">
            <p class="final-reason">{{ log.reason }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 28: Neural Audio Director HUD -->
    <div class="audio-hud">
      <div class="box-label">{{ $t('studio.audioDirector.title') }}</div>
      <div class="audio-status">
        <div class="audio-row">
          <span class="audio-label">{{ $t('studio.audioDirector.vibe') }}</span>
          <span class="audio-val vibe-badge">{{ (audioState.currentVibe || 'chill').toUpperCase() }}</span>
        </div>
        <div class="audio-row">
          <span class="audio-label">{{ $t('studio.audioDirector.ducking') }}</span>
          <span class="audio-val" :class="{ 'text-active': audioState.isDucking }">
            {{ audioState.isDucking ? $t('studio.audioDirector.engaged') : $t('studio.audioDirector.standby') }}
          </span>
        </div>
        <div class="audio-row">
          <span class="audio-label">{{ $t('studio.audioDirector.masterVol') }}</span>
          <div class="aud-bar-wrap">
            <div class="aud-bar" :style="{ width: audioState.volume + '%', background: '#3b82f6' }"></div>
          </div>
          <span class="audio-val text-blue">{{ audioState.volume }}%</span>
        </div>
      </div>
    </div>

    <div class="directive-box" v-if="currentSegment">
      <div class="box-label">{{ $t('studio.dashboard.directiveTitle') }}</div>
      <div class="directive-text">
        <el-icon class="is-loading" v-if="showrunner.isRunning"><Loading /></el-icon>
        {{ currentSegment.directive }}
      </div>
    </div>

    <div class="footer">
      <el-button 
        type="primary" 
        size="small" 
        class="neural-btn"
        @click="toggleShowrunner"
      >
        {{ showrunner.isRunning ? 'DEACTIVATE SINGULARITY' : 'INITIATE SINGULARITY' }}
      </el-button>
      <el-button 
        v-if="!showrunner.isRunning && recapOrchestrator.state.moments.length > 0"
        type="success" 
        size="small" 
        class="neural-btn recap-btn"
        :loading="recapOrchestrator.state.isRecapping"
        @click="triggerRecap"
      >
        GENERATE SESSION RECAP
      </el-button>
      <el-button 
        v-if="!showrunner.isRunning"
        type="info"
        size="small"
        class="neural-btn import-btn"
        @click="showImportDialog = true"
      >
        🎬 IMPORT PROJECT
      </el-button>
    </div>
    <!-- Phase 7: Import Storyboard Dialog -->
    <ImportStoryboardDialog 
      :visible="showImportDialog" 
      @close="showImportDialog = false"
      @script-loaded="handleScriptLoaded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { neuralShowrunner } from '@/utils/ai/NeuralShowrunner';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { useStudioStore } from '@/stores/studio';
import { Loading, Search, Check, Collection, CaretTop, CaretBottom } from '@element-plus/icons-vue';
import { evidenceOverlayService as evidenceOverlay } from '@/utils/ai/EvidenceOverlayService';
import { recapOrchestrator } from '@/utils/ai/RecapOrchestrator';
import { neuralMemoryService as neuralMemory } from '@/utils/ai/NeuralMemoryService';
import { neuralAudioDirector } from '@/utils/ai/NeuralAudioDirector';
import ImportStoryboardDialog from '@/components/studio/ImportStoryboardDialog.vue';

const latestDirectorLogs = computed(() => {
  // Access directorLog from parent or inject? 
  // For simplicity, let's assume it's provided or we use a global store update.
  // In our implementation, we'll use an event or a direct prop.
  return (window as any)._directorLog || [];
});

const showrunner = neuralShowrunner.active;
const studioStore = useStudioStore();
const showImportDialog = ref(false);
const latestSignal = ref<any>(null);
let audioTimer: any = null;

// Phase 28: Audio State
const audioState = ref({
  currentVibe: 'chill',
  isDucking: false,
  volume: 40
});

// Phase 45: Syndication Tracking
const syndicationLogs = ref<Record<string, any>>({});

onMounted(() => {
  const socket = (window as any).ActionSyncService?.getSocket();
  if (socket) {
    socket.on('show:event', (event: any) => {
      if (event.type === 'social_syndication' || event.type === 'recap_syndication') {
        const payload = event.payload;
        syndicationLogs.value[payload.title || payload.reason] = payload;
      }
    });
  }
  window.addEventListener('audience:signal', (e: Event) => {
    latestSignal.value = (e as CustomEvent).detail;
    setTimeout(() => { latestSignal.value = null; }, 12000);
  });

  audioTimer = setInterval(() => {
    audioState.value = neuralAudioDirector.getState();
  }, 200);
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (audioTimer) clearInterval(audioTimer);
});

const chatVelocityPct = computed(() => Math.min(100, ((studioStore.chatVelocity || 0) / 3) * 100));
const chatVelocityColor = computed(() => {
  const v = studioStore.chatVelocity || 0;
  if (v > 2) return '#ef4444';
  if (v > 1) return '#f59e0b';
  return '#22c55e';
});

function triggerRecap() {
  recapOrchestrator.generateFullRecap();
}

// Phase 7: Storyboard-to-Live Bridge
function handleScriptLoaded(script: any) {
  neuralShowrunner.loadExternalScript(script);
}

const currentSegment = computed(() => showrunner.segments[showrunner.currentSegmentIndex]);

const guestScores = computed(() => {
  return Array.from(syntheticGuestManager.activeGuests.entries()).map(([id, guest]) => ({
    id,
    name: guest.persona.name,
    score: syntheticGuestManager.guestEngagementScores.get(id) || 50
  }));
});

const progressPercent = computed(() => {
  if (!currentSegment.value || !showrunner.isRunning) return 0;
  return Math.min(100, (showrunner.elapsedMs / currentSegment.value.durationMs) * 100);
});

const formatElapsed = computed(() => {
  const total = Math.floor(showrunner.elapsedMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
});

const formatFlashSaleTimer = computed(() => {
  if (!studioStore.activeFlashSale) return '0:00';
  const elapsed = Date.now() - studioStore.activeFlashSale.startTime;
  const remaining = Math.max(0, (studioStore.activeFlashSale.durationMinutes * 60000) - elapsed);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
});

function toggleShowrunner() {
  if (showrunner.isRunning) {
    neuralShowrunner.stop();
  } else {
    neuralShowrunner.start();
  }
}

function formatTime(ts: number) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getArcHeight(i: number) {
  const base = Math.sin(i * 0.2) * 20 + 30;
  const jitter = Math.random() * 10;
  return `${base + jitter}px`;
}

const contextMetrics = computed(() => {
  const ctx = studioStore.streamingContext;
  if (!ctx) return null;

  switch (ctx) {
    case 'sales':
      return {
        label: 'Commerce',
        items: [
          { name: 'Conversion', value: '3.2', unit: '%', trend: 'up' },
          { name: 'Revenue', value: '14.2', unit: 'k', trend: 'up' },
          { name: 'Cart Inserts', value: '184', unit: '', trend: 'up' }
        ]
      };
    case 'game_streaming':
      return {
        label: 'Gaming',
        items: [
          { name: 'Avg FPS', value: '144', unit: '', trend: 'neutral' },
          { name: 'Latency', value: '24', unit: 'ms', trend: 'down' },
          { name: 'Clips/Min', value: '0.8', unit: '', trend: 'up' }
        ]
      };
    case 'news':
      return {
        label: 'Journalism',
        items: [
          { name: 'Truth Score', value: '98', unit: '%', trend: 'up' },
          { name: 'Citations', value: '12', unit: '', trend: 'up' },
          { name: 'Viral Reach', value: '42.5', unit: 'k', trend: 'up' }
        ]
      };
    case 'sport':
      return {
        label: 'Athletics',
        items: [
          { name: 'Intensity', value: '85', unit: '%', trend: 'up' },
          { name: 'Highlights', value: '4', unit: '', trend: 'up' },
          { name: 'Win Prob.', value: '62', unit: '%', trend: 'up' }
        ]
      };
    default:
      return null;
  }
});
</script>

<style scoped>
.neural-dashboard {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(0, 242, 255, 0.2);
  border-radius: 1.5rem;
  padding: 1.5rem;
  width: 300px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
}

.header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.glow-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  box-shadow: 0 0 10px #666;
}

.glow-status.active {
  background: var(--neon-blue, #00f2ff);
  box-shadow: 0 0 15px var(--neon-blue, #00f2ff);
  animation: pulse 2s infinite;
}

.title {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2rem;
  color: rgba(255, 255, 255, 0.6);
}

.arc-container {
  margin-bottom: 2rem;
}

.arc-label {
  font-size: 0.65rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.arc-label .highlight {
  color: #00f2ff;
}

.arc-visual {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
}

.arc-bar {
  flex: 1;
  border-radius: 1px;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.segment-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.8rem;
  padding: 0.8rem;
  transition: all 0.3s ease;
}

.segment-item.active {
  background: rgba(0, 242, 255, 0.1);
  border-color: rgba(0, 242, 255, 0.3);
}

.seg-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.seg-title {
  font-size: 0.8rem;
  font-weight: 600;
}

.seg-time {
  font-size: 0.7rem;
  color: #00f2ff;
  font-family: monospace;
}

.seg-progress {
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00f2ff;
  transition: width 1s linear;
}

/* Phase 20: Context Metrics Styles */
.context-metrics-section {
  margin-bottom: 2rem;
  background: rgba(0, 242, 255, 0.05);
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(0, 242, 255, 0.1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.m-name {
  font-size: 0.55rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-value {
  font-size: 1.1rem;
  font-weight: 900;
  color: #fff;
}

.m-unit {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 2px;
}

.m-trend {
  font-size: 0.7rem;
}

.m-trend.up { color: #2ed573; }
.m-trend.down { color: #ff4757; }
.m-trend.neutral { color: #ffa502; }

/* Phase 35: Commerce HUD Styles */
.commerce-hud {
  background: rgba(255, 165, 2, 0.05);
  border-left: 3px solid #ffa502;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.intent-gauge {
  margin-bottom: 0.8rem;
}

.gauge-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #ffa502;
  margin-bottom: 0.4rem;
}

.gauge-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.gauge-fill {
  height: 100%;
  background: #ffa502;
  transition: width 0.5s ease;
}

.active-promo {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.6rem;
  border-radius: 0.4rem;
}

.promo-tag {
  font-size: 0.6rem;
  font-weight: 900;
  color: #ff4757;
  letter-spacing: 0.05rem;
}

.promo-details {
  font-size: 0.7rem;
  color: #fff;
}

.timer {
  color: #ffa502;
  font-family: monospace;
}

/* Phase 36: Knowledge Stream Styles */
.knowledge-stream {
  background: rgba(155, 89, 182, 0.05);
  border-left: 3px solid #9b59b6;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.knowledge-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #9b59b6;
  font-weight: 700;
}

.knowledge-item.scanning {
  color: #e0acff;
  animation: scan-pulse 1.5s infinite;
}

.topic-text {
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gemini-badge {
  background: linear-gradient(45deg, #4285f4, #9b59b6);
  color: #fff;
  font-size: 0.5rem;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 900;
}

.verify-badge {
  background: rgba(46, 213, 115, 0.2);
  color: #2ed573;
  border: 1px solid rgba(46, 213, 115, 0.4);
  font-size: 0.5rem;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}

@keyframes scan-pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* Phase 34: Engagement Styles */
.engagement-section {
  margin-bottom: 2rem;
}

.engagement-grid {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.guest-score-card {
  background: rgba(255, 255, 255, 0.02);
  padding: 0.6rem;
  border-radius: 0.5rem;
}

.guest-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.guest-name {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.guest-val {
  font-size: 0.65rem;
  font-weight: 900;
  color: #fff;
}

.score-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  transition: width 0.5s ease, background-color 0.5s ease;
}

.directive-box {
  background: rgba(0, 242, 255, 0.05);
  border-left: 3px solid #00f2ff;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.box-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: #00f2ff;
  margin-bottom: 0.5rem;
}

.directive-text {
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.8);
}

.pivot-log {
  background: rgba(255, 50, 50, 0.05);
  border-left: 3px solid #ff4757;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.pivot-items {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pivot-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pivot-reason {
  font-size: 0.75rem;
  font-weight: 700;
  color: #ff4757;
}

.pivot-meta {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
}

.neural-btn {
  width: 100%;
  background: linear-gradient(45deg, #00f2ff, #0012ff) !important;
  border: none !important;
  font-weight: 900 !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.05rem !important;
  height: 2.5rem !important;
  border-radius: 0.8rem !important;
}

@keyframes pulse {
  0% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.6; transform: scale(0.9); }
}
/* Phase 44: Archive Styles */
.archive-section {
  background: rgba(0, 242, 255, 0.03);
  border-left: 3px solid #00f2ff;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.archive-items {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.archive-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.6rem;
}

.archive-topic {
  font-size: 0.65rem;
  font-weight: 800;
  color: #00f2ff;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
  text-transform: uppercase;
}

.mention-count {
  font-size: 0.5rem;
  background: rgba(0, 242, 255, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
}

.archive-text {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.evidence-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.evidence-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.6rem;
  padding: 0.8rem;
  border: 1px solid rgba(46, 213, 115, 0.2);
}

.ev-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.badge {
  font-size: 0.5rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 800;
}

.ev-type {
  background: #2ed573;
  color: #000;
}

.ev-conf {
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.4);
}

.stat-view {
  margin-bottom: 0.5rem;
}

.stat-val {
  font-size: 1.8rem;
  font-weight: 900;
  color: #2ed573;
  line-height: 1;
}

.stat-unit {
  font-size: 0.8rem;
  color: rgba(46, 213, 115, 0.6);
  margin-left: 0.2rem;
}

.ev-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.4rem;
}

.ev-desc {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.ev-footer {
  margin-top: 0.8rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Phase 43: Recap Section Styles */
.recap-section {
  background: rgba(46, 204, 113, 0.05);
  border-left: 3px solid #2ecc71;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 0.8rem 0.8rem 0;
}

.recap-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.8rem;
  padding: 1rem;
  border: 1px solid rgba(46, 204, 113, 0.2);
}

.recap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.recap-title {
  font-size: 0.8rem;
  font-weight: 800;
  color: #2ecc71;
}

.performance-badge {
  font-size: 0.6rem;
  background: #2ecc71;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 900;
}

.recap-summary {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.recap-highlights {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.hl-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #a0aec0;
}

.hl-item .el-icon {
  color: #10b981;
  font-size: 0.9rem;
  margin-top: 0.1rem;
}

.recap-btn {
  margin-top: 0.5rem;
  background: linear-gradient(45deg, #2ecc71, #27ae60) !important;
}

.source-link {
  font-size: 0.55rem;
  color: #2ed573;
  text-transform: uppercase;
}

/* Neural Reasoning Central Styles */
.reasoning-section {
  background: rgba(0, 10, 20, 0.6);
  border: 1px solid rgba(0, 242, 255, 0.1);
  border-radius: 1rem;
  padding: 1rem;
  margin-bottom: 2rem;
  box-shadow: inset 0 0 20px rgba(0, 242, 255, 0.05);
}

.reasoning-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
  scrollbar-width: none;
}

.reasoning-group {
  border-left: 2px solid rgba(0, 242, 255, 0.2);
  padding-left: 1rem;
  position: relative;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.reasoning-action {
  font-size: 0.7rem;
  font-weight: 900;
  color: #00f2ff;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}

.reasoning-time {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.3);
}

.agent-dialogue {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.agent-msg {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  border-left: 3px solid transparent;
}

.agent-msg.creative { border-color: #ff00ff; }
.agent-msg.technical { border-color: #00f2ff; }
.agent-msg.commercial { border-color: #00ff00; }

.agent-name {
  font-size: 0.55rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.5);
}

.agent-text {
  font-size: 0.65rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.8);
}

.final-reason {
  font-size: 0.6rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.4);
}

/* Phase 28: Neural Audio Director */
.audio-hud {
  margin-top: 15px;
  background: rgba(10, 15, 30, 0.5);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 12px;
  box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.1);
}

.audio-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.audio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

.audio-label {
  color: rgba(255, 255, 255, 0.5);
}

.audio-val {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.vibe-badge {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.text-active {
  color: #ef4444 !important;
  animation: flashPulse 1.5s infinite;
}

.text-blue {
  color: #60a5fa !important;
}

@keyframes flashPulse {
  0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
  50% { opacity: 0.6; text-shadow: none; }
}

/* Phase 45: Viral Highlights & Syndication Styles */
.viral-moments {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.moment-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
  transition: all 0.3s ease;

  &.viral {
    border-color: rgba(255, 71, 87, 0.3);
    background: rgba(255, 71, 87, 0.05);
  }

  .moment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .moment-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
  }

  .virality-badge {
    font-size: 0.6rem;
    background: #ff4757;
    color: #fff;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .moment-meta {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    justify-content: space-between;
  }

  .syndication-status {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;

    .platform-tag {
      font-size: 0.6rem;
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      padding: 1px 4px;
      border-radius: 2px;
      text-transform: uppercase;
    }

    .status-icon {
      margin-left: auto;
      color: #2ed573;
      font-size: 0.8rem;
    }
  }
}
</style>
