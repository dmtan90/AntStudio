<template>
  <div class="admin-logs">
    <div class="page-header">
      <div>
        <h1>{{ $t('admin.logs.title') }}</h1>
        <p class="subtitle">{{ $t('admin.logs.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button class="primary-btn secondary" @click="showSettings = !showSettings">
          <setting-config theme="outline" size="20" />
          {{ $t('admin.logs.logSettings') }}
        </button>
        <button class="primary-btn delete" @click="clearLogs">
          <delete theme="outline" size="20" />
          {{ $t('admin.logs.clearLogs') }}
        </button>
      </div>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="cinematic-card settings-panel animate-in">
      <h3>{{ $t('admin.logs.notificationRules') }}</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <label>{{ $t('admin.logs.enableEmailAlerts') }}</label>
          <div class="flex items-center gap-2">
            <el-switch v-model="settings.emailNotificationsEnabled" @change="saveSettings" />
            <span class="text-xs opacity-60">{{ settings.emailNotificationsEnabled ? $t('admin.logs.active') : $t('admin.logs.inactive') }}</span>
          </div>
        </div>
        <div class="setting-item">
          <label>{{ $t('admin.logs.recipientEmail') }}</label>
          <input type="email" v-model="settings.notificationEmail" :placeholder="t('admin.logs.recipientEmail')" class="dark-input"
            @blur="saveSettings" />
        </div>
        <div class="setting-item">
          <label>{{ $t('admin.logs.minAlertLevel') }}</label>
          <select v-model="settings.minNotificationLevel" class="dark-select" @change="saveSettings">
            <option value="error">{{ $t('admin.logs.alertLevels.error') }}</option>
            <option value="warn">{{ $t('admin.logs.alertLevels.warn') }}</option>
            <option value="info">{{ $t('admin.logs.alertLevels.info') }}</option>
          </select>
        </div>
        <div class="setting-item">
          <label>{{ $t('admin.logs.logRetention') }}</label>
          <div class="flex items-center gap-2">
            <input type="number" v-model.number="settings.retentionDays" min="1" max="365" class="dark-input w-24"
              @blur="saveSettings" />
            <span class="text-xs opacity-60">{{ $t('admin.logs.days') }}</span>
          </div>
        </div>
      </div>
      <p class="settings-hint">{{ $t('admin.logs.settingsHint') }}</p>
    </div>

    <div class="logs-content">
      <!-- Toolbar -->
      <div class="logs-toolbar">
        <div class="flex gap-4 items-center">
          <div class="filter-group">
            <label>{{ $t('admin.logs.level') }}</label>
            <select v-model="filter.level" class="dark-select" @change="fetchLogs">
              <option value="all">{{ $t('admin.logs.allLevels') }}</option>
              <option value="debug">{{ $t('admin.logs.debug') }}</option>
              <option value="info">{{ $t('admin.logs.normal') }}</option>
              <option value="warn">{{ $t('admin.logs.warning') }}</option>
              <option value="error">{{ $t('admin.logs.error') }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>{{ $t('admin.logs.search') }}</label>
            <div class="search-box">
              <search theme="outline" size="14" class="search-icon" />
              <input v-model="filter.search" :placeholder="t('admin.logs.searchPlaceholder')" class="dark-input search-input"
                @input="debounceFetch" />
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="auto-refresh">
            <label>{{ $t('admin.logs.autoRefresh') }}</label>
            <el-switch v-model="autoRefresh" size="small" />
          </div>
          <span class="log-count">{{ $t('admin.logs.recordsFound', { count: totalLogs }) }}</span>
        </div>
      </div>

      <!-- Console Output -->
      <div class="console-wrapper cinematic-card" ref="consoleRef">
        <div v-if="loading && !logs.length" class="loading-overlay">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>{{ $t('admin.logs.connecting') }}</span>
        </div>
        <div v-else-if="!logs.length" class="empty-logs">
          <terminal theme="outline" size="48" />
          <p>{{ $t('admin.logs.noLogs') }}</p>
        </div>
        <div v-else class="console-lines">
          <div v-for="log in logs" :key="log._id" :class="['log-line', log.level]">
            <span class="timestamp">[{{ formatTimestamp(log.timestamp) }}]</span>
            <span class="level">[{{ log.level.toUpperCase() }}]</span>
            <span class="source">[{{ log.source }}]</span>
            <span class="message">{{ log.message }}</span>
            <div v-if="log.metadata" class="metadata-toggle" @click="toggleMetadata(log._id)">
              {{ expandedMetadata.has(log._id) ? t('admin.logs.collapse') : t('admin.logs.viewMetadata') }}
            </div>
            <pre v-if="expandedMetadata.has(log._id)"
              class="metadata-block">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-footer">
        <el-pagination v-model:current-page="filter.page" :page-size="100" layout="prev, pager, next" :total="totalLogs"
          @update:current-page="fetchLogs" background small />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SettingConfig, Delete, Search, Loading, Terminal } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useAdminStore } from '@/stores/admin';

const { t } = useI18n()
const adminStore = useAdminStore();
const logs = ref<any[]>([]);
const totalLogs = ref(0);
const loading = ref(false);
const autoRefresh = ref(true);
const showSettings = ref(false);
const expandedMetadata = ref(new Set<string>());
const consoleRef = ref<HTMLElement | null>(null);

const filter = reactive({
  level: 'all',
  search: '',
  page: 1
});

const settings = reactive({
  emailNotificationsEnabled: false,
  notificationEmail: '',
  minNotificationLevel: 'error',
  retentionDays: 30
});

let timer: any = null;
let debounceTimer: any = null;

const fetchLogs = async (silent: any = false) => {
  const isSilent = typeof silent === 'boolean' ? silent : false;
  if (!isSilent) loading.value = true;
  try {
    const data = await adminStore.fetchSystemLogs(filter);
    if (data) {
      logs.value = data.logs;
      totalLogs.value = data.total;
    }
  } catch (e) {
    if (!isSilent) toast.error(t('admin.logs.toasts.loadLogsFailed'));
  } finally {
    if (!isSilent) loading.value = false;
  }
};

const debounceFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    filter.page = 1;
    fetchLogs();
  }, 500);
};

const fetchSettings = async () => {
  try {
    const data = await adminStore.fetchLogSettings();
    if (data) {
      Object.assign(settings, data);
    }
  } catch (e) { }
};

const saveSettings = async () => {
  try {
    await adminStore.updateLogSettings(settings);
    // toast handled by store or here
  } catch (e) {
    toast.error(t('admin.logs.toasts.saveSettingsFailed'));
  }
};

const clearLogs = async () => {
  if (!confirm(t('admin.logs.confirmClear'))) return;
  try {
    await adminStore.clearSystemLogs();
    logs.value = [];
    totalLogs.value = 0;
  } catch (e) {
    toast.error(t('admin.logs.toasts.clearLogsFailed'));
  }
};

const formatTimestamp = (ts: string) => {
  return new Date(ts).toLocaleString();
};

const toggleMetadata = (id: string) => {
  if (expandedMetadata.value.has(id)) expandedMetadata.value.delete(id);
  else expandedMetadata.value.add(id);
};

watch(autoRefresh, (val) => {
  if (val) startPolling();
  else stopPolling();
});

const startPolling = () => {
  stopPolling();
  timer = setInterval(() => fetchLogs(true), 5000);
};

const stopPolling = () => {
  if (timer) clearInterval(timer);
};

onMounted(() => {
  fetchLogs();
  fetchSettings();
  if (autoRefresh.value) startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style lang="scss" scoped>
.admin-logs {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin-top: 4px;
  }
}

.settings-panel {
  margin-bottom: 24px;
  padding: 24px;
  border: 1px solid rgba(59, 130, 246, 0.2);

  h3 {
    margin: 0 0 20px 0;
    font-size: 16px;
    color: #fff;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
    }
  }

  .settings-hint {
    margin-top: 20px;
    font-size: 12px;
    color: rgba(59, 130, 246, 0.6);
    font-style: italic;
  }
}

.logs-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);

  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .search-box {
    position: relative;

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.4;
    }

    .search-input {
      padding-left: 32px;
      width: 240px;
    }
  }

  .auto-refresh {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .log-count {
    font-size: 11px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.3);
  }
}

.console-wrapper {
  flex: 1;
  background: #0a0a0a !important;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 500px;
  position: relative;
}

.console-lines {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-family: 'Fira Code', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-line {
  margin-bottom: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  transition: background 0.1s;
  padding: 2px 8px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .timestamp {
    color: #555;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .level {
    font-weight: 800;
    margin-right: 8px;
    width: 60px;
    display: inline-block;
  }

  .source {
    color: #3b82f6;
    margin-right: 12px;
    opacity: 0.8;
  }

  .message {
    color: #ddd;
  }

  &.info .level {
    color: #10b981;
  }

  &.warn {
    background: rgba(245, 158, 11, 0.03);

    .level {
      color: #f59e0b;
    }

    .message {
      color: #fbbf24;
    }
  }

  &.error {
    background: rgba(239, 68, 68, 0.05);

    .level {
      color: #ef4444;
    }

    .message {
      color: #f87171;
    }
  }

  &.debug {
    opacity: 0.5;

    .level {
      color: #8b5cf6;
    }
  }
}

.metadata-toggle {
  display: inline-block;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.metadata-block {
  margin: 8px 0 8px 24px;
  padding: 12px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 11px;
  color: #888;
}

.loading-overlay,
.empty-logs {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding: 40px;
}

.pagination-footer {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  padding: 8px;
}

.dark-input,
.dark-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
}

.primary-btn {
  &.delete {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);

    &:hover {
      background: #ef4444;
      color: #fff;
    }
  }
}

/* Scrollbar styling */
.console-lines::-webkit-scrollbar {
  width: 8px;
}

.console-lines::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.console-lines::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.console-lines::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
