<template>
  <div class="platforms-view p-6 animate-in">
    <header class="view-header mb-8">
      <div>
        <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <connection theme="outline" size="28" class="text-primary" />
          Personal Platforms
        </h1>
        <p class="text-gray-400 mt-1">Manage your professional streaming channels and distribution endpoints.</p>
      </div>
      <button class="primary-btn glass-btn" @click="showAddModal = true">
        <plus theme="outline" size="18" class="mr-2" />
        Connect New Platform
      </button>
    </header>

    <!-- Empty State -->
    <div v-if="!accounts.length && !loading" class="empty-state glass-card">
      <div class="icon-orb mb-6">
        <connection theme="outline" size="40" />
      </div>
      <h3>No platforms connected yet</h3>
      <p>Connect your YouTube, Facebook, or TikTok channels to start professional streaming and automated publishing.</p>
      <button class="primary-btn secondary mt-6" @click="showAddModal = true">
        Get Started
      </button>
    </div>

    <!-- Active Platforms Grid -->
    <div v-else class="platforms-grid">
      <div v-for="account in accounts" :key="account._id" class="platform-card glass-card animate-slide-up" :class="{ 'error': account.status === 'error' }">
        <div class="card-header">
            <div class="platform-icon" :class="account.platform">
              <youtube v-if="account.platform === 'youtube'" theme="filled" />
              <facebook v-else-if="account.platform === 'facebook'" theme="filled" />
              <tiktok v-else-if="account.platform === 'tiktok'" theme="filled" />
              <broadcast v-else theme="filled" />
            </div>
            <div class="status-badge" :class="account.status">
              {{ account.status }}
            </div>
        </div>

        <div class="account-info mt-4">
          <h4 class="name">{{ account.accountName }}</h4>
          <p class="type text-xs uppercase opacity-40 font-black tracking-widest">{{ account.platform }}</p>
        </div>

        <div class="card-footer mt-6">
          <div class="actions">
            <button class="icon-btn" title="Sync Status" @click="syncAccount(account)">
              <refresh theme="outline" size="14" />
            </button>
            <router-link :to="{ name: 'platforms-cms', query: { accountId: account._id }}" class="icon-btn" title="Manage Videos">
              <video-file theme="outline" size="14" />
            </router-link>
            <button class="icon-btn delete" title="Disconnect" @click="disconnectAccount(account)">
              <close theme="outline" size="14" />
            </button>
          </div>
          <button class="text-link" @click="editAccount(account)">Configure</button>
        </div>
      </div>
    </div>

    <!-- Add Platform Modal -->
    <el-dialog
      v-model="showAddModal"
      title="Connect Dynamic Platform"
      width="500px"
      class="glass-dialog dark-theme-dialog"
      :show-close="false"
      destroy-on-close
    >
      <div class="platform-selector grid grid-cols-2 gap-4 mb-6">
          <div v-for="p in availablePlatforms" :key="p.id" 
               class="p-item glass-selectable" 
               :class="{ active: selectedPlatform === p.id }"
               @click="selectedPlatform = p.id">
            <component :is="p.icon" theme="outline" size="24" :class="p.id" />
            <span>{{ p.name }}</span>
          </div>
      </div>

      <el-form :model="form" layout="vertical" class="mt-6">
          <div v-if="selectedPlatform">
             <div class="form-group mb-4">
                <label class="form-label">Internal Name</label>
                <el-input v-model="form.name" placeholder="e.g. My Official Channel" />
             </div>

             <!-- Platform Specific Fields -->
             <div v-if="selectedPlatform === 'ant-media' || selectedPlatform === 'custom-rtmp'">
                <div class="form-group mb-4">
                   <label class="form-label">RTMP URL</label>
                   <el-input v-model="form.rtmpUrl" placeholder="rtmp://server.com/app" />
                </div>
                <div class="form-group mb-4">
                   <label class="form-label">Stream Key</label>
                   <el-input v-model="form.streamKey" type="password" show-password />
                </div>
             </div>

             <div v-else class="api-note p-4 glass-dark rounded-xl text-sm border border-white/5 mb-4">
                <p class="text-blue-400 font-bold mb-2">Notice for {{ selectedPlatform.toUpperCase() }}</p>
                <p class="opacity-60 leading-relaxed">Direct OAuth authorization is coming soon. For now, please provide your <b>Stream Key</b> manually to enable RTMP restreaming.</p>
             </div>

             <div v-if="selectedPlatform !== 'ant-media' && selectedPlatform !== 'custom-rtmp' " class="form-group mb-4">
                 <label class="form-label">Stream Key</label>
                 <el-input v-model="form.streamKey" type="password" show-password placeholder="Paste from platform dashboard" />
             </div>
          </div>
      </el-form>

      <template #footer>
        <div class="flex gap-4">
          <button class="primary-btn secondary flex-1" @click="showAddModal = false">Cancel</button>
          <button class="primary-btn flex-1" :disabled="!selectedPlatform" @click="handleConnect" :loading="connecting">
            Connect
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  Connection, Plus, Youtube, Facebook, Tiktok, 
  Broadcast, Refresh, Close, SettingTwo as SettingIcon,
  VideoFile
} from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';

const accounts = ref<any[]>([]);
const loading = ref(true);
const showAddModal = ref(false);
const selectedPlatform = ref('youtube');
const connecting = ref(false);

const form = ref({
  name: '',
  rtmpUrl: '',
  streamKey: '',
  email: '',
  password: ''
});

const availablePlatforms = [
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'tiktok', name: 'TikTok', icon: Tiktok },
  { id: 'ant-media', name: 'Ant Media Server', icon: Broadcast },
  { id: 'custom-rtmp', name: 'Custom RTMP', icon: Connection }
];

const fetchAccounts = async () => {
  try {
    loading.value = true;
    const res = await axios.get('/api/platforms');
    accounts.value = res.data.data;
  } catch (error: any) {
    toast.error('Failed to load platform accounts');
  } finally {
    loading.value = false;
  }
};

const handleConnect = async () => {
  if (!form.value.name || !form.value.streamKey) {
     return toast.error('Account Name and Stream Key are required');
  }

  try {
    connecting.value = true;
    await axios.post('/api/platforms', {
      platform: selectedPlatform.value,
      accountName: form.value.name,
      streamKey: form.value.streamKey,
      rtmpUrl: form.value.rtmpUrl,
      credentials: {
         email: form.value.email,
         password: form.value.password,
         serverUrl: form.value.rtmpUrl
      }
    });

    toast.success(`${selectedPlatform.value} account connected successfully`);
    showAddModal.value = false;
    await fetchAccounts();
    
    // Reset form
    form.value = { name: '', rtmpUrl: '', streamKey: '', email: '', password: '' };
  } catch (e: any) {
    toast.error(e.response?.data?.error || 'Failed to connect platform');
  } finally {
    connecting.value = false;
  }
};

const disconnectAccount = async (account: any) => {
    if (!confirm(`Are you sure you want to disconnect ${account.accountName}?`)) return;
    
    try {
        await axios.delete(`/api/platforms/${account._id}`);
        toast.success('Platform disconnected');
        await fetchAccounts();
    } catch (e) {
        toast.error('Failed to disconnect');
    }
};

const editAccount = (account: any) => {
    selectedPlatform.value = account.platform;
    form.value = {
        name: account.accountName,
        rtmpUrl: account.rtmpUrl,
        streamKey: account.streamKey,
        email: account.credentials?.email || '',
        password: account.credentials?.password || ''
    };
    showAddModal.value = true;
};

const syncAccount = async (account: any) => {
    toast.info(`Syncing status for ${account.accountName}...`);
    // Mock sync for now
    setTimeout(() => toast.success('Status synchronized'), 1000);
};

onMounted(fetchAccounts);
</script>

<style lang="scss" scoped>
.platforms-view {
  min-height: 100vh;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.platform-card {
  padding: 24px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 4px; height: 100%;
    background: var(--platform-color, #3b82f6);
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  }

  &.error::before { background: #ef4444; }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .platform-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    @include flex-center;
    font-size: 20px;
    background: rgba(255, 255, 255, 0.05);

    &.youtube { color: #fe0000; }
    &.facebook { color: #1877f2; }
    &.tiktok { color: #ff0050; }
    &.ant-media { color: #ffc107; }
  }

  .status-badge {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    letter-spacing: 1px;
    
    &.connected { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    &.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  }

  .account-info {
    .name { font-weight: 700; color: #fff; font-size: 16px; margin: 0; }
    .type { margin-top: 4px; }
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .actions { display: flex; gap: 8px; }
  }
}

.p-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);

  span { font-size: 12px; font-weight: 700; }

  &.active {
    background: rgba($primary-rgb, 0.1);
    border-color: rgba($primary-rgb, 0.3);
    color: #3b82f6;
  }

  .youtube { color: #fe0000; }
  .facebook { color: #1877f2; }
  .tiktok { color: #ff0050; }
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.text-link {
  background: none;
  border: none;
  padding: 0;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  
  &:hover { text-decoration: underline; }
}

.empty-state {
  text-align: center;
  padding: 80px 40px;
  max-width: 600px;
  margin: 40px auto;

  .icon-orb {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    margin: 0 auto;
    @include flex-center;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #3b82f6;
  }

  h3 { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 12px; }
  p { line-height: 1.6; color: rgba(255, 255, 255, 0.4); }
}
</style>
