<template>
    <div class="admin-monitoring">
        <div class="page-header">
            <div>
                <h1>System Monitoring</h1>
                <p class="subtitle">Real-time resource analytics and system health.</p>
            </div>
            <div class="flex gap-2">
                <button class="primary-btn secondary" @click="showSupportDialog = true">
                    <help theme="outline" size="20" />
                    Tactical Support
                </button>
                <button class="primary-btn secondary" @click="exportDiagnostics" :loading="exporting">
                    <terminal theme="outline" size="20" />
                    Export Diagnostics
                </button>
                <button class="primary-btn secondary" @click="showSettings = !showSettings">
                    <setting-config theme="outline" size="20" />
                    Settings
                </button>
                <button class="primary-btn delete" @click="clearLogs">
                    <delete theme="outline" size="20" />
                    Clear Logs
                </button>
            </div>
        </div>

        <!-- Settings Panel -->
        <div v-if="showSettings" class="cinematic-card settings-panel animate-in">
            <h3>Monitoring Configuration</h3>
            <div class="settings-grid">
                <div class="setting-item">
                    <label>Email Alerts</label>
                    <div class="flex items-center gap-2">
                        <el-switch v-model="settings.emailNotificationsEnabled" @change="saveSettings" />
                        <span class="text-xs opacity-60">{{ settings.emailNotificationsEnabled ? 'ACTIVE' : 'INACTIVE'
                        }}</span>
                    </div>
                </div>
                <div class="setting-item">
                    <label>Recipient Email</label>
                    <input type="email" v-model="settings.notificationEmail" placeholder="admin@example.com"
                        class="dark-input" @blur="saveSettings" />
                </div>
                <div class="setting-item">
                    <label>Alert Level</label>
                    <select v-model="settings.minNotificationLevel" class="dark-select" @change="saveSettings">
                        <option value="error">Error Only</option>
                        <option value="warn">Warning + Error</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label>Log Retention</label>
                    <div class="flex items-center gap-2">
                        <input type="number" v-model.number="settings.retentionDays" class="dark-input w-24"
                            @blur="saveSettings" />
                        <span class="text-xs opacity-60">DAYS</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Resource Cards -->
        <div class="resource-cards mb-6">
            <div class="cinematic-card stat-card">
                <div class="flex justify-between items-start mb-4">
                    <div class="label">CPU USAGE</div>
                    <cpu theme="outline" size="18" class="opacity-50" />
                </div>
                <div class="value">{{ stats.cpuUsage }}%</div>
                <div class="progress-pill-container mt-4">
                    <div class="progress-pill-bar" :style="{ width: stats.cpuUsage + '%' }"
                        :class="getBarClass(stats.cpuUsage)"></div>
                </div>
            </div>

            <div class="cinematic-card stat-card">
                <div class="flex justify-between items-start mb-4">
                    <div class="label">RAM (ACTIVE)</div>
                    <memory theme="outline" size="18" class="opacity-50" />
                </div>
                <div class="value">{{ formatBytes(stats.memory.used) }} / {{ formatBytes(stats.memory.total) }}</div>
                <div class="progress-pill-container mt-4">
                    <div class="progress-pill-bar"
                        :style="{ width: (stats.memory.used / stats.memory.total * 100) + '%' }"
                        :class="getBarClass(stats.memory.used / stats.memory.total * 100)"></div>
                </div>
            </div>

            <div class="cinematic-card stat-card">
                <div class="flex justify-between items-start mb-4">
                    <div class="label">DISK SPACE</div>
                    <folder-open theme="outline" size="18" class="opacity-50" />
                </div>
                <div class="value">{{ formatBytes(stats.disk.used) }} / {{ formatBytes(stats.disk.total) }}</div>
                <div class="progress-pill-container mt-4">
                    <div class="progress-pill-bar" :style="{ width: (stats.disk.used / stats.disk.total * 100) + '%' }"
                        :class="getBarClass(stats.disk.used / stats.disk.total * 100)"></div>
                </div>
            </div>

            <div class="cinematic-card stat-card">
                <div class="flex justify-between items-start mb-4">
                    <div class="label">NETWORK (THROUGHPUT)</div>
                    <connection theme="outline" size="18" class="opacity-50" />
                </div>
                <div class="value">
                    <div class="flex gap-4 text-xs">
                        <span class="text-green-400">RX: {{ formatBytes(stats.network.rx_sec) }}/s</span>
                        <span class="text-blue-400">TX: {{ formatBytes(stats.network.tx_sec) }}/s</span>
                    </div>
                </div>
                <div class="text-[9px] opacity-40 mt-2">TOTAL: IN {{ formatBytes(stats.network.rx_bytes) }} | OUT {{
                    formatBytes(stats.network.tx_bytes) }}</div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-grid mb-6">
            <div class="cinematic-card chart-card">
                <div class="chart-header">
                    <h3>CPU & RAM Trends (Last Hour)</h3>
                </div>
                <div class="chart-container">
                    <Line v-if="chartData" :data="chartData.resources" :options="chartOptions" />
                </div>
            </div>
            <div class="cinematic-card chart-card">
                <div class="chart-header">
                    <h3>Network Activity (Last Hour)</h3>
                </div>
                <div class="chart-container">
                    <Line v-if="chartData" :data="chartData.network" :options="chartOptions" />
                </div>
            </div>
        </div>

        <!-- Logs Section -->
        <div class="monitoring-tabs">
            <div class="tabs-header">
                <button :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">System Logs</button>
                <button :class="{ active: activeTab === 'client' }" @click="activeTab = 'client'">Client Errors</button>
                <button :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">Analytics</button>
            </div>

            <div v-if="activeTab === 'logs'" class="logs-section animate-in">
                <!-- Toolbar -->
                <div class="logs-toolbar flex justify-between items-center mb-4">
                    <div class="flex gap-4 items-center">
                        <select v-model="logFilter.level" class="dark-select sm" @change="() => fetchLogs()">
                            <option value="all">All Levels</option>
                            <option value="debug">Debug</option>
                            <option value="info">Normal</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                        </select>
                        <div class="search-box">
                            <input v-model="logFilter.search" placeholder="Search keywords..."
                                class="dark-input sm w-64" @input="debounceFetchLogs" />
                        </div>
                    </div>
                    <div class="flex gap-4 items-center">
                        <el-switch v-model="autoRefresh" size="small" />
                        <span class="text-[10px] opacity-40 uppercase font-bold">{{ totalLogs }} Records</span>
                    </div>
                </div>

                <!-- Console -->
                <div class="console-box cinematic-card" ref="consoleRef">
                    <div v-for="log in logs" :key="log._id" :class="['log-line', log.level]">
                        <span class="timestamp">[{{ formatTimestamp(log.timestamp) }}]</span>
                        <span class="level">[{{ log.level.toUpperCase() }}]</span>
                        <span class="source">[{{ log.source }}]</span>
                        <span class="message">{{ log.message }}</span>
                        <div v-if="log.metadata" class="meta-toggle" @click="toggleMeta(log._id)">{{
                            expandedMeta.has(log._id) ? '[-]' : '[+]' }}</div>
                        <pre v-if="expandedMeta.has(log._id)"
                            class="meta-block">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
                    </div>
                    <div v-if="!logs.length" class="empty-state">No records found.</div>
                </div>

                <div class="flex justify-center mt-4">
                    <el-pagination v-model:current-page="logFilter.page" :page-size="100" layout="prev, pager, next"
                        :total="totalLogs" @current-change="() => fetchLogs()" background small />
                </div>
            </div>

            <div v-else-if="activeTab === 'client'" class="client-logs-section animate-in">
                <div class="console-box cinematic-card">
                    <div v-for="log in clientLogs" :key="log._id" class="log-line error">
                        <span class="timestamp">[{{ formatTimestamp(log.timestamp) }}]</span>
                        <span class="level">[{{ log.type.toUpperCase() }}]</span>
                        <span class="source">[{{ log.url }}]</span>
                        <span class="message">{{ log.details?.message || 'Error' }}</span>
                        <div class="meta-toggle" @click="toggleMeta(log._id)">{{ expandedMeta.has(log._id) ? '[-]' :
                            '[+]' }}</div>
                        <pre v-if="expandedMeta.has(log._id)"
                            class="meta-block">{{ JSON.stringify(log.details, null, 2) }}</pre>
                    </div>
                    <div v-if="!clientLogs.length" class="empty-state">No client errors detected.</div>
                </div>
            </div>

            <div v-else class="errors-section animate-in">
                <div class="cinematic-card p-6">
                    <!-- Simple placeholder for error distribution -->
                    <p class="opacity-40">Coming soon: Heatmap and HTTP error frequency reports.</p>
                </div>
            </div>
        </div>

        <!-- Support Ticket Dialog -->
        <SupportTicketDialog v-model="showSupportDialog" :stats="stats" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch, computed } from 'vue';
import { SettingConfig, Delete, Cpu, Memory, FolderOpen, Connection, Loading, Terminal, Help } from '@icon-park/vue-next';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import axios from 'axios';
import { toast } from 'vue-sonner';
import SupportTicketDialog from '@/components/SupportTicketDialog.vue';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// State
const activeTab = ref('logs');
const stats = reactive({
    cpuUsage: 0,
    memory: { used: 0, total: 0 },
    disk: { used: 0, total: 0 },
    network: { tx_bytes: 0, rx_bytes: 0, tx_sec: 0, rx_sec: 0 }
});
const history = ref<any[]>([]);
const logs = ref<any[]>([]);
const clientLogs = ref<any[]>([]);
const totalLogs = ref(0);
const autoRefresh = ref(true);
const exporting = ref(false);
const showSettings = ref(false);
const showSupportDialog = ref(false);
const expandedMeta = ref(new Set<string>());
const consoleRef = ref<HTMLElement | null>(null);

const logFilter = reactive({ level: 'all', search: '', page: 1 });
const settings = reactive({ emailNotificationsEnabled: false, notificationEmail: '', minNotificationLevel: 'error', retentionDays: 30 });

// Intervals
let statsTimer: any = null;
let historyTimer: any = null;
let logsTimer: any = null;
let debounceTimer: any = null;

// Methods
const fetchStats = async () => {
    try {
        const res = await axios.get('/api/admin/monitoring/stats');
        Object.assign(stats, res.data.data);
    } catch (e) { }
};

const fetchHistory = async () => {
    try {
        const res = await axios.get('/api/admin/monitoring/history?limit=60');
        history.value = res.data.data;
    } catch (e) { }
};

const fetchLogs = async (silent = false) => {
    try {
        const [res, clientRes] = await Promise.all([
            axios.get('/api/admin/monitoring/logs', { params: logFilter }),
            axios.get('/api/admin/monitoring/client-logs')
        ]);
        logs.value = res.data.data.logs;
        totalLogs.value = res.data.data.total;
        clientLogs.value = clientRes.data.data;
    } catch (e) {
        if (!silent) toast.error('Failed to load logs');
    }
};

const exportDiagnostics = async () => {
    exporting.value = true;
    try {
        await axios.get('/api/admin/monitoring/export-diagnostics');
        toast.success('Diagnostic bundle sent to developer (dmtan90@gmail.com)');
    } catch (e) {
        toast.error('Failed to export diagnostics');
    } finally {
        exporting.value = false;
    }
};

const fetchSettings = async () => {
    try {
        const res = await axios.get('/api/admin/monitoring/settings');
        if (res.data.data) Object.assign(settings, res.data.data);
    } catch (e) { }
};

const saveSettings = async () => {
    try {
        await axios.patch('/api/admin/monitoring/settings', settings);
        toast.success('Monitoring settings updated');
    } catch (e) { toast.error('Failed to save settings'); }
};

const clearLogs = async () => {
    if (!confirm('Clear all system logs?')) return;
    try {
        await axios.delete('/api/admin/monitoring/logs');
        logs.value = [];
        toast.success('Logs cleared');
    } catch (e) { }
};

const debounceFetchLogs = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { logFilter.page = 1; fetchLogs(); }, 500);
};

const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

const toggleMeta = (id: string) => {
    if (expandedMeta.value.has(id)) expandedMeta.value.delete(id);
    else expandedMeta.value.add(id);
};

const getBarClass = (p: number) => {
    if (p > 90) return 'red';
    if (p > 70) return 'amber';
    return 'blue';
};

// Charts configuration
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 }, point: { radius: 0 } },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
        x: { display: false },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 } }
        }
    }
} as any;

const chartData = computed(() => {
    if (!history.value.length) return null;
    const labels = history.value.map(h => formatTimestamp(h.timestamp));

    return {
        resources: {
            labels,
            datasets: [
                { label: 'CPU %', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', data: history.value.map(h => h.cpuUsage), fill: true },
                { label: 'RAM %', borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', data: history.value.map(h => (h.memory.used / h.memory.total * 100)), fill: true }
            ]
        },
        network: {
            labels,
            datasets: [
                { label: 'Net RX', borderColor: '#60a5fa', data: history.value.map(h => h.network.rx_sec || 0) },
                { label: 'Net TX', borderColor: '#f87171', data: history.value.map(h => h.network.tx_sec || 0) }
            ]
        }
    };
});

watch(autoRefresh, (val) => {
    if (val) startPolling();
    else stopPolling();
});

const startPolling = () => {
    statsTimer = setInterval(fetchStats, 3000);
    historyTimer = setInterval(fetchHistory, 10000);
    logsTimer = setInterval(() => fetchLogs(true), 10000);
};

const stopPolling = () => {
    clearInterval(statsTimer);
    clearInterval(historyTimer);
    clearInterval(logsTimer);
};

onMounted(() => {
    fetchStats();
    fetchHistory();
    fetchLogs();
    fetchSettings();
    if (autoRefresh.value) startPolling();
});

onUnmounted(() => stopPolling());
</script>

<style lang="scss" scoped>
.admin-monitoring {
    padding: 24px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;

    h1 {
        font-size: 24px;
        font-weight: 800;
        color: #fff;
        margin: 0;
    }

    .subtitle {
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        margin-top: 4px;
    }
}

.resource-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;

    .stat-card {
        padding: 24px;

        .label {
            font-size: 10px;
            font-weight: 900;
            color: rgba(255, 255, 255, 0.3);
            letter-spacing: 1px;
        }

        .value {
            font-size: 22px;
            font-weight: 800;
            color: #fff;
            font-family: 'Fira Code', monospace;
        }
    }
}

.charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    .chart-card {
        padding: 24px;
        height: 300px;
        display: flex;
        flex-direction: column;

        .chart-header h3 {
            font-size: 12px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.5);
            margin: 0 0 16px 0;
            text-transform: uppercase;
        }

        .chart-container {
            flex: 1;
            min-height: 0;
        }
    }
}

.monitoring-tabs {
    .tabs-header {
        display: flex;
        gap: 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        margin-bottom: 24px;

        button {
            background: none;
            border: none;
            padding: 12px 0;
            color: rgba(255, 255, 255, 0.3);
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;

            &:hover {
                color: #fff;
            }

            &.active {
                color: #3b82f6;

                &::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #3b82f6;
                }
            }
        }
    }
}

.console-box {
    background: #070707 !important;
    height: 500px;
    overflow-y: auto;
    padding: 20px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.6;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .log-line {
        margin-bottom: 4px;
        white-space: pre-wrap;
        word-break: break-all;
        padding: 2px 8px;
        border-radius: 4px;

        .timestamp {
            color: #444;
            margin-right: 8px;
        }

        .level {
            font-weight: 800;
            margin-right: 12px;
            font-size: 11px;
        }

        .source {
            color: #3b82f6;
            margin-right: 12px;
            opacity: 0.6;
        }

        .message {
            color: #ccc;
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
                color: #f59e0b;
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
            opacity: 0.4;
        }
    }
}

.meta-toggle {
    display: inline-block;
    font-size: 10px;
    color: #3b82f6;
    cursor: pointer;
    margin-left: 10px;
    opacity: 0.5;

    &:hover {
        opacity: 1;
    }
}

.meta-block {
    margin: 10px 0 10px 24px;
    padding: 15px;
    background: #111;
    border-radius: 8px;
    color: #888;
    font-size: 11px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.settings-panel {
    padding: 32px;
    margin-bottom: 24px;
    border: 1px solid rgba(59, 130, 246, 0.3);

    h3 {
        margin: 0 0 24px 0;
        font-size: 16px;
        color: #fff;
    }

    .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 32px;
    }

    .setting-item {
        display: flex;
        flex-direction: column;
        gap: 10px;

        label {
            font-size: 11px;
            font-weight: 900;
            color: rgba(255, 255, 255, 0.3);
            text-transform: uppercase;
        }
    }
}

.progress-pill-container {
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;

    .progress-pill-bar {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);

        &.blue {
            background: #3b82f6;
        }

        &.amber {
            background: #f59e0b;
        }

        &.red {
            background: #ef4444;
        }
    }
}

.dark-input,
.dark-select {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #fff;
    padding: 10px 14px;
    font-size: 13px;

    &.sm {
        padding: 6px 12px;
        font-size: 12px;
        border-radius: 8px;
    }

    &:focus {
        border-color: #3b82f6;
        outline: none;
        background: rgba(255, 255, 255, 0.06);
    }
}

.primary-btn {
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;

    &.secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    }

    &.delete {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;

        &:hover {
            background: #ef4444;
            color: #fff;
        }
    }
}
</style>
