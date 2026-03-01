<template>
  <transition name="quest-cinematic">
    <div v-if="studioStore.userProgress && studioStore.demoMode" class="quest-overlay-container pointer-events-auto">
      
      <!-- User Gamification Profile (Always Visible) -->
      <div class="user-profile-banner glass-panel mb-4">
          <div class="level-badge">
              <span class="level-label">{{ $t('studio.common.level') || 'LVL' }}</span>
              <span class="level-value">{{ studioStore.userProgress.level }}</span>
          </div>
          <div class="xp-section">
              <div class="xp-header">
                  <span class="xp-label">{{ $t('studio.common.experience') || 'EXPERIENCE' }}</span>
                  <span class="xp-value">{{ studioStore.userProgress.xp }} {{ $t('studio.common.xp') || 'XP' }}</span>
              </div>
              <div class="xp-bar-track">
                  <div class="xp-bar-fill" :style="{ width: getXpPercent() + '%' }"></div>
              </div>
          </div>
      </div>

      <!-- Active Quests List -->
      <div class="quests-list space-y-3">
        <div v-for="quest in activeQuests" :key="quest.id" class="quest-card" :class="{ 'completed': quest.completed }">
            <div class="quest-icon-wrapper">
                <component :is="getIcon(quest.type)" theme="filled" size="24" :class="getIconColor(quest.type)" />
            </div>
            
            <div class="quest-details">
                <div class="flex justify-between items-start">
                    <h3 class="quest-title">{{ quest.title }}</h3>
                    <span class="quest-reward">+{{ quest.rewardXp }} {{ $t('studio.common.xp') || 'XP' }}</span>
                </div>
                <p class="quest-desc">{{ quest.description }}</p>
                
                <!-- Progress Bar -->
                <div class="quest-progress">
                    <div class="progress-track">
                        <div class="progress-fill" :style="{ width: (quest.current / quest.target * 100) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ quest.current }} / {{ quest.target }}</span>
                </div>
            </div>

            <!-- Completion Checkmark -->
            <div v-if="quest.completed" class="completion-stamp">
                <check-one theme="filled" size="32" class="text-green-500" />
            </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { 
  Trophy, 
  GameTwo as Game, 
  Voice, 
  MusicOne as Music,
  Peoples as Debate,
  TargetOne as RPG,
  Lightning,
  CheckOne,
  Message,
  ChartPie,
  Time
} from '@icon-park/vue-next';

const studioStore = useStudioStore();

const activeQuests = computed(() => {
    return studioStore.userProgress.activeQuests;
});

const getXpPercent = () => {
    // Simple math based on backend calculation: Level * 500
    // Current XP is total, so we need relative to current level
    // This is a simplification; ideally the backend sends "xpForNextLevel"
    // Let's assume progress.xp is "current level progress" vs "total" based on my backend code
    // Reset: In backend addXp, I did `progress.xp -= xpForNextLevel`. So `xp` is current progress.
    const threshold = studioStore.userProgress.level * 500;
    return Math.min(100, (studioStore.userProgress.xp / threshold) * 100);
};

const getIcon = (type: string) => {
  switch (type) {
    case 'chat': return Message;
    case 'poll': return ChartPie;
    case 'watch_time': return Time;
    case 'trivia': return Trophy;
    default: return Game;
  }
};

const getIconColor = (type: string) => {
    switch (type) {
        case 'chat': return 'text-blue-400';
        case 'poll': return 'text-purple-400';
        case 'watch_time': return 'text-green-400';
        default: return 'text-white';
    }
}
</script>

<style scoped lang="scss">
.quest-overlay-container {
  position: absolute;
  top: 80px; /* Adjusted to sit below top bar */
  left: 20px; /* Left align for personal hud */
  width: 300px;
  z-index: 90;
}

.glass-panel {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 12px;
}

.user-profile-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.level-badge {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
    color: #000;
    
    .level-label { font-size: 8px; font-weight: 900; }
    .level-value { font-size: 20px; font-weight: 900; line-height: 1; }
}

.xp-section {
    flex: 1;
}

.xp-header {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.xp-bar-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    
    .xp-bar-fill {
        height: 100%;
        background: #ffd700;
        box-shadow: 0 0 10px #ffd700;
        transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
}

.quest-card {
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    gap: 12px;
    position: relative;
    transition: all 0.3s ease;
    
    &:hover {
        transform: translateX(5px);
        border-color: rgba(255, 255, 255, 0.15);
    }
    
    &.completed {
        opacity: 0.7;
        border-color: #10b981;
    }
}

.quest-icon-wrapper {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.quest-details {
    flex: 1;
}

.quest-title {
    font-size: 12px;
    font-weight: 800;
    color: white;
    margin: 0;
}

.quest-reward {
    font-size: 10px;
    font-weight: 700;
    color: #ffd700;
    font-family: monospace;
}

.quest-desc {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    margin: 4px 0 8px 0;
    line-height: 1.2;
}

.quest-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .progress-track {
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        
        .progress-fill {
            height: 100%;
            background: #3b82f6;
            transition: width 0.3s ease;
        }
    }
    
    .progress-text {
        font-size: 9px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
    }
}

.completion-stamp {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0,0,0,0.8);
    border-radius: 50%;
    padding: 4px;
}

.quest-cinematic-enter-active,
.quest-cinematic-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.quest-cinematic-enter-from,
.quest-cinematic-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
