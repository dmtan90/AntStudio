<template>
  <div class="platforms-view min-h-screen bg-[#0a0a0c] text-white font-outfit">
    <!-- Header Section -->
    <header class="relative py-16 px-8 overflow-hidden border-b border-white/5">
      <div class="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-transparent pointer-events-none"></div>
      
      <!-- Ambient Glows -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div class="absolute top-1/2 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] animate-pulse" style="animation-delay: 1s"></div>

      <div class="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <h1 class="text-6xl font-black mb-4 tracking-tighter leading-[0.9]">
            Connected <br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
              Platforms
            </span>
          </h1>
          <p class="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
             Manage your professional streaming channels and automated content distribution.
          </p>
        </div>

        <button 
           @click="showAddModal = true" 
           class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden"
        >
           <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
           <plus theme="outline" size="20" />
           Connect New
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-12 px-8">
      <!-- Empty State -->
      <div v-if="!accounts.length && !loading" class="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
         <div class="text-7xl mb-6 grayscale opacity-20">📡</div>
         <h3 class="text-2xl font-black text-white mb-2">No platforms connected</h3>
         <p class="text-gray-500 mb-8 max-w-md mx-auto">Connect your YouTube, Facebook, or TikTok channels to start streaming.</p>
         <button @click="showAddModal = true" class="px-8 py-4 bg-white/10 rounded-2xl font-bold text-sm uppercase tracking-wide hover:bg-white/20 transition-all border border-white/10">
            Get Started
         </button>
      </div>

      <!-- Active Platforms Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="account in accounts" :key="account._id" 
           class="platform-card group relative bg-black rounded-3xl p-1 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/20"
           :class="{'border border-red-500/50 shadow-red-900/20': account.status === 'error', 'border border-white/5': account.status !== 'error'}"
        >
           <!-- Inner Content -->
           <div class="bg-[#0a0a0c] rounded-[22px] p-6 h-full flex flex-col relative z-10 overflow-hidden">
               <!-- Background Glow -->
               <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
               
               <div class="flex justify-between items-start mb-8 relative">
                   <div class="relative">
                      <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                         <img v-if="account.avatarUrl" :src="getFileUrl(account.avatarUrl)" class="w-full h-full object-cover" />
                         <user-icon v-else theme="outline" size="24" class="text-gray-500" />
                      </div>
                      <div 
                        class="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-[#0a0a0c]"
                        :class="{
                           'bg-red-600 text-white': account.platform === 'youtube',
                           'bg-blue-600 text-white': account.platform === 'facebook',
                           'bg-black text-white border-white/20': account.platform === 'tiktok',
                           'bg-yellow-500 text-black': account.platform === 'ant-media'
                        }"
                      >
                         <youtube v-if="account.platform === 'youtube'" theme="filled" size="14" />
                         <facebook v-else-if="account.platform === 'facebook'" theme="filled" size="14" />
                         <tiktok v-else-if="account.platform === 'tiktok'" theme="outline" size="14" />
                         <broadcast v-else theme="filled" size="14" />
                      </div>
                   </div>

                   <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                      <div 
                        class="w-1.5 h-1.5 rounded-full"
                        :class="account.status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'"
                      ></div>
                      <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">{{ account.status }}</span>
                   </div>
               </div>

               <div class="mb-auto relative">
                  <h3 class="text-2xl font-bold text-white mb-1 leading-tight">{{ account.accountName }}</h3>
                  <p class="text-sm font-medium text-gray-500 truncate">{{ account.credentials?.email || account.accountEmail || 'No email' }}</p>
               </div>

               <div class="flex gap-3 mt-8 relative">
                  <button 
                     v-if="account.platform == 'custom-rtmp' || account.platform == 'ant-media'"
                     @click="editAccount(account)"
                     class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
                  >
                     <setting theme="outline" size="18" />
                  </button>
                  <button 
                     @click="syncAccount(account)"
                     class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
                  >
                     <refresh theme="outline" size="18" />
                  </button>

                  <router-link 
                     :to="account.platform === 'custom-rtmp' ? { name: 'live-studio', query: { platformId: account._id } } : { name: 'platforms-cms', query: { accountId: account._id } }"
                     class="flex-1 h-10 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wide flex items-center justify-center hover:scale-[1.02] transition-transform"
                  >
                     {{ account.platform === 'custom-rtmp' ? 'Go Live' : 'Manage' }}
                  </router-link>

                  <button 
                     @click="disconnectAccount(account)"
                     class="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center transition-colors text-red-500"
                  >
                     <close theme="outline" size="18" />
                  </button>
               </div>
           </div>
        </div>
      </div>
    </main>

    <!-- Connect Modal -->
    <el-dialog v-model="showAddModal" width="500px" class="glass-dialog" :show-close="false" destroy-on-close align-center>
      <template #header>
         <div class="text-white text-lg font-black uppercase tracking-wide">Connect Platform</div>
      </template>

      <div class="grid grid-cols-2 gap-4 mb-8">
        <div v-for="p in availablePlatforms" :key="p.id" 
           class="p-4 rounded-xl border cursor-pointer flex flex-col items-center gap-3 transition-all duration-200"
           :class="selectedPlatform === p.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'"
           @click="selectedPlatform = p.id"
        >
           <component :is="p.icon" theme="filled" size="28" :class="{'text-blue-400': selectedPlatform === p.id, 'text-gray-500': selectedPlatform !== p.id}" />
           <span class="text-xs font-bold uppercase tracking-wider" :class="selectedPlatform === p.id ? 'text-blue-400' : 'text-gray-400'">{{ p.name }}</span>
        </div>
      </div>

      <el-form :model="form" layout="vertical">
        <div v-if="selectedPlatform">
          <!-- AMS Fields -->
          <div v-if="selectedPlatform === 'ant-media'">
            <div class="mb-4">
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Internal Name</label>
              <el-input v-model="form.name" placeholder="e.g. My AMS Instance" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Server URL</label>
              <el-input v-model="form.serverUrl" placeholder="https://antmedia.server.com:5443" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Admin Email</label>
              <el-input v-model="form.email" placeholder="admin@server.com" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Password</label>
              <el-input v-model="form.password" type="password" show-password class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">App Name</label>
              <el-input v-model="form.appName" placeholder="LiveApp" class="glass-input" />
            </div>
          </div>

          <!-- Custom RTMP -->
          <div v-else-if="selectedPlatform === 'custom-rtmp'">
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Internal Name</label>
              <el-input v-model="form.name" placeholder="e.g. Custom Endpoint" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">RTMP URL</label>
              <el-input v-model="form.rtmpUrl" placeholder="rtmp://server.com/app" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Stream Key</label>
              <el-input v-model="form.streamKey" type="password" show-password class="glass-input" />
            </div>
          </div>

          <!-- OAuth Platforms -->
          <div v-else class="flex flex-col items-center justify-center py-8 text-center">
            <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <component :is="availablePlatforms.find(p => p.id === selectedPlatform)?.icon" theme="filled" size="32" class="text-white" />
            </div>
            <p class="text-gray-400 px-8">
              Connect your {{availablePlatforms.find(p => p.id === selectedPlatform)?.name}} account to automatically sync videos and live streams.
            </p>
          </div>
        </div>
      </el-form>

      <template #footer>
        <div class="flex gap-4">
          <button class="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors border border-white/5" @click="showAddModal = false">Cancel</button>
          <button class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-blue-600/20" :disabled="!selectedPlatform" @click="handleConnect">
            {{ loading ? 'Connecting...' : 'Connect' }}
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
  password: '',
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
  }
};

const handleConnect = async () => {
  const platformConfig = availablePlatforms.find(p => p.id === selectedPlatform.value);

  if (platformConfig?.type === 'oauth' && !editingAccountId.value) {
    await initiateOAuth(selectedPlatform.value);
    return;
  }

  if (!form.value.name) return toast.error('Account Name is required');

  if (selectedPlatform.value === 'ant-media') {
    const isPasswordRequired = !editingAccountId.value;
    if (!form.value.serverUrl || !form.value.email) return toast.error('Server URL and Email are required');
    if (isPasswordRequired && !form.value.password) return toast.error('Password is required for new connection');
  } else if (selectedPlatform.value === 'custom-rtmp') {
    if (!form.value.rtmpUrl || !form.value.streamKey) return toast.error('RTMP URL and Stream Key are required');
  }

  try {
    const payload = {
      platform: selectedPlatform.value,
      accountName: form.value.name,
      streamKey: form.value.streamKey,
      rtmpUrl: form.value.rtmpUrl,
      credentials: {
        email: form.value.email,
        password: form.value.password,
        serverUrl: form.value.serverUrl,
        appName: form.value.appName
      }
    };

    if (editingAccountId.value) {
      await platformStore.updatePlatform(editingAccountId.value, payload);
    } else {
      await platformStore.connectPlatform(payload);
    }

    showAddModal.value = false;
    resetForm();
  } catch (e) {
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
    password: '',
    appName: account.credentials?.appName || ''
  };
  showAddModal.value = true;
};

const resetForm = () => {
  form.value = { name: '', rtmpUrl: '', serverUrl: '', streamKey: '', email: '', password: '', appName: '' };
  editingAccountId.value = null;
  selectedPlatform.value = 'youtube';
};

const syncAccount = async (account: any) => {
  toast.info(`Syncing status for ${account.accountName}...`);
  setTimeout(() => toast.success('Status synchronized'), 1000);
};

onMounted(() => {
  platformStore.fetchAccounts();
});
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}


:global(.glass-input .el-input__wrapper) {
   background: rgba(255, 255, 255, 0.05) !important;
   box-shadow: none !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 12px;
}

:global(.glass-input .el-input__inner) {
   color: white !important;
   font-weight: 500;
}
</style>
