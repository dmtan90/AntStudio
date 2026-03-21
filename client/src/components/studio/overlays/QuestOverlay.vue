<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Trophy, Flame, Zap, Brain, Coins } from 'lucide-vue-next';

const studio = useStudioStore();
const activeQuest = computed(() => studio.activeQuest);

const progressPct = computed(() => {
  if (!activeQuest.value) return 0;
  return Math.round((activeQuest.value.current / activeQuest.value.target) * 100);
});

const questIcon = computed(() => {
  if (!activeQuest.value) return Flame;
  switch (activeQuest.value.type) {
    case 'hype': return Flame;
    case 'likes': return Zap;
    case 'intent': return Coins;
    case 'questions': return Brain;
    default: return Trophy;
  }
});

const isSuccess = computed(() => activeQuest.value?.completed);
</script>

<template>
  <Transition name="quest-slide">
    <div v-if="activeQuest" class="quest-overlay-container" :class="{ 'is-completed': isSuccess }">
      <div class="quest-card glass-morphism">
        <!-- Floating Icon -->
        <div class="quest-icon-wrap">
          <component :is="questIcon" class="q-icon" :class="{ 'pulse': !isSuccess }" />
          <div class="icon-glow"></div>
        </div>

        <div class="quest-content">
          <div class="quest-header">
            <span class="quest-label">{{ $t('studio.quests.audienceQuest') }}</span>
            <span class="quest-timer" v-if="!isSuccess">{{ $t('studio.quests.timeRemaining') }}</span>
          </div>
          
          <h3 class="quest-title">{{ activeQuest.title }}</h3>
          <p class="quest-desc">{{ activeQuest.description }}</p>

          <!-- Progress Bar -->
          <div class="progress-container">
            <div class="progress-track">
              <div 
                class="progress-fill" 
                :style="{ width: progressPct + '%' }"
                :class="activeQuest.type"
              >
                <div class="energy-flow"></div>
              </div>
            </div>
            <div class="progress-stats">
              <span>{{ progressPct }}%</span>
            </div>
          </div>
        </div>

        <!-- Success Stamp -->
        <div v-if="isSuccess" class="success-seal">
          <Trophy class="seal-icon" />
          <span>{{ $t('studio.quests.success') }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.quest-overlay-container {
  position: absolute;
  top: 40px;
  right: 40px;
  z-index: 1000;
  width: 380px;
  pointer-events: none;
}

.quest-card {
  position: relative;
  padding: 24px;
  border-radius: 20px;
  background: rgba(10, 15, 30, 0.4);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.6),
              inset 0 0 20px rgba(59, 130, 246, 0.1);
  overflow: hidden;
}

.quest-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
  pointer-events: none;
}

.quest-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transform: skewX(-25deg);
  animation: shimmer 8s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  20%, 100% { left: 200%; }
}

.quest-icon-wrap {
  position: absolute;
  top: -20px;
  left: -20px;
  width: 76px;
  height: 76px;
  background: linear-gradient(135deg, #4f46e5, #9333ea);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-10deg);
  box-shadow: 0 0 40px rgba(147, 51, 234, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.2);
  z-index: 2;
}

.icon-glow {
  position: absolute;
  inset: -10px;
  background: inherit;
  filter: blur(20px);
  opacity: 0.4;
  z-index: -1;
}

.q-icon {
  color: white;
  width: 36px;
  height: 36px;
  filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));
}

.pulse {
  animation: iconPulse 3s infinite ease-in-out;
}

.quest-header {
  display: flex;
  justify-content: space-between;
  margin-left: 60px;
  margin-bottom: 10px;
}

.quest-label {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 3px;
  color: #818cf8;
  text-transform: uppercase;
  text-shadow: 0 0 15px rgba(129, 140, 248, 0.6);
}

.quest-timer {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quest-title {
  font-family: 'Outfit', sans-serif;
  font-size: 24px;
  font-weight: 900;
  color: white;
  margin: 0;
  margin-left: 60px;
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.quest-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin: 14px 0 24px 0;
  line-height: 1.6;
}

.progress-container {
  background: rgba(0, 0, 0, 0.4);
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
}

.progress-track {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 12px;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.progress-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.progress-fill.hype { background: linear-gradient(90deg, #f97316, #ef4444, #f97316); background-size: 200% 100%; animation: gradFlow 3s linear infinite; }
.progress-fill.intent { background: linear-gradient(90deg, #10b981, #3b82f6, #10b981); background-size: 200% 100%; animation: gradFlow 3s linear infinite; }
.progress-fill.likes { background: linear-gradient(90deg, #f59e0b, #facc15, #f59e0b); background-size: 200% 100%; animation: gradFlow 3s linear infinite; }
.progress-fill.questions { background: linear-gradient(90deg, #a855f7, #ec4899, #a855f7); background-size: 200% 100%; animation: gradFlow 3s linear infinite; }

@keyframes gradFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.energy-flow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: energyFlow 2s infinite;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.success-seal {
  position: absolute;
  inset: 0;
  background: rgba(16, 185, 129, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  animation: sealIn 0.8s cubic-bezier(0.19, 1, 0.22, 1);
  box-shadow: inset 0 0 100px rgba(0,0,0,0.3);
}

.seal-icon {
  width: 80px;
  height: 80px;
  color: white;
  margin-bottom: 15px;
  filter: drop-shadow(0 0 20px rgba(255,255,255,0.6));
}

.success-seal span {
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  font-size: 28px;
  letter-spacing: 6px;
  color: white;
  text-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

@keyframes iconPulse {
  0%, 100% { transform: rotate(-10deg) scale(1) translateY(0); }
  50% { transform: rotate(-10deg) scale(1.08) translateY(-5px); box-shadow: 0 10px 60px rgba(147, 51, 234, 0.9); }
}

@keyframes energyFlow {
  0% { transform: translateX(-100%) skewX(-20deg); }
  100% { transform: translateX(300%) skewX(-20deg); }
}

@keyframes sealIn {
  from { opacity: 0; transform: scale(0.5) rotate(-20deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}

.quest-slide-enter-active, .quest-slide-leave-active {
  transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.quest-slide-enter-from { transform: translateX(120%) skewX(-10deg); opacity: 0; }
.quest-slide-leave-to { transform: scale(0.8) translateY(20px); opacity: 0; filter: blur(10px); }
</style>
