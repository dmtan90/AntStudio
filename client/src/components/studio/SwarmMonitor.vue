<template>
  <div class="swarm-monitor glass-dark" v-if="visible">
    <div class="monitor-header">
      <div class="flex items-center gap-2">
        <connection-point theme="outline" size="14" class="text-blue-400 animate-pulse" />
        <span class="header-text">AI HIVE COORDINATION LOG</span>
      </div>
      <div class="header-actions">
        <div class="pulse-ring"></div>
        <button @click="$emit('close')" class="close-btn mx-2">
          <close theme="outline" size="14" />
        </button>
      </div>
    </div>

    <!-- Active Swarm Board -->
    <div class="board-directors-view">
       <!-- Neural Link SVG Overlay -->
       <svg class="neural-links-overlay" v-if="activeAgents.length > 1">
           <path v-for="(link, i) in neuralLinks" :key="i" 
                 :d="link.path" class="neural-path" />
       </svg>
       
       <div v-for="agent in activeAgents" :key="agent" class="board-agent" :class="{ 'is-speaking': isAgentSpeaking(agent) }">
          <div class="agent-avatar-mini">
              <span class="initials">{{ agent.charAt(0) }}</span>
              <div class="audio-waves" v-if="isAgentSpeaking(agent)">
                  <span></span><span></span><span></span>
              </div>
          </div>
          <span class="agent-label">{{ agent.split(' ')[0] }}</span>
       </div>
    </div>

    <div class="messages-container" ref="scrollContainer">
      <div v-for="(msg, index) in messages" :key="index" class="swarm-msg" :class="msg.type">
        <div class="msg-meta">
          <span class="agent-tag from">{{ msg.fromAgent }}</span>
          <span class="comm-line" v-if="msg.toAgent"></span>
          <span class="agent-tag to" v-if="msg.toAgent">{{ msg.toAgent }}</span>
          <span class="timestamp-code">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div class="msg-payload">
            <span class="content">{{ msg.payload.message }}</span>
            <div class="content-glitch"></div>
        </div>
      </div>
      <div v-if="messages.length === 0" class="empty-state">
        <div class="terminal-cursor"></div>
        <p>AWAITING INTER-AGENT COORDINATION...</p>
      </div>
    </div>

    <div class="monitor-footer">
      <div class="swarm-stats">
        <div class="stat-item">
          <span class="label">DENSITY</span>
          <span class="value">{{ activeAgents.length }} NODES</span>
        </div>
        <div class="stat-item">
          <span class="label">LATENCY</span>
          <span class="value">24MS</span>
        </div>
        <div class="vibe-scanner" :style="{ background: `linear-gradient(90deg, transparent, ${vibeColor}, transparent)` }">
            <div class="scanner-line"></div>
        </div>
        <div class="vibe-label absolute right-4 bottom-2 text-[7px] font-black uppercase tracking-widest text-white/30">
            HIVE_MOOD: <span :style="{ color: vibeColor }">{{ currentVibe }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { ConnectionPoint, Close } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';

const props = defineProps<{
  visible: boolean;
  messages: any[];
  activeAgents: string[];
}>();

const studioStore = useStudioStore();
const currentVibe = computed(() => studioStore.studioVibe);

const vibeColor = computed(() => {
    const vibes: Record<string, string> = {
        'excited': '#f59e0b',
        'serious': '#3b82f6',
        'tense': '#ef4444',
        'chill': '#10b981',
        'neutral': '#6b7280'
    };
    return vibes[currentVibe.value.toLowerCase()] || vibes.neutral;
});

const emit = defineEmits(['close']);

const scrollContainer = ref<HTMLElement | null>(null);

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Simulation for visual effect
const isAgentSpeaking = (name: string) => {
    // In a real scenario, this would come from props/store
    // For now, if the last message was from this agent, show them as speaking for 3s
    if (props.messages.length === 0) return false;
    const lastMsg = props.messages[props.messages.length - 1];
    return lastMsg.fromAgent === name && Date.now() - lastMsg.timestamp < 3000;
};

watch(() => props.messages.length, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({
        top: scrollContainer.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
});

const neuralLinks = computed(() => {
    if (props.messages.length === 0 || props.activeAgents.length < 2) return [];
    
    const lastMsg = props.messages[props.messages.length - 1];
    if (!lastMsg.fromAgent || !lastMsg.toAgent) return [];
    
    // Find indices
    const fromIdx = props.activeAgents.indexOf(lastMsg.fromAgent);
    const toIdx = props.activeAgents.indexOf(lastMsg.toAgent);
    
    if (fromIdx === -1 || toIdx === -1) return [];
    
    // Draw an arc between them
    // Each agent is approx 62px apart (50 min-width + 12 gap)
    const x1 = fromIdx * 62 + 25;
    const x2 = toIdx * 62 + 25;
    const midX = (x1 + x2) / 2;
    const h = -20; // Arc height
    
    return [{
        path: `M ${x1} 30 Q ${midX} ${h} ${x2} 30`,
        active: Date.now() - lastMsg.timestamp < 3000
    }];
});

onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
});
</script>

<style scoped lang="scss">
.swarm-monitor {
  position: absolute;
  top: 100px;
  right: 24px;
  width: 320px;
  height: 500px;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(30px) saturate(150%);
  overflow: hidden;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(64, 158, 255, 0.05);

  .monitor-header {
    padding: 14px 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-text {
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2.5px;
        color: rgba(255, 255, 255, 0.7);
    }
  }

  .board-directors-view {
      display: flex;
      padding: 12px;
      gap: 12px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      overflow-x: auto;
      
      &::-webkit-scrollbar { display: none; }

      .board-agent {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 50px;
          transition: transform 0.3s;

          &.is-speaking {
              transform: scale(1.1);
              .agent-avatar-mini {
                  border-color: #3b82f6;
                  box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
              }
          }

          .agent-avatar-mini {
              width: 36px;
              height: 36px;
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              
              .initials { font-size: 12px; font-weight: 900; opacity: 0.5; }
              
              .audio-waves {
                  position: absolute;
                  bottom: -2px;
                  display: flex;
                  gap: 2px;
                  span {
                      width: 2px;
                      background: #3b82f6;
                      border-radius: 1px;
                      animation: wave 0.6s infinite alternate;
                      &:nth-child(1) { height: 6px; }
                      &:nth-child(2) { height: 10px; animation-delay: 0.2s; }
                      &:nth-child(3) { height: 6px; animation-delay: 0.4s; }
                  }
              }
          }
          
      .agent-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          opacity: 0.4;
      }
    }
  }

  .neural-links-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 60px;
      pointer-events: none;
      z-index: 5;
      
      .neural-path {
          fill: none;
          stroke: #8b5cf6;
          stroke-width: 2;
          stroke-dasharray: 4 2;
          animation: flowDash 1s linear infinite;
          filter: drop-shadow(0 0 5px #8b5cf6);
          opacity: 0.6;
      }
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 2px; }
  }

  .swarm-msg {
    position: relative;
    padding-left: 12px;
    
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 4px;
        bottom: 4px;
        width: 2px;
        background: #3b82f6;
        box-shadow: 0 0 10px #3b82f6;
    }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;

      .agent-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
      }
      
      .comm-line {
          width: 12px;
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
      }
      
      .timestamp-code {
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          opacity: 0.3;
      }
    }

    .msg-payload {
      font-size: 11px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.85);
      font-family: 'Inter', sans-serif;
      position: relative;
    }

    &.direct {
        &::before { background: #8b5cf6; box-shadow: 0 0 10px #8b5cf6; }
        .agent-tag { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0.2;
    gap: 12px;
    
    .terminal-cursor {
        width: 10px;
        height: 16px;
        background: #fff;
        animation: blink 1s infinite;
    }
    
    p { font-size: 9px; font-weight: 900; letter-spacing: 2px; }
  }

  .monitor-footer {
    padding: 12px 18px;
    background: rgba(0, 0, 0, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    position: relative;
  }

  .swarm-stats {
      display: flex;
      justify-content: space-between;
      
      .stat-item {
          display: flex;
          flex-direction: column;
          .label { font-size: 7px; font-weight: 900; opacity: 0.4; }
          .value { font-size: 9px; font-weight: 800; color: #3b82f6; }
      }
  }

  .vibe-scanner {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
      animation: scan 4s linear infinite;
  }
}

@keyframes wave {
    from { height: 4px; }
    to { height: 12px; }
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

@keyframes scan {
    0% { transform: translateY(-30px); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(60px); opacity: 0; }
}

@keyframes flowDash {
    to { stroke-dashoffset: -6; }
}

.close-btn {
    opacity: 0.5;
    transition: all 0.2s;
    &:hover { opacity: 1; color: #f87171; transform: rotate(90deg); }
}
</style>
