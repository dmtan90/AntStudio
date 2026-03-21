<template>
  <div class="project-thinking">
    <div class="thinking-header" :class="{ 'correction-mode': isCorrection }">
      <div class="ai-orbit" :class="{ 'correction': isCorrection }">
        <div class="core"></div>
        <div class="electron"></div>
      </div>
      <div class="thinking-text">
        <span class="main-msg">{{ isCorrection ? 'SELF-CORRECTING' : (message || $t('projects.new.aiThinking')) }}</span>
        <span class="sub-msg" v-if="logs.length > 0">{{ logs[logs.length - 1] }}</span>
      </div>
    </div>
    
    <div class="thinking-logs" v-if="logs.length > 0">
      <div v-for="(log, idx) in logs" :key="idx" class="log-entry" 
           :class="{ 
             'latest': idx === logs.length - 1,
             'architect': log.startsWith('[Architect]')
           }">
        <span class="dot"></span>
        <span class="log-text">{{ log.replace('[Architect]', '') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  message?: string;
  logs?: string[];
}>(), {
  logs: () => []
});

const isCorrection = computed(() => {
  return props.logs.some(log => log.toLowerCase().includes('loopback') || log.toLowerCase().includes('refinement'));
});
</script>

<style scoped lang="scss">
.project-thinking {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  backdrop-filter: blur(10px);
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.ai-orbit {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .core {
    width: 12px;
    height: 12px;
    background: var(--el-color-primary);
    border-radius: 50%;
    box-shadow: 0 0 15px var(--el-color-primary);
  }

  .electron {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 1.5px solid rgba(var(--el-color-primary-rgb), 0.3);
    border-radius: 50%;
    animation: rotate 2s linear infinite;

    &::after {
      content: '';
      position: absolute;
      top: -3px;
      left: 50%;
      width: 6px;
      height: 6px;
      background: var(--el-color-primary);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--el-color-primary);
    }
  }
}

.thinking-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  .main-msg {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
  }

  .sub-msg {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Fira Code', monospace;
  }
}

.thinking-logs {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(255, 255, 255, 0.05);

  .log-entry {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    opacity: 0.4;
    transition: all 0.3s ease;

    &.latest {
      opacity: 1;
      .dot { background: var(--el-color-primary); box-shadow: 0 0 10px var(--el-color-primary); }
    }

    &.latest.correction {
      .dot { background: #ff9f43; box-shadow: 0 0 10px #ff9f43; }
      .log-text { color: #ff9f43; font-weight: 700; }
    }

    &.architect {
      opacity: 0.9;
      .dot { background: #00f2ff; box-shadow: 0 0 8px #00f2ff; }
      .log-text { 
        color: #00f2ff; 
        font-style: italic; 
        font-size: 0.75rem;
        &::before { content: '◈ '; opacity: 0.5; }
      }
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      margin-top: 0.4rem;
      background: rgba(255, 255, 255, 0.3);
    }

    .log-text {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.4;
    }
  }
}

.thinking-header.correction-mode {
  .main-msg { color: #ff9f43; }
}

.ai-orbit.correction {
  .core {
    background: #ff9f43;
    box-shadow: 0 0 15px #ff9f43;
    animation: pulse-amber 1.5s infinite;
  }
  .electron {
    border-color: rgba(255, 159, 67, 0.3);
    &::after {
      background: #ff9f43;
      box-shadow: 0 0 10px #ff9f43;
    }
  }
}

@keyframes pulse-amber {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
