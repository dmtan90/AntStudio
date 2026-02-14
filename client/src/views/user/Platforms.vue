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
      <p>Connect your YouTube, Facebook, or TikTok channels to start professional streaming and automated publishing.
      </p>
      <button class="primary-btn secondary mt-6" @click="showAddModal = true">
        Get Started
      </button>
    </div>

    <!-- Active Platforms Grid -->
    <div v-else class="platforms-grid">
      <div v-for="account in accounts" :key="account._id" class="platform-card cinematic-card animate-slide-up"
        :class="{ 'error': account.status === 'error', [account.platform]: true }">

        <div class="card-glow"></div>

        <div class="card-header">
          <div class="user-avatar-group">
            <div class="avatar-ring">
              <el-image :src="getFileUrl(account.avatarUrl)" :alt="account.accountName" class="user-avatar">
                <template #error>
                  <div class="avatar-placeholder">
                    <user-icon theme="outline" size="20" />
                  </div>
                </template>
                <template #placeholder>
                  <div class="avatar-placeholder">
                    <user-icon theme="outline" size="20" />
                  </div>
                </template>
              </el-image>
            </div>
            <div class="platform-mini-icon" :class="account.platform">
              <youtube v-if="account.platform === 'youtube'" theme="filled" />
              <facebook v-else-if="account.platform === 'facebook'" theme="filled" />
              <tiktok v-else-if="account.platform === 'tiktok'" theme="filled" />
              <broadcast v-else theme="filled" />
            </div>
          </div>

          <div class="status-indicator">
            <div class="dot" :class="account.status"></div>
            <span class="status-text">{{ account.status }}</span>
          </div>
        </div>

        <div class="account-details mt-6">
          <h4 class="account-name">{{ account.accountName }}</h4>
          <div class="meta-tags">
            <span class="platform-tag">{{ account.platform }}</span>
            <span v-if="account.credentials?.email || account.accountEmail" class="email-tag">
              {{ account.credentials?.email || account.accountEmail }}
            </span>
          </div>
        </div>

        <div class="card-actions mt-8">
          <router-link v-if="account.platform == 'custom-rtmp'"
            :to="{ name: 'live-studio', query: { platformId: account._id } }"
            class="action-btn primary-action bg-red-600 w-full">
            <Broadcast theme="outline" size="16" />
            <span>Go Live</span>
          </router-link>
          <router-link v-else :to="{ name: 'platforms-cms', query: { accountId: account._id } }"
            class="action-btn primary-action w-full">
            <video-file theme="outline" size="16" />
            <span>Manage Channel</span>
          </router-link>

          <div class="utility-actions">
            <button v-if="account.platform == 'custom-rtmp' || account.platform == 'ant-media'" class="util-btn"
              @click="editAccount(account)" title="Settings">
              <setting theme="outline" size="16" />
            </button>
            <button class="util-btn" @click="syncAccount(account)" title="Sync Status">
              <refresh theme="outline" size="16" />
            </button>
            <button class="util-btn delete" @click="disconnectAccount(account)" title="Disconnect">
              <close theme="outline" size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Platform Modal -->
    <el-dialog v-model="showAddModal" title="Connect Dynamic Platform" width="500px"
      class="glass-dialog dark-theme-dialog" :show-close="false" destroy-on-close>
      <div class="platform-selector grid grid-cols-2 gap-4 mb-6">
        <div v-for="p in availablePlatforms" :key="p.id" class="p-item glass-selectable"
          :class="{ active: selectedPlatform === p.id }" @click="selectedPlatform = p.id">
          <component :is="p.icon" theme="outline" size="24" :class="p.id" />
          <span>{{ p.name }}</span>
        </div>
      </div>

      <el-form :model="form" layout="vertical" class="mt-6">
        <div v-if="selectedPlatform">
          <!-- AMS Fields -->
          <div v-if="selectedPlatform === 'ant-media'">
            <div class="form-group mb-4">
              <label class="form-label">Internal Name</label>
              <el-input v-model="form.name" placeholder="e.g. My AMS Instance" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Managing URL (REST API)</label>
              <el-input v-model="form.serverUrl" placeholder="https://antmedia.server.com:5443" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Admin Email</label>
              <el-input v-model="form.email" placeholder="admin@server.com" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Password</label>
              <el-input v-model="form.password" type="password" show-password />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">App Name</label>
              <el-input v-model="form.appName" placeholder="LiveApp" />
            </div>
          </div>

          <!-- Custom RTMP -->
          <div v-else-if="selectedPlatform === 'custom-rtmp'">
            <div class="form-group mb-4">
              <label class="form-label">Internal Name</label>
              <el-input v-model="form.name" placeholder="e.g. Custom Endpoint" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">RTMP URL</label>
              <el-input v-model="form.rtmpUrl" placeholder="rtmp://server.com/app" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Stream Key</label>
              <el-input v-model="form.streamKey" type="password" show-password />
            </div>
          </div>

          <!-- OAuth Platforms -->
          <div v-else class="oauth-connect flex flex-col items-center justify-center py-8">
            <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <component :is="availablePlatforms.find(p => p.id === selectedPlatform)?.icon" theme="filled" size="32"
                :class="selectedPlatform" />
            </div>
            <p class="text-center text-gray-400 mb-6 px-8">
              Connect your {{availablePlatforms.find(p => p.id === selectedPlatform)?.name}} account to automatically
              sync videos and manage live streams.
            </p>
            <!-- No input fields needed for OAuth initial step -->
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
import { ref, onMounted, computed } from 'vue';
import {
  Connection, Plus, Youtube, Facebook, Tiktok,
  Broadcast, Refresh, Close, SettingTwo as SettingIcon,
  VideoFile, Setting, User as UserIcon
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { usePlatformStore } from '@/stores/platform';
import { getFileUrl } from '@/utils/api';

const platformStore = usePlatformStore();
const accounts = computed(() => platformStore.accounts);
const loading = computed(() => platformStore.loading);
const connecting = computed(() => platformStore.connecting);

const showAddModal = ref(false);
const selectedPlatform = ref('youtube');
const editingAccountId = ref<string | null>(null);

const form = ref({
  name: '',
  rtmpUrl: '',
  serverUrl: '',
  streamKey: '',
  email: '',
  password: '', // Only filled if creating or explicitly changing
  appName: '',
});

const availablePlatforms = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, type: 'oauth' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, type: 'oauth' },
  { id: 'tiktok', name: 'TikTok', icon: Tiktok, type: 'oauth' },
  { id: 'ant-media', name: 'Ant Media Server', icon: Broadcast, type: 'manual' },
  { id: 'custom-rtmp', name: 'Custom RTMP', icon: Connection, type: 'manual' }
];

const initiateOAuth = async (platform: string) => {
  try {
    const data = await platformStore.getAuthUrl(platform);
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      toast.error('Failed to get authorization URL');
    }
  } catch (e) {
    // Error handled in store but we catch here to stop flow if needed
  }
};

const handleConnect = async () => {
  const platformConfig = availablePlatforms.find(p => p.id === selectedPlatform.value);

  // OAuth Flow (Only supported for NEW connections currently)
  if (platformConfig?.type === 'oauth' && !editingAccountId.value) {
    await initiateOAuth(selectedPlatform.value);
    return;
  }

  // Manual Flow (AMS / Custom RTMP) validation
  if (!form.value.name) {
    return toast.error('Account Name is required');
  }

  if (selectedPlatform.value === 'ant-media') {
    // If editing, password can be empty (unchanged). If creating, password required.
    const isPasswordRequired = !editingAccountId.value;

    if (!form.value.serverUrl || !form.value.email) {
      return toast.error('Server URL and Email are required');
    }
    if (isPasswordRequired && !form.value.password) {
      return toast.error('Password is required for new connection');
    }

  } else if (selectedPlatform.value === 'custom-rtmp') {
    if (!form.value.rtmpUrl || !form.value.streamKey) {
      return toast.error('RTMP URL and Stream Key are required');
    }
  }

  try {
    const payload = {
      platform: selectedPlatform.value,
      accountName: form.value.name,
      streamKey: form.value.streamKey,
      rtmpUrl: form.value.rtmpUrl,
      credentials: {
        email: form.value.email,
        password: form.value.password, // Store cleans empty pass for updates if needed? Actually store handles API call. Route handles empty pass.
        serverUrl: form.value.serverUrl,
        appName: form.value.appName
      }
    };

    if (editingAccountId.value) {
      // Update existing account
      await platformStore.updatePlatform(editingAccountId.value, payload);
    } else {
      // Create new account
      await platformStore.connectPlatform(payload);
    }

    showAddModal.value = false;
    resetForm();
  } catch (e) {
    // Error handled in store
  }
};

const disconnectAccount = async (account: any) => {
  if (!confirm(`Are you sure you want to disconnect ${account.accountName}?`)) return;
  await platformStore.disconnectPlatform(account._id);
};

const editAccount = (account: any) => {
  editingAccountId.value = account._id;
  selectedPlatform.value = account.platform;
  form.value = {
    name: account.accountName,
    rtmpUrl: account.rtmpUrl || '',
    serverUrl: account.credentials?.serverUrl || '',
    streamKey: account.streamKey || '',
    email: account.credentials?.email || '',
    password: '', // Clear password field for security
    appName: account.credentials?.appName || ''
  };
  showAddModal.value = true;
};

const resetForm = () => {
  form.value = { name: '', rtmpUrl: '', serverUrl: '', streamKey: '', email: '', password: '', appName: '' };
  editingAccountId.value = null;
  selectedPlatform.value = 'youtube'; // Reset to default tab? Or keep last. Let's reset.
};

const syncAccount = async (account: any) => {
  toast.info(`Syncing status for ${account.accountName}...`);
  // Mock sync for now
  setTimeout(() => toast.success('Status synchronized'), 1000);
};

onMounted(() => {
  platformStore.fetchAccounts();
});
</script>

<style lang="scss" scoped>
.platforms-view {
  min-height: 100vh;
  background: #0a0a0a;
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.08), transparent 400px),
    radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.08), transparent 400px);
  font-family: 'Outfit', sans-serif;
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

.cinematic-card {
  position: relative;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
    border-radius: 24px;
    opacity: 0.5;
  }

  .card-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, var(--accent-color, rgba(59, 130, 246, 0.15)) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
    z-index: 0;
  }

  &:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);

    .card-glow {
      opacity: 1;
    }
  }

  &.youtube { --accent-color: rgba(254, 0, 0, 0.2); }
  &.facebook { --accent-color: rgba(24, 119, 242, 0.2); }
  &.tiktok { --accent-color: rgba(254, 44, 85, 0.2); }
  &.ant-media { --accent-color: rgba(255, 193, 7, 0.2); }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }

  .user-avatar-group {
    position: relative;

    .avatar-ring {
      width: 56px;
      height: 56px;
      padding: 2px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

      .user-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .platform-mini-icon {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      border: 2px solid #000;
      
      &.youtube { color: #fe0000; }
      &.facebook { color: #1877f2; }
      &.tiktok { color: #fe2c55; }
      &.ant-media { color: #ffc107; }
    }
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 100px;
    backdrop-filter: blur(4px);

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #666;
      box-shadow: 0 0 8px currentColor;

      &.connected { background: #10b981; color: #10b981; }
      &.error { background: #ef4444; color: #ef4444; }
    }

    .status-text {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .account-details {
      position: relative;
      z-index: 1;
  }

  .account-name {
    font-size: 18px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.01em;
  }

  .meta-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    span {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .platform-tag {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .email-tag {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
    cursor: pointer;

    &.primary-action {
      background: #3b82f6;
      color: white;
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);

      &:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
      }
    }
  }

  .utility-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .util-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: white;
      }

      &.delete:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
    }
  }
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  height: 44px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  color: #000;
  border: none;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15);
  }

  &.glass-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
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
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);

  span {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.1);

    span { color: #3b82f6; }
    .youtube { color: #fe0000; }
    .facebook { color: #1877f2; }
    .tiktok { color: #fe2c55; }
    .ant-media { color: #ffc107; }
  }
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.empty-state {
  text-align: center;
  padding: 80px 32px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 32px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  margin-top: 32px;

  h3 {
    font-size: 24px;
    font-weight: 800;
    color: white;
    margin-bottom: 12px;
    letter-spacing: -0.01em;
  }

  p {
    color: rgba(255, 255, 255, 0.4);
    max-width: 400px;
    margin: 0 auto 24px;
    line-height: 1.6;
    font-size: 14px;
  }
}

:deep(.glass-dialog) {
    background: rgba(15, 15, 20, 0.85) !important;
    backdrop-filter: blur(32px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px !important;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6) !important;

    .el-dialog__header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        margin-right: 0;
        padding: 20px 24px;
        .el-dialog__title { 
            color: #fff; 
            font-weight: 800; 
            font-size: 16px; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
        }
    }
    
    .el-dialog__body {
        padding: 24px;
    }
    
    .el-dialog__footer {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding: 16px 24px;
    }
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 32px;
}

.cinematic-card {
  position: relative;
  background: rgba(15, 15, 15, 0.7);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent);
    pointer-events: none;
  }

  .card-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, var(--accent-color, rgba(59, 130, 246, 0.1)) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1);

    .card-glow {
      opacity: 1;
    }
  }

  &.youtube {
    --accent-color: rgba(254, 0, 0, 0.15);
  }

  &.facebook {
    --accent-color: rgba(24, 119, 242, 0.15);
  }

  &.tiktok {
    --accent-color: rgba(254, 44, 85, 0.15);
  }

  &.ant-media {
    --accent-color: rgba(255, 193, 7, 0.15);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .user-avatar-group {
    position: relative;

    .avatar-ring {
      width: 64px;
      height: 64px;
      padding: 3px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);

      .user-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .platform-mini-icon {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #0f0f0f;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border: 2px solid #0f0f0f;

      &.youtube {
        color: #fe0000;
      }

      &.facebook {
        color: #1877f2;
      }

      &.tiktok {
        color: #fe2c55;
      }

      &.ant-media {
        color: #ffc107;
      }
    }
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 100px;

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #666;
      box-shadow: 0 0 8px currentColor;

      &.connected {
        background: #10b981;
        color: #10b981;
      }

      &.error {
        background: #ef4444;
        color: #ef4444;
      }
    }

    .status-text {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .account-name {
    font-size: 20px;
    font-weight: 800;
    color: white;
    letter-spacing: -0.5px;
  }

  .meta-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;

    span {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .platform-tag {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.4);
    }

    .email-tag {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s;
    cursor: pointer;

    &.primary-action {
      background: #3b82f6;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

      &:hover {
        background: #2563eb;
        transform: translateY(-2px);
      }
    }
  }

  .utility-actions {
    display: flex;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .util-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }

      &.delete:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
    }
  }
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  height: 48px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  color: black;
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(255, 255, 255, 0.2);
  }

  &.glass-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
    }
  }
}

.p-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);

  span {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  &.active {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    transform: scale(1.05);

    span {
      color: #3b82f6;
    }

    .youtube {
      color: #fe0000;
    }

    .facebook {
      color: #1877f2;
    }

    .tiktok {
      color: #fe2c55;
    }

    .ant-media {
      color: #ffc107;
    }
  }
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}

.empty-state {
  text-align: center;
  padding: 100px 40px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 40px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  margin-top: 40px;

  h3 {
    font-size: 28px;
    font-weight: 900;
    color: white;
    margin-bottom: 16px;
  }

  p {
    color: rgba(255, 255, 255, 0.4);
    max-width: 480px;
    margin: 0 auto 32px;
    line-height: 1.6;
  }
}
</style>
