<template>
  <Teleport to="body">
    <Transition name="sidebar-slide">
      <div v-if="isOpen" id="agent-sidebar" class="agent-sidebar">
        <!-- Header -->
        <AgentHeader />

        <!-- Messages List -->
        <AgentMessageList />

        <!-- Input Area & Quick Suggestions -->
        <AgentInputArea />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import AgentHeader from './AgentHeader.vue';
import AgentMessageList from './AgentMessageList.vue';
import AgentInputArea from './AgentInputArea.vue';

const { isOpen } = useAntStudioAgent();
</script>

<style scoped lang="scss">
.agent-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  color: #f1f5f9;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

// Sidebar slide transition
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(100%);
}
</style>
