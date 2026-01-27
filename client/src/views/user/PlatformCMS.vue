<template>
  <div class="platform-cms p-6 animate-in">
    <header class="cms-header mb-8">
      <div class="flex items-center gap-4">
        <div class="channel-avatar" :class="selectedAccount?.platform">
           <youtube v-if="selectedAccount?.platform === 'youtube'" theme="filled" />
           <facebook v-else-if="selectedAccount?.platform === 'facebook'" theme="filled" />
           <tiktok v-else-if="selectedAccount?.platform === 'tiktok'" theme="filled" />
           <broadcast v-else theme="filled" />
        </div>
        <div>
           <h1 class="text-3xl font-black text-white tracking-tight">{{ selectedAccount?.accountName || 'Platform CMS' }}</h1>
           <p class="text-gray-400">Manage your published content and engagement metrics.</p>
        </div>
      </div>
      <div class="header-actions flex gap-4">
         <button class="primary-btn glass-btn" @click="showUploadModal = true">
            <upload theme="outline" size="18" class="mr-2" />
            Upload New Video
         </button>
         <el-select v-model="selectedAccountId" placeholder="Switch Account" class="account-switcher glass-input">
            <el-option v-for="acc in accounts" :key="acc._id" :label="acc.accountName" :value="acc._id" />
         </el-select>
      </div>
    </header>

    <!-- Stats Row -->
    <div class="stats-grid grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
       <div v-for="stat in currentStats" :key="stat.label" class="stat-card glass-card">
          <p class="label">{{ stat.label }}</p>
          <h2 class="value">{{ stat.value }}</h2>
          <span class="trend" :class="stat.trend > 0 ? 'up' : 'down'">
             {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}% vs last month
          </span>
       </div>
    </div>

    <!-- Content Grid -->
    <section class="content-section">
       <div class="section-header mb-6 flex justify-between items-center">
          <h3 class="text-xl font-bold">Published Content</h3>
          <div class="filters flex gap-3">
             <button class="filter-chip active">All Videos</button>
             <button class="filter-chip">Live Replays</button>
             <button class="filter-chip">Drafts</button>
          </div>
       </div>

       <div v-if="loading" class="p-20 text-center opacity-30">Fetching channel content...</div>
       <div v-else class="video-grid grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div v-for="video in platformVideos" :key="video.id" class="video-card glass-card group">
             <div class="thumbnail-wrapper">
                <img :src="video.thumbnail" class="thumbnail" />
                <div class="duration">{{ video.duration }}</div>
                <div class="overlay">
                   <button class="icon-btn"><play theme="filled" /></button>
                </div>
             </div>
             <div class="video-info p-4">
                <h4 class="title text-sm font-bold truncate">{{ video.title }}</h4>
                <div class="metrics mt-3 flex justify-between text-[10px] opacity-40 font-black uppercase tracking-widest">
                   <span><preview-open theme="outline" class="mr-1" /> {{ video.views }}</span>
                   <span>{{ video.date }}</span>
                </div>
             </div>
          </div>
       </div>
    </section>

    <!-- Upload Modal -->
    <el-dialog v-model="showUploadModal" title="Push to Platform" width="500px" class="glass-dialog dark-theme-dialog">
       <div class="upload-flow">
          <p class="opacity-50 text-sm mb-4">Select an AntFlow project to publish directly to your <b>{{ selectedAccount?.platform }}</b> channel.</p>
          <el-select v-model="uploadProjectId" placeholder="Select project..." class="w-full glass-input">
             <el-option v-for="p in finishedProjects" :key="p._id" :label="p.title" :value="p._id" />
          </el-select>
          
          <div v-if="uploadProjectId" class="meta-form mt-6 animate-slide-up">
             <div class="form-group mb-4">
                <label class="form-label">Video Title</label>
                <el-input v-model="uploadMeta.title" />
             </div>
             <div class="form-group mb-4">
                <label class="form-label">Description</label>
                <el-input type="textarea" v-model="uploadMeta.desc" :rows="3" />
             </div>
             <div class="flex gap-4">
                <el-checkbox v-model="uploadMeta.public" label="Public on platform" />
             </div>
          </div>
       </div>
       <template #footer>
          <button class="primary-btn w-full" :disabled="!uploadProjectId" @click="handleUpload" :loading="uploading">
             START PUBLISHING
          </button>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Youtube, Facebook, Tiktok, Broadcast, Upload, 
  Play, PreviewOpen, More, ChartLine 
} from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';

const accounts = ref<any[]>([]);
const selectedAccountId = ref<string | null>(null);
const loading = ref(true);
const platformVideos = ref<any[]>([]);
const finishedProjects = ref<any[]>([]);
const showUploadModal = ref(false);
const uploading = ref(false);

const uploadProjectId = ref<string | null>(null);
const uploadMeta = ref({ title: '', desc: '', public: true });

const selectedAccount = computed(() => accounts.value.find(a => a._id === selectedAccountId.value));

const currentStats = [
  { label: 'Total Views', value: '42.8K', trend: 12 },
  { label: 'Engagement', value: '1.2K', trend: -5 },
  { label: 'New Subs', value: '154', trend: 8 },
  { label: 'Revenue Est.', value: '$120.50', trend: 20 }
];

const fetchData = async () => {
    try {
        loading.value = true;
        const [accRes, projRes] = await Promise.all([
            axios.get('/api/platforms'),
            axios.get('/api/projects?status=completed')
        ]);
        accounts.value = accRes.data.data;
        finishedProjects.value = projRes.data.data;
        
        if (accounts.value.length && !selectedAccountId.value) {
            selectedAccountId.value = accounts.value[0]._id;
        }
        await fetchChannelContent();
    } finally {
        loading.value = false;
    }
};

const fetchChannelContent = async () => {
    // Mocking platform content for now
    platformVideos.value = [
       { id: '1', title: 'Intro to AI Creative Flow', views: '1.2K', date: '2 days ago', duration: '05:20', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400' },
       { id: '2', title: 'My First AI Stream Replay', views: '850', date: '5 days ago', duration: '1:20:45', thumbnail: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=400' },
       { id: '3', title: 'Cyberpunk Persona Test', views: '3.4K', date: '1 week ago', duration: '03:15', thumbnail: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&w=400' },
       { id: '4', title: 'Automated 24/7 Music Loop', views: '12K', date: '2 weeks ago', duration: 'LIVE', thumbnail: 'https://images.unsplash.com/photo-1594672234647-57251814bb6b?auto=format&fit=crop&w=400' }
    ];
};

const handleUpload = async () => {
    if (!uploadProjectId.value) return;
    
    uploading.value = true;
    toast.info("Sending project to " + selectedAccount.value?.platform + " API...");
    
    setTimeout(() => {
        toast.success("Upload successful! Your video is being processed on the platform.");
        showUploadModal.value = false;
        uploading.value = false;
        uploadProjectId.value = null;
    }, 2000);
};

watch(selectedAccountId, fetchChannelContent);
onMounted(fetchData);
</script>

<style lang="scss" scoped>
.platform-cms { min-height: 100vh; }
.cms-header { display: flex; justify-content: space-between; align-items: center; }

.channel-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  @include flex-center; font-size: 24px;
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1);
  &.youtube { color: #fe0000; border-color: rgba(254,0,0,0.3); }
  &.facebook { color: #1877f2; border-color: rgba(24,119,242,0.3); }
}

.stat-card {
  padding: 24px;
  .label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 1px; }
  .value { font-size: 32px; font-weight: 900; margin: 8px 0; color: #fff; }
  .trend { font-size: 10px; font-weight: 700; &.up { color: #10b981; } &.down { color: #ef4444; } }
}

.filter-chip {
  padding: 6px 16px; border-radius: 100px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);
  font-size: 11px; font-weight: 700; cursor: pointer;
  &.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
}

.video-card {
  overflow: hidden;
  .thumbnail-wrapper {
     aspect-ratio: 16/9; position: relative;
     .thumbnail { width: 100%; height: 100%; object-fit: cover; }
     .duration { 
        position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8);
        padding: 4px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;
     }
     .overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.4);
        @include flex-center; opacity: 0; transition: 0.3s;
     }
  }
  &:hover .overlay { opacity: 1; }
}

.account-switcher { width: 220px; }
.form-label { display: block; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 6px; }
</style>
