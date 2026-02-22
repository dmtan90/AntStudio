<template>
  <div class="admin-ai-accounts min-h-screen bg-[#0a0a0c] text-white font-outfit p-8 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 relative z-10">
      <div>
        <h1 class="text-5xl font-black tracking-tighter mb-2 relative inline-block">
           AI Accounts
           <div class="absolute -bottom-2 left-0 w-1/3 h-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </h1>
        <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mt-4 pl-1">Multi-Account Intelligence Pool</p>
      </div>
      <div class="flex gap-3">
        <button class="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group hover:text-blue-400" @click="addAccount(true)">
          <google-ads theme="filled" size="14" />
          Antigravity
        </button>
        <!-- <button class="px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group text-purple-400" @click="add11LabsAccount">
          <brain theme="filled" size="14" />
          11Labs
        </button> -->
        <button class="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2" @click="addAccount(false)">
          <google theme="outline" size="14" />
          Google
        </button>
      </div>
    </div>

    <div class="accounts-content relative z-10">
      <!-- Stats Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div class="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-colors group">
          <label class="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2 group-hover:text-white transition-colors">Total Accounts</label>
          <div class="text-4xl font-black text-white tracking-tighter">{{ accounts.length }}</div>
        </div>
        <div class="p-6 rounded-[2rem] bg-green-500/[0.05] border border-green-500/10 backdrop-blur-sm hover:bg-green-500/[0.1] transition-colors group">
          <label class="block text-[9px] font-black uppercase tracking-widest text-green-500/60 mb-2 group-hover:text-green-400 transition-colors">Active Nodes</label>
          <div class="text-4xl font-black text-green-400 tracking-tighter">{{ activeAccounts.length }}</div>
        </div>
        <div class="p-6 rounded-[2rem] bg-amber-500/[0.05] border border-amber-500/10 backdrop-blur-sm hover:bg-amber-500/[0.1] transition-colors group">
          <label class="block text-[9px] font-black uppercase tracking-widest text-amber-500/60 mb-2 group-hover:text-amber-400 transition-colors">Rate Limited</label>
          <div class="text-4xl font-black text-amber-400 tracking-tighter">{{ limitedAccounts.length }}</div>
        </div>
        <div class="p-6 rounded-[2rem] bg-red-500/[0.05] border border-red-500/10 backdrop-blur-sm hover:bg-red-500/[0.1] transition-colors group">
          <label class="block text-[9px] font-black uppercase tracking-widest text-red-500/60 mb-2 group-hover:text-red-400 transition-colors">Systems Down</label>
          <div class="text-4xl font-black text-red-400 tracking-tighter">{{ errorAccounts.length }}</div>
        </div>
      </div>

      <!-- Account Grid -->
      <div v-if="!loading && accounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="account in accounts" :key="account._id"
          :class="['p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-2', 
             account.isActive === false ? 'bg-white/[0.01] border-white/5 grayscale opacity-60' : 'bg-[#0f0f12] border-white/5 hover:border-blue-500/30 shadow-2xl']">
          
          <!-- Background Glow -->
          <div v-if="account.isActive !== false" class="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>

          <!-- Card Header -->
          <div class="flex justify-between items-start relative z-10">
            <div class="flex items-center gap-4">
              <div class="relative">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg relative overflow-hidden" 
                    :style="{ background: getAvatarColor(account.email) }">
                  <div class="absolute inset-0 bg-black/10"></div>
                  <img v-if="account.avatarUrl" :src="getFileUrl(account.avatarUrl)" class="w-full h-full object-cover relative z-10" />
                  <span v-else class="relative z-10">{{ getInitials(account.email) }}</span>
                </div>
                <div 
                  class="absolute -bottom-2 -right-2 w-7 h-7 z-10 bg-red-600 text-white rounded-xl flex items-center justify-center border-2 border-[#0a0a0c]"
                >
                    <google-ads v-if="account.accountType === 'antigravity'" theme="filled" size="14" />
                    <google v-else-if="account.accountType === 'google' || account.accountType === 'standard'" theme="outline" size="14" />
                    <robot v-else theme="filled" size="14" />
                </div>
              </div>
              
              <div>
                <div class="text-sm font-bold text-white mb-1 truncate max-w-[150px]" :title="account.email">{{ account.email }}</div>
                <div class="flex items-center gap-2">
                   <div :class="['w-1.5 h-1.5 rounded-full animate-pulse', 
                      account.status === 'ready' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
                      account.status === 'rate-limited' ? 'bg-amber-500' : 'bg-red-500']"></div>
                   <span class="text-[9px] font-black opacity-40 uppercase tracking-widest">{{ account.isActive !== false ? account.status : 'DISABLED' }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
               <button :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors', account.isActive !== false ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/5 text-gray-500 hover:bg-white/10']"
                @click="toggleActive(account)" :title="account.isActive !== false ? 'Disable' : 'Enable'">
                <power theme="outline" size="14" />
              </button>
              <button class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors" @click="syncAccount(account._id)" title="Sync Quota">
                <refresh theme="outline" size="14" />
              </button>
              <button class="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors" @click="deleteAccount(account._id)" title="Remove">
                <delete theme="outline" size="14" />
              </button>
            </div>
          </div>

          <!-- Quotas -->
          <div class="space-y-5 relative z-10 flex-1">
            <template v-for="(quota, model) in getPriorityQuotas(account)" :key="model">
               <div>
                  <div class="flex justify-between items-center mb-2">
                     <span class="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wide">
                        <component :is="getModelIcon(model as string)" theme="filled" />
                        {{ cleanModelName(model as string) }}
                     </span>
                     <span :class="['text-[10px] font-black tracking-widest', getRemainingColorClass(quota)]">
                        {{ Math.round(calculateRemaining(quota)) }}%
                     </span>
                  </div>
                  <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div class="h-full rounded-full transition-all duration-1000" :style="{ width: calculateRemaining(quota) + '%' }" :class="getRemainingBarClass(quota)"></div>
                  </div>
               </div>
            </template>

            <!-- Expanded Section -->
            <div v-if="account.quotas && Object.keys(account.quotas).length > 3">
              <button @click="toggleExpand(account._id)" class="w-full py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-dashed border-white/10 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2">
                <span>{{ isExpanded(account._id) ? 'SHOW LESS' : `+ ${Object.keys(account.quotas).length - 3} MORE MODELS` }}</span>
                <down v-if="!isExpanded(account._id)" theme="outline" size="12" />
                <up v-else theme="outline" size="12" />
              </button>

              <div v-if="isExpanded(account._id)" class="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                <div v-for="(quota, model) in getSecondaryQuotas(account)" :key="model">
                   <div class="flex justify-between items-center mb-1">
                     <span class="text-[9px] font-bold text-gray-500 flex items-center gap-2 uppercase">
                        <component :is="getModelIcon(model as string)" theme="filled" class="opacity-50"/>
                        {{ cleanModelName(model as string) }}
                     </span>
                     <span class="text-[9px] font-mono text-gray-600">{{ Math.round(calculateRemaining(quota)) }}%</span>
                   </div>
                   <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                     <div class="h-full rounded-full transition-all duration-1000" :style="{ width: calculateRemaining(quota) + '%' }" :class="getRemainingBarClass(quota)"></div>
                   </div>
                </div>
              </div>
            </div>

            <div v-if="!Object.keys(account.quotas || {}).length" class="text-center py-8 opacity-20">
               <p class="text-[10px] font-black uppercase tracking-widest">No Quota Data</p>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
            <div class="flex items-center gap-2">
               <!-- <span class="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  {{ account.accountType === '11labs-direct' ? '11LABS' : account.accountType === 'antigravity' ? 'ANTIGRAVITY' : 'GOOGLE' }}
               </span> -->
               <template v-if="account.projectId && (account.accountType == 'google' || account.accountType == 'standard')">
                  <el-dropdown trigger="hover">
                    <div class="group/pid flex items-center gap-1 cursor-pointer" @click="copyText(account.projectId)">
                      <span class="text-[9px] font-mono text-gray-600 group-hover/pid:text-blue-400 transition-colors truncate max-w-[80px]">{{ account.projectId }}</span>
                      <copy theme="outline" size="10" class="text-gray-700 group-hover/pid:text-blue-400" />
                    </div>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :icon="Edit" @click="editProjectId(account)">Change Project ID</el-dropdown-item>
                        <el-dropdown-item :icon="Plus" @click="createNewProject(account)">Create New Project</el-dropdown-item>
                        <el-dropdown-item :icon="Check" @click="enableAPI(account)">Enable API</el-dropdown-item>
                        <el-dropdown-item :icon="Bill" @click="enableBilling(account)">Enable Billing</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
               </template>
               <div v-else class="group/pid flex items-center gap-1 cursor-pointer" @click="copyText(account.projectId)">
                  <span class="text-[9px] font-mono text-gray-600 group-hover/pid:text-blue-400 transition-colors truncate max-w-[80px]">{{ account.projectId }}</span>
                  <copy theme="outline" size="10" class="text-gray-700 group-hover/pid:text-blue-400" />
                </div>
            </div>
            <div class="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{{ formatDate(account.lastUsedAt) }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && accounts.length === 0" class="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
        <div class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <wallet theme="filled" size="40" class="text-gray-600" />
        </div>
        <h3 class="text-xl font-black uppercase text-white mb-2">Initialize Neural Pool</h3>
        <p class="text-sm font-medium text-gray-500">Connect Google or 11Labs accounts to spin up the intelligence grid.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-32">
        <loading-four theme="outline" size="40" class="animate-spin text-blue-500" />
      </div>
    </div>
    
    <!-- Ambient Glow -->
    <div class="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Plus, User, Refresh, Delete, Wallet, 
  Copy, Loading, Gemini, Brain, VideoTwo, Pic, 
  Down, Up, Power, Edit, LoadingFour, Google, GoogleAds,
  Bill, Check , Robot
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { useAdminStore } from '@/stores/admin';
import { useRoute } from 'vue-router';

const route = useRoute();
const adminStore = useAdminStore();
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
    await adminStore.updateAIAccount(account._id, { isActive: newState });
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
    await adminStore.updateAIAccount(account._id, { projectId: newId });
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
    const data = await adminStore.createProject(account._id);
    if (data) {
      account.projectId = data.projectId;
    }
  } catch (e: any) {
    toast.error(e?.error || 'Project creation failed');
  } finally {
    isCreatingProject.value = null;
  }
};

const enableAPI = async (account: any) => {
  try {
    window.open(`https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${account.projectId}`, '_blank');
  } catch (e: any) {
    toast.error(e?.error || 'API enabling failed');
  }
};

const enableBilling = async (account: any) => {
  try {
    window.open(`https://console.cloud.google.com/billing/enable?project=${account.projectId}`, '_blank');
  } catch (e: any) {
    toast.error(e?.error || 'Billing enabling failed');
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
    const data = await adminStore.fetchAIAccounts();
    if (data) accounts.value = data;
  } catch (e: any) {
    if (!silent) toast.error('Failed to load AI accounts');
  } finally {
    if (!silent) loading.value = false;
  }
};

const addAccount = async (isAntigravity = false) => {
  try {
    const redirectUri = `${window.location.origin}/platforms/callback/google?type=ai-account`;
    const data = await adminStore.getAuthUrl('google', redirectUri);
    if (data && data.url) {
      window.location.href = data.url;
    }
  } catch (e) {
    toast.error('Could not initiate OAuth flow');
  }
};

const add11LabsAccount = async () => {
  const email = prompt('1. Enter 11Labs Account Email:');
  if (!email) return;
  const token = undefined;
  try {
    toast.info('Integrating 11Labs account...');
    await adminStore.addDirectAccount({
      email,
      accessToken: token || undefined,
      accountType: '11labs-direct',
      providerId: '11labs'
    });
    await fetchAccounts(true);
  } catch (e: any) {
    toast.error(e.response?.data?.error || 'Failed to add account');
  }
};

const syncAccount = async (id: string) => {
  try {
    toast.info('Syncing status...');
    await adminStore.syncAccount(id);
    await fetchAccounts(true);
  } catch (e) {
    toast.error('Sync failed');
  }
};

const deleteAccount = async (id: string) => {
  if (!confirm('Are you sure you want to remove this account?')) return;
  try {
    await adminStore.deleteAIAccount(id);
    accounts.value = accounts.value.filter(a => a._id !== id);
  } catch (e) {
    toast.error('Failed to remove account');
  }
};

const calculateRemaining = (quota: any) => {
  if (!quota.limit) return 100;
  const remaining = Math.max(0, quota.limit - quota.used);
  return (remaining / quota.limit) * 100;
};

const getRemainingBarClass = (quota: any) => {
  const p = calculateRemaining(quota);
  if (p < 10) return 'bg-red-500';
  if (p < 30) return 'bg-amber-500';
  return 'bg-blue-500';
};

const getRemainingColorClass = (quota: any) => {
  const p = calculateRemaining(quota);
  if (p < 10) return 'text-red-500';
  if (p < 30) return 'text-amber-500';
  return 'text-green-500';
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
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
