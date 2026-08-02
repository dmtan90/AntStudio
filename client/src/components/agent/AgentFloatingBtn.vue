<template>
  <Transition name="fab-fade">
    <button
      v-if="!isOpen"
      id="agent-floating-btn"
      class="agent-fab"
      @click="toggleSidebar"
      title="AntStudio AI Assistant"
    >
      <span class="fab-icon">
      <robot theme="outline" size="24" fill="currentColor" :strokeWidth="3"/>
    </span>
    <span class="fab-label">AI Agent</span>
    <span class="pulse-ring" />
  </button>
  </Transition>
</template>

<script setup lang="ts">
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import { Robot, Close } from '@icon-park/vue-next';

const { isOpen, toggleSidebar } = useAntStudioAgent();
</script>

<style scoped lang="scss">
.agent-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99, 102, 241, 0.4);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.6);
  }

  &.active {
    background: linear-gradient(135deg, #374151, #4b5563);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .fab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    width: 26px;
    height: 26px;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  .fab-label {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    font-weight: 700;
    color: #a855f7;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid rgba(99, 102, 241, 0.6);
    animation: pulse-ring 2s ease-out infinite;
    pointer-events: none;
  }
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}
</style>
