<template>
  <transition name="fade">
    <div v-if="isVisible" class="post-show-overlay">
      <div class="glass-container">
        <!-- Close Button -->
        <button class="close-btn" @click="closeOverlay">
          <el-icon><Close /></el-icon>
        </button>

        <div class="overlay-header">
          <div class="status-tag">SINGULARITY STATUS: ARCHIVED</div>
          <h1>{{ recap?.title || 'SESSION COMPLETE' }}</h1>
          <div class="performance-metric">
            <span class="label">PERFORMANCE SCORE</span>
            <span class="value">{{ recap?.performanceScore || 0 }}</span>
          </div>
        </div>

        <div class="overlay-content">
          <!-- Summary Section -->
          <div class="content-section summary">
            <h2><el-icon><Document /></el-icon> NEURAL SUMMARY</h2>
            <p>{{ recap?.summary || 'No summary available.' }}</p>
          </div>

          <div class="stats-grid">
            <!-- Viral Moments -->
            <div class="content-section moments" v-if="moments.length > 0">
              <h2><el-icon><VideoCamera /></el-icon> VIRAL HIGHLIGHTS</h2>
              <div class="moment-list">
                <div v-for="moment in moments.slice(0, 3)" :key="moment.id" class="moment-item">
                  <span class="moment-reason">{{ moment.reason }}</span>
                  <span class="moment-score">VIRALITY {{ Math.round(moment.viralityScore * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- Verified Facts -->
            <div class="content-section facts" v-if="facts.length > 0">
              <h2><el-icon><CircleCheck /></el-icon> FACTS VERIFIED</h2>
              <div class="fact-list">
                <div v-for="(fact, fIdx) in facts.slice(0, 3)" :key="fIdx" class="fact-item" :class="{ 'inaccurate': !fact.isAccurate }">
                  <span class="fact-status">{{ fact.isAccurate ? 'VERIFIED' : 'INACCURATE' }}</span>
                  <span class="fact-claim">{{ fact.claim }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="overlay-footer">
          <div class="syndication-tags" v-if="syndicatedPlatforms.length > 0">
            <span class="s-label">SYNDICATED TO:</span>
            <div class="tags">
                <span v-for="p in syndicatedPlatforms" :key="p" class="tag">{{ p.toUpperCase() }}</span>
            </div>
          </div>
          <button class="action-btn" @click="closeOverlay">RETURN TO STUDIO</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Close, Document, VideoCamera, CircleCheck } from '@element-plus/icons-vue';
import { recapOrchestrator } from '@/utils/ai/RecapOrchestrator';

const isVisible = ref(false);
const recap = computed(() => recapOrchestrator.state.currentRecap);
const moments = computed(() => recapOrchestrator.state.moments);
const facts = computed(() => recapOrchestrator.state.factChecks);

const syndicatedPlatforms = ref(['twitter', 'linkedin', 'tiktok']); // Simplified for mock

const handleShowTerminated = (e: any) => {
    console.log('[PostShowOverlay] Show terminated event received.');
    isVisible.value = true;
};

onMounted(() => {
    window.addEventListener('studio:show_terminated', handleShowTerminated);
});

onUnmounted(() => {
    window.removeEventListener('studio:show_terminated', handleShowTerminated);
});

function closeOverlay() {
    isVisible.value = false;
}
</script>

<style scoped>
.post-show-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  backdrop-filter: blur(20px);
}

.glass-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  background: rgba(20, 20, 30, 0.8);
  border: 1px solid rgba(0, 242, 255, 0.2);
  border-radius: 2rem;
  padding: 3rem;
  box-shadow: 0 0 100px rgba(0, 242, 255, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.05);
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(50px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 71, 87, 0.2);
  border-color: #ff4757;
  color: #ff4757;
}

.overlay-header {
  text-align: center;
  margin-bottom: 3rem;
}

.status-tag {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  color: #00f2ff;
  margin-bottom: 1rem;
}

h1 {
  font-size: 3rem;
  font-weight: 900;
  background: linear-gradient(to right, #fff, #00f2ff, #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1.5rem;
}

.performance-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.performance-metric .label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
}

.performance-metric .value {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.content-section h2 {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.moment-list, .fact-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.moment-item, .fact-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  padding: 1rem;
  transition: all 0.3s ease;
}

.moment-reason, .fact-claim {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.moment-score {
  font-size: 0.65rem;
  font-weight: 900;
  color: #ffa502;
}

.fact-status {
  font-size: 0.6rem;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(46, 213, 115, 0.2);
  color: #2ed573;
  margin-right: 0.8rem;
  border: 1px solid rgba(46, 213, 115, 0.4);
}

.fact-item.inaccurate .fact-status {
  background: rgba(255, 71, 87, 0.2);
  color: #ff4757;
  border-color: rgba(255, 71, 87, 0.4);
}

.overlay-footer {
  margin-top: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.syndication-tags {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.s-label {
  font-size: 0.6rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.3);
}

.tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 4px 10px;
  background: rgba(0, 242, 255, 0.1);
  color: #00f2ff;
  border-radius: 6px;
  border: 1px solid rgba(0, 242, 255, 0.2);
}

.action-btn {
  background: #00f2ff;
  color: #000;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 1rem;
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px rgba(0, 242, 255, 0.5);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
