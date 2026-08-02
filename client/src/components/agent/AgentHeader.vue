<template>
  <div class="sidebar-header">
    <div class="header-left">
      <div class="agent-avatar">
        <robot theme="outline" size="20" fill="white" :strokeWidth="4"/>
      </div>
      <div class="agent-info">
        <div class="agent-name">AntStudio AI</div>
        <div class="agent-status">
          <span class="status-dot" :class="{ loading: isLoading }" />
          {{ isLoading ? t.statusLoading : t.statusReady }}
        </div>
      </div>
    </div>
    <div class="header-actions">
      <button class="icon-btn" :title="t.clearHistory" @click="clearChat">
        <delete theme="outline" size="16" fill="currentColor" :strokeWidth="4"/>
      </button>
      <button class="icon-btn" :title="t.close" @click="toggleSidebar">
        <close theme="outline" size="16" fill="currentColor" :strokeWidth="4"/>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import { Robot, Delete, Close } from '@icon-park/vue-next';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { preferredLanguage: currentLang } = storeToRefs(userStore);

const { isLoading, toggleSidebar, clearChat } = useAntStudioAgent();

const t = computed(() => {
  const isVn = currentLang.value === 'vi';
  return {
    statusReady: !isVn ? 'Ready' : 'Sẵn sàng',
    statusLoading: !isVn ? 'Processing...' : 'Đang xử lý...',
    clearHistory: !isVn ? 'Clear history' : 'Xóa lịch sử',
    close: !isVn ? 'Close' : 'Đóng'
  };
});
</script>

<style scoped lang="scss">
.sidebar-header {
  height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.agent-info {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.agent-status {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;

  &.loading {
    background: #eab308;
    box-shadow: 0 0 8px #eab308;
    animation: pulse 1.5s infinite;
  }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
