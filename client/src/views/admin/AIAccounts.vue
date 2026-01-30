<template>
  <div class="admin-ai-accounts">
    <div class="page-header">
      <div>
        <h1>AI Account Manager</h1>
        <p class="subtitle">Manage multi-account pool and monitor model quotas.</p>
      </div>
      <div class="flex gap-2">
        <button class="primary-btn secondary" @click="addAccount(true)">
          <gemini theme="outline" size="20" />
          Antigravity
        </button>
        <button class="primary-btn labs" @click="add11LabsAccount">
          <brain theme="outline" size="20" />
          11Labs
        </button>
        <button class="primary-btn" @click="addAccount(false)">
          <plus theme="outline" size="20" />
          Google
        </button>
      </div>
    </div>

    <div class="accounts-content">
      <!-- Stats Overview -->
      <div class="stats-overview">
        <div class="cinematic-card stats-card">
          <label>Total Accounts</label>
          <div class="value">{{ accounts.length }}</div>
        </div>
        <div class="cinematic-card stats-card">
          <label>Active</label>
          <div class="value text-green">{{ activeAccounts.length }}</div>
        </div>
        <div class="cinematic-card stats-card">
          <label>Rate Limited</label>
          <div class="value text-amber">{{ limitedAccounts.length }}</div>
        </div>
        <div class="cinematic-card stats-card">
          <label>Errors</label>
          <div class="value text-red">{{ errorAccounts.length }}</div>
        </div>
      </div>

      <!-- Account Grid -->
      <div v-if="!loading && accounts.length > 0" class="account-grid">
        <div v-for="account in accounts" :key="account._id"
          :class="['cinematic-card account-card group', { 'inactive-card': account.isActive === false }]">
          <!-- Card Header -->
          <div class="card-header">
            <div class="user-info">
              <div class="avatar-circle" :style="{ background: getAvatarColor(account.email) }">
                <img v-if="account.avatarUrl" :src="getFileUrl(account.avatarUrl)" class="avatar-img" />
                <span v-else>{{ getInitials(account.email) }}</span>
              </div>
              <div class="details">
                <div class="email-row">
                  <div class="email" :title="account.email">{{ account.email }}</div>
                  <!-- <div class="account-type no-wrap">
                    <span v-if="account.accountType === 'antigravity'" class="ag-badge">ANTIGRAVITY</span>
                    <span v-else-if="account.accountType === '11labs-direct'" class="ag-badge labs">11LABS DIRECT</span>
                    <span v-else-if="account.accountType === 'google'" class="ag-badge google">GOOGLE</span>
                    
                  </div> -->
                </div>
                <div class="status">
                  <span v-if="account.accountType === 'antigravity'" class="ag-badge">ANTIGRAVITY</span>
                  <span v-else-if="account.accountType === '11labs-direct'" class="ag-badge labs">11LABS DIRECT</span>
                  <span v-else class="ag-badge google">GOOGLE</span>
                  <span :class="['status-dot', account.status, { 'inactive-dot': account.isActive === false }]"></span>
                  <span class="status-text">{{ account.isActive !== false ? account.status.toUpperCase() : 'DISABLED'
                  }}</span>
                </div>
              </div>
            </div>
            <div class="actions">
              <button :class="['icon-btn', { 'active-power': account.isActive !== false }]"
                @click="toggleActive(account)"
                :title="account.isActive !== false ? 'Disable Account' : 'Enable Account'">
                <power theme="outline" size="16" />
              </button>
              <button class="icon-btn" @click="syncAccount(account._id)" title="Sync Quota">
                <refresh theme="outline" size="16" />
              </button>
              <button class="icon-btn delete" @click="deleteAccount(account._id)" title="Remove Account">
                <delete theme="outline" size="16" />
              </button>
            </div>
          </div>

          <!-- Quotas -->
          <div class="quotas-list">
            <!-- Priority Models -->
            <div v-for="(quota, model) in getPriorityQuotas(account)" :key="model" class="quota-item">
              <div class="quota-header">
                <span class="model-name">
                  <component :is="getModelIcon(model as string)" theme="outline" size="12" class="mr-1-5 opacity-70" />
                  {{ cleanModelName(model as string) }}
                </span>
                <span class="quota-values" :class="getRemainingColorClass(quota)">
                  {{ quota.limit - quota.used }}/{{ quota.limit }} left ({{ Math.round(calculateRemaining(quota)) }}%)
                </span>
              </div>
              <div class="progress-pill-container">
                <div class="progress-pill-bar" :style="{ width: calculateRemaining(quota) + '%' }"
                  :class="getRemainingBarClass(quota)"></div>
              </div>
            </div>

            <!-- Collapsible Section -->
            <div v-if="account.quotas && Object.keys(account.quotas).length > 3">
              <button class="collapse-toggle" @click="toggleExpand(account._id)">
                <span>{{ isExpanded(account._id) ? 'SHOW LESS' : `+ ${Object.keys(account.quotas).length - 3} MORE
                  MODELS` }}</span>
                <down v-if="!isExpanded(account._id)" theme="outline" size="12" />
                <up v-else theme="outline" size="12" />
              </button>

              <div v-if="isExpanded(account._id)" class="expanded-quotas mt-4 space-y-4">
                <div v-for="(quota, model) in getSecondaryQuotas(account)" :key="model" class="quota-item animate-in">
                  <div class="quota-header">
                    <span class="model-name">
                      <component :is="getModelIcon(model as string)" theme="outline" size="12"
                        class="mr-1-5 opacity-40" />
                      {{ cleanModelName(model as string) }}
                    </span>
                    <span class="quota-values text-[9px] opacity-60">
                      {{ quota.limit - quota.used }}/{{ quota.limit }} ({{ Math.round(calculateRemaining(quota)) }}%)
                    </span>
                  </div>
                  <div class="progress-pill-container h-1">
                    <div class="progress-pill-bar" :style="{ width: calculateRemaining(quota) + '%' }"
                      :class="getRemainingBarClass(quota)"></div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!Object.keys(account.quotas || {}).length" class="empty-quotas">
              No active quotas tracked yet.
            </div>
          </div>

          <!-- Card Footer -->
          <div class="card-footer">
            <div class="project-info">
              <span class="label">PRJ:</span>
              <span class="value" @click="copyText(account.projectId)">{{ account.projectId || 'N/A' }}</span>

              <div class="footer-actions ml-2" v-if="account.accountType === 'google'">
                <copy v-if="account.projectId" theme="outline" size="12" class="footer-icon"
                  @click="copyText(account.projectId)" title="Copy ID" />

                <edit theme="outline" size="12" class="footer-icon" @click="editProjectId(account)"
                  title="Edit Project ID" />

                <el-icon v-if="isCreatingProject === account._id" class="is-loading footer-icon">
                  <Loading />
                </el-icon>
                <plus v-else theme="outline" size="12" class="footer-icon" @click="createNewProject(account)"
                  title="Create New Project" />

                <a v-if="account.projectId"
                  :href="`https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${account.projectId}`"
                  target="_blank" class="enable-link" title="Enable Vertex AI API">
                  ENABLE API
                </a>
                <a v-if="account.projectId"
                  :href="`https://console.cloud.google.com/billing/enable?project=${account.projectId}`" target="_blank"
                  class="enable-link billing" title="Enable Billing for this project">
                  ENABLE BILLING
                </a>
              </div>
            </div>
            <div class="usage-info">
              <span class="label">USED:</span>
              <span class="value">{{ formatDate(account.lastUsedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && accounts.length === 0" class="empty-state">
        <wallet theme="outline" size="48" />
        <h3>No AI Accounts Found</h3>
        <p>Connect your first Google account to start using the multi-account pool.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>Fetching account data...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Plus, User, Refresh, Delete, Wallet, Copy, Loading, Gemini, Brain, VideoTwo, Pic, Down, Up, Power, Edit } from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';

const route = useRoute();
const loading = ref(true);
const accounts = ref<any[]>([]);
const expandedIds = ref<Set<string>>(new Set());
let refreshInterval: any = null;
let success = route.query.success;
let message = route.query.message;

const activeAccounts = computed(() => accounts.value.filter(a => a.status === 'ready' && a.isActive !== false));
const limitedAccounts = computed(() => accounts.value.filter(a => a.status === 'rate-limited'));
const errorAccounts = computed(() => accounts.value.filter(a => a.status === 'error' || a.status === 'unauthorized'));

const isCreatingProject = ref<string | null>(null);

const toggleActive = async (account: any) => {
  try {
    const newState = account.isActive === false ? true : false;
    await axios.patch(`/api/admin/ai/accounts/${account._id}`, { isActive: newState });
    account.isActive = newState;
    toast.success(`Account ${newState ? 'enabled' : 'disabled'}`);
  } catch (e) {
    toast.error('Failed to toggle account state');
  }
};

const editProjectId = async (account: any) => {
  const newId = prompt('Enter new Google Cloud Project ID:', account.projectId || '');
  if (newId === null || newId === account.projectId) return;

  try {
    await axios.patch(`/api/admin/ai/accounts/${account._id}`, { projectId: newId });
    account.projectId = newId;
    toast.success('Project ID updated');
  } catch (e) {
    toast.error('Failed to update Project ID');
  }
};

const createNewProject = async (account: any) => {
  if (!confirm('Are you sure you want to create a new Google Cloud Project for this account?')) return;

  isCreatingProject.value = account._id;
  try {
    const res = await axios.post(`/api/admin/ai/accounts/${account._id}/create-project`);
    account.projectId = res.data.data.projectId;
    toast.success('New project created successfully');
  } catch (e: any) {
    toast.error(e.response?.data?.error || 'Project creation failed');
  } finally {
    isCreatingProject.value = null;
  }
};

const priorityKeywords = [
  'GEMINI 3.0 PRO',
  'IMAGEN 4',
  'VEO 3.1'
];

const getPriorityQuotas = (account: any) => {
  if (!account.quotas) return {};
  const priority: any = {};
  const quotaKeys = Object.keys(account.quotas);

  // Match official targets by keyword
  priorityKeywords.forEach(keyword => {
    const match = quotaKeys.find(key => {
      const cleanName = cleanModelName(key);
      return cleanName.includes(keyword);
    });
    if (match) priority[match] = account.quotas[match];
  });

  // If we have less than 3 priority models, fill with Gemini 3 Flash / 2.5 etc.
  if (Object.keys(priority).length < 3) {
    const fallbacks = ['GEMINI 3.0 FLASH', 'GEMINI 2.5 PRO', 'GEMINI 1.5 PRO'];
    fallbacks.forEach(kw => {
      if (Object.keys(priority).length < 3) {
        const match = quotaKeys.find(key => cleanModelName(key).includes(kw) && !priority[key]);
        if (match) priority[match] = account.quotas[match];
      }
    });
  }

  // Final fill to 3 items if still empty
  if (Object.keys(priority).length < 3) {
    quotaKeys.forEach(key => {
      if (Object.keys(priority).length < 3 && !priority[key]) {
        priority[key] = account.quotas[key];
      }
    });
  }

  return priority;
};

const getSecondaryQuotas = (account: any) => {
  const priority = getPriorityQuotas(account);
  const secondary: any = {};
  Object.keys(account.quotas).forEach(key => {
    if (!priority[key]) secondary[key] = account.quotas[key];
  });
  return secondary;
};

const toggleExpand = (id: string) => {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id);
  else expandedIds.value.add(id);
};

const isExpanded = (id: string) => expandedIds.value.has(id);

const fetchAccounts = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    const res = await axios.get('/api/admin/ai/accounts');
    accounts.value = res.data.data;
  } catch (e: any) {
    if (!silent) toast.error('Failed to load AI accounts');
  } finally {
    if (!silent) loading.value = false;
  }
};

const addAccount = async (isAntigravity = false) => {
  try {
    const res = await axios.get(`/api/admin/ai/accounts/auth-url?isAntigravity=${isAntigravity}`);
    window.location.href = res.data.data.url;
  } catch (e) {
    toast.error('Could not initiate OAuth flow');
  }
};

const add11LabsAccount = async () => {
  const email = prompt('1. Enter 11Labs Account Email:');
  if (!email) return;
  const licenseKey = prompt('2. (Optional) Enter License Key:');
  // // if (!licenseKey) return;
  // const token = prompt('3. (Optional) Enter Google Bearer Token if you have it (for direct compute bypass):');
  const token = undefined;
  try {
    toast.info('Integrating 11Labs account...');
    await axios.post('/api/admin/ai/accounts/direct', {
      email,
      // licenseKey,
      accessToken: token || undefined,
      accountType: '11labs-direct',
      providerId: '11labs'
    });
    await fetchAccounts(true);
    toast.success('11Labs account integrated with Quota Bypass active');
  } catch (e: any) {
    toast.error(e.response?.data?.error || 'Failed to add account');
  }
};

const syncAccount = async (id: string) => {
  try {
    toast.info('Syncing status...');
    await axios.post(`/api/admin/ai/accounts/${id}/sync`);
    await fetchAccounts(true);
    toast.success('Account synced successfully');
  } catch (e) {
    toast.error('Sync failed');
  }
};

const deleteAccount = async (id: string) => {
  if (!confirm('Are you sure you want to remove this account?')) return;
  try {
    await axios.delete(`/api/admin/ai/accounts/${id}`);
    accounts.value = accounts.value.filter(a => a._id !== id);
    toast.success('Account removed');
  } catch (e) {
    toast.error('Failed to remove account');
  }
};

const calculateRemaining = (quota: any) => {
  // If limit is 0, we can't calculate. Assume 100% until synced.
  if (!quota.limit) return 100;
  const remaining = Math.max(0, quota.limit - quota.used);
  return (remaining / quota.limit) * 100;
};

const getRemainingBarClass = (quota: any) => {
  const p = calculateRemaining(quota);
  if (p < 10) return 'bar-red';
  if (p < 30) return 'bar-amber';
  return 'bar-blue';
};

const getRemainingColorClass = (quota: any) => {
  const p = calculateRemaining(quota);
  if (p < 10) return 'text-red';
  if (p < 30) return 'text-amber';
  return 'text-green';
};

const getModelIcon = (modelId: string) => {
  const mid = modelId.toLowerCase();
  if (mid.includes('veo')) return VideoTwo;
  if (mid.includes('imagen')) return Pic;
  if (mid.includes('flash')) return Brain;
  return Gemini;
};

const getAvatarColor = (email: string) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (email: string) => {
  return email.charAt(0).toUpperCase();
};

const formatDate = (date: string) => {
  if (!date) return 'NEVER';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return 'JUST NOW';
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return d.toLocaleDateString();
};

const cleanModelName = (name: string) => {
  let clean = name.replace(/(\d)_(\d)/g, '$1.$2');
  return clean.replace(/-/g, ' ').toUpperCase();
};

const copyText = (text: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

onMounted(() => {
  fetchAccounts();
  // Auto refresh every 30 seconds
  refreshInterval = setInterval(() => fetchAccounts(true), 30000);

  if (success === 'true') {
    toast.success(message);
  } else if (success === 'false') {
    toast.error(message);
  }
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<style lang="scss" scoped>
.admin-ai-accounts {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

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

.primary-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  &.labs {
    background: #8b5cf6;

    &:hover {
      background: #7c3aed;
    }
  }
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;

  .stats-card {
    padding: 20px;

    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 28px;
      font-weight: 800;
      color: #fff;

      &.text-green {
        color: #10b981;
      }

      &.text-amber {
        color: #f59e0b;
      }

      &.text-red {
        color: #ef4444;
      }
    }
  }
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.account-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  &.inactive-card {
    opacity: 0.6;
    filter: grayscale(0.5);
    background: rgba(255, 255, 255, 0.01);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .user-info {
      display: flex;
      align-items: center;
      gap: 14px;

      .avatar-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 800;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        overflow: hidden;

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .details {
        .email {
          font-weight: 700;
          color: #fff;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;

          .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;

            &.inactive-dot {
              background: #6b7280 !important;
              box-shadow: none !important;
            }

            &.ready {
              background: #10b981;
              box-shadow: 0 0 8px #10b981;
            }

            &.rate-limited {
              background: #f59e0b;
            }

            &.error,
            &.unauthorized {
              background: #ef4444;
            }
          }

          .status-text {
            font-size: 10px;
            font-weight: 900;
            color: rgba(255, 255, 255, 0.3);
            letter-spacing: 1px;
          }
        }
      }
    }

    .actions {
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: all 0.2s;

      .active-power {
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.3);
        background: rgba(16, 185, 129, 0.1);
      }
    }
  }

  &:hover .card-header .actions {
    opacity: 1;
  }

  .quotas-list {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .quota-item {
      .quota-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 8px;

        .model-name {
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
        }

        .quota-values {
          font-weight: 800;

          &.text-green {
            color: #10b981;
          }

          &.text-amber {
            color: #f59e0b;
          }

          &.text-red {
            color: #ef4444;
          }
        }
      }

      .progress-pill-container {
        height: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        overflow: hidden;
        padding: 2px;

        .progress-pill-bar {
          height: 100%;
          border-radius: 20px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);

          &.bar-blue {
            background: linear-gradient(90deg, #3b82f6, #6366f1);
          }

          &.bar-amber {
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
          }

          &.bar-red {
            background: linear-gradient(90deg, #ef4444, #f87171);
          }
        }
      }
    }

    .collapse-toggle {
      width: 100%;
      margin-top: 8px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);
        border-style: solid;
      }
    }

    .empty-quotas {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 12px;
      font-style: italic;
    }
  }

  .card-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.2);

    .project-info {
      display: flex;
      align-items: center;
      gap: 6px;

      .value {
        cursor: pointer;
        transition: color 0.2s;
        color: rgba(255, 255, 255, 0.4);

        &:hover {
          color: rgba(255, 255, 255, 0.5);
        }
      }

      .copy-icon {
        opacity: 0.5;
        cursor: pointer;

        &:hover {
          opacity: 1;
        }
      }

      .footer-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 12px;

        .footer-icon {
          opacity: 0.5;
          cursor: pointer;
          transition: all 0.2s;
          color: rgba(255, 255, 255, 0.6);

          &:hover {
            opacity: 1;
            color: #fff;
            transform: scale(1.1);
          }

          &.is-loading {
            color: #3b82f6;
          }
        }
      }

      .enable-link {
        margin-left: 8px;
        padding: 2px 8px;
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 6px;
        color: #60a5fa;
        font-size: 9px;
        font-weight: 900;
        text-decoration: none;
        transition: all 0.2s;

        &:hover {
          background: #3b82f6;
          color: #fff;
          transform: scale(1.05);
        }

        &.billing {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          margin-left: 4px;

          &:hover {
            background: #f59e0b;
            color: #fff;
          }
        }
      }
    }
  }
}

.icon-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 7px;
  border-radius: 10px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.delete:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
}

.animate-in {
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-state {
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  color: rgba(255, 255, 255, 0.3);

  h3 {
    color: rgba(255, 255, 255, 0.6);
    margin: 16px 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

.loading-state {
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.mr-1-5 {
  margin-right: 6px;
}

.email-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ag-badge {
  background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
  color: #fff;
  font-size: 8px;
  font-weight: 900;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &.labs {
    background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
    box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
  }
}

.primary-btn.secondary {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #c084fc;

  &:hover {
    background: #a855f7;
    color: #fff;
    border-color: #a855f7;
  }
}

.flex {
  display: flex;
}

.gap-2 {
  gap: 8px;
}
</style>
