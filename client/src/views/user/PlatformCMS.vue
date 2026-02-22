<template>
  <div class="cms-page min-h-screen bg-[#0a0a0c] text-white font-outfit h-full overflow-y-auto">
     <!-- Header -->
     <header class="relative py-12 px-8 overflow-hidden border-b border-white/5 bg-[#0a0a0c]">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-purple-900/10 pointer-events-none"></div>
        <div class="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div class="flex items-center gap-6">
              <button 
                 @click="$router.push('/platforms')" 
                 class="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-white"
              >
                 <arrow-left theme="outline" size="24" />
              </button>
              <div>
                 <div class="flex items-center gap-3 mb-1">
                    <component :is="platformIcon" theme="filled" size="24" :class="platformClass" />
                    <h1 class="text-3xl font-black tracking-tight">{{ accountName }}</h1>
                 </div>
                 <p class="text-gray-400 font-medium">Manage VoDs, Clips, and Live Streams.</p>
              </div>
           </div>

           <div class="flex items-center gap-3">
              <button 
                 @click="showLiveStreamDialog = true"
                 class="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 animate-pulse"
              >
                 <broadcast theme="outline" size="16" /> Go Live
              </button>
              <button 
                 @click="showUploadDialog = true"
                 class="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-colors"
              >
                 <upload-one theme="outline" size="16" /> Upload
              </button>
              <button 
                 @click="refreshData" 
                 :disabled="loading"
                 class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
              >
                 <refresh theme="outline" size="18" :class="{ 'animate-spin': loading }" />
              </button>
           </div>
        </div>
     </header>

     <main class="max-w-7xl mx-auto py-8 px-8">
        <!-- Stats Overview -->
        <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div class="bg-black rounded-3xl p-1 border border-white/5">
              <div class="bg-[#0f0f12] rounded-[20px] p-6 h-full flex flex-col justify-between relative overflow-hidden">
                 <div class="absolute top-0 right-0 p-4 opacity-10"><user theme="filled" size="48" /></div>
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Subscriber Count</div>
                 <div class="text-4xl font-black text-white">{{ formatNumber(stats.followers || stats.subscribers || 0) }}</div>
              </div>
           </div>
           
           <div class="bg-black rounded-3xl p-1 border border-white/5">
              <div class="bg-[#0f0f12] rounded-[20px] p-6 h-full flex flex-col justify-between relative overflow-hidden">
                 <div class="absolute top-0 right-0 p-4 opacity-10"><play-one theme="filled" size="48" /></div>
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Views</div>
                 <div class="text-4xl font-black text-white">{{ formatNumber(stats.views) }}</div>
              </div>
           </div>

           <div class="bg-black rounded-3xl p-1 border border-white/5">
              <div class="bg-[#0f0f12] rounded-[20px] p-6 h-full flex flex-col justify-between relative overflow-hidden">
                 <div class="absolute top-0 right-0 p-4 opacity-10"><video-one theme="filled" size="48" /></div>
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Video Library</div>
                 <div class="text-4xl font-black text-white">{{ formatNumber(stats.videos) }}</div>
              </div>
           </div>
        </div>

        <!-- Content Tabs -->
        <div class="flex items-center gap-8 border-b border-white/10 mb-8">
           <button v-for="tab in ['Videos', 'Analytics']" :key="tab"
              class="pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all"
              :class="activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'"
              @click="activeTab = tab">
              {{ tab }}
           </button>
        </div>

        <!-- Videos Tab -->
        <div v-if="activeTab === 'Videos'">
           <!-- Filters -->
           <div class="flex flex-wrap items-center gap-4 mb-8">
              <div class="relative group">
                 <search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size="16" />
                 <input 
                    v-model="filters.search" 
                    placeholder="Search videos..." 
                    class="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-64"
                    @keyup.enter="handleSearch"
                 />
              </div>
              
              <el-select v-model="filters.sort" placeholder="Sort By" class="glass-select w-40" popper-class="glass-dropdown" @change="loadData">
                 <el-option label="Newest First" value="newest" />
                 <el-option label="Most Views" value="views" />
              </el-select>
           </div>

           <!-- Loader -->
           <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div v-for="i in 8" :key="i" class="aspect-video bg-white/5 rounded-2xl animate-pulse"></div>
           </div>

           <!-- Video Grid -->
           <div v-else-if="videos.length" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div v-for="video in videos" :key="video.id" class="group relative cursor-pointer" @click="openVideoDetail(video)">
                 <div class="aspect-video bg-black rounded-2xl overflow-hidden mb-3 relative border border-white/5 group-hover:border-white/20 transition-colors">
                    <img :src="getFileUrl(video.thumbnail)" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                    
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <play-one theme="filled" size="40" class="text-white drop-shadow-xl" />
                    </div>

                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                       <button class="bg-red-500/90 text-white p-2 rounded-lg backdrop-blur-md hover:bg-red-600 transition-colors" @click.stop.prevent="deleteVideo(video.id)">
                          <delete theme="outline" size="14" />
                       </button>
                    </div>
                    
                    <div class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold font-mono text-white backdrop-blur-md" v-if="video.duration">
                       {{ formatDuration(video.duration) }}
                    </div>
                 </div>

                 <div>
                    <h3 class="font-bold text-white text-sm truncate mb-1 pr-4" :title="video.title">{{ video.title }}</h3>
                    <div class="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                       <span>{{ formatDate(video.publishedAt) }}</span>
                       <span class="flex items-center gap-1">
                          <preview-open size="12" /> {{ formatNumber(video.views) }}
                       </span>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Empty State -->
           <div v-else class="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
              <div class="text-6xl mb-4 grayscale opacity-20">📼</div>
              <h3 class="text-xl font-bold text-white mb-2">No videos found</h3>
              <p class="text-gray-500">Upload or sync content to see it here.</p>
           </div>

           <div class="flex justify-center mt-12">
               <el-pagination 
                  v-model:current-page="filters.page"
                  v-model:page-size="filters.limit"
                  :total="totalVideos"
                  :page-sizes="[12, 24, 48]"
                  layout="prev, pager, next"
                  class="glass-pagination"
                  @current-change="handlePageChange"
                  @size-change="handleSizeChange"
               />
           </div>
        </div>

        <!-- Analytics Tab -->
        <div v-else-if="activeTab === 'Analytics'">
           <div v-if="stats" class="space-y-8">
              <!-- Engagement -->
              <div class="bg-white/5 border border-white/5 rounded-3xl p-8">
                 <h3 class="text-lg font-black uppercase tracking-widest text-gray-500 mb-8 flex items-center gap-3">
                    <play-one theme="filled" size="18" class="text-blue-500" />
                    Engagement Overview
                 </h3>
                 <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="p-6 bg-black/40 rounded-2xl border border-white/5">
                       <div class="text-[10px] font-black uppercase text-gray-500 mb-2">Avg Views/Video</div>
                       <div class="text-3xl font-black text-white">{{ formatNumber(Math.round((stats.views || 0) / (stats.videos || 1))) }}</div>
                    </div>
                    <!-- Add more metrics here if needed -->
                 </div>
              </div>

               <!-- Top Videos -->
               <div class="bg-white/5 border border-white/5 rounded-3xl p-8">
                 <h3 class="text-lg font-black uppercase tracking-widest text-gray-500 mb-8 flex items-center gap-3">
                    <video-one theme="filled" size="18" class="text-purple-500" />
                    Top Performing
                 </h3>
                 
                 <div v-if="topVideos.length" class="space-y-4">
                     <div v-for="(video, index) in topVideos" :key="video.id" 
                        class="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                        @click="openVideoDetail(video)"
                     >
                        <div class="text-2xl font-black text-gray-600 w-8 text-center group-hover:text-white transition-colors">#{{ index + 1 }}</div>
                        <div class="w-32 aspect-video bg-black rounded-lg overflow-hidden relative">
                           <img :src="video.thumbnail" class="w-full h-full object-cover" />
                        </div>
                        <div class="flex-1 min-w-0">
                           <div class="font-bold text-white text-lg truncate mb-1">{{ video.title }}</div>
                           <div class="text-xs font-mono text-gray-500">{{ formatDate(video.publishedAt) }}</div>
                        </div>
                        <div class="text-right px-4">
                           <div class="text-2xl font-black text-green-400">{{ formatNumber(video.views) }}</div>
                           <div class="text-[10px] font-black uppercase text-gray-500">Views</div>
                        </div>
                     </div>
                 </div>
                 <div v-else class="text-center py-12 text-gray-500">No data available</div>
               </div>
           </div>
        </div>
     </main>

     <!-- Dialogs (Video Details, Upload, Live) -->
     <!-- Reusing existing logic but wrapping in glass-dialog class -->
     <el-dialog v-model="showVideoDialog" width="900px" class="glass-dialog" :show-close="false" destroy-on-close align-center>
        <div class="grid grid-cols-3 gap-8 h-[600px] text-white">
           <div class="col-span-2 flex flex-col h-full">
               <div class="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-6 flex-shrink-0">
                  <iframe v-if="selectedVideo?.platform === 'youtube'" :src="`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-500 bg-[#0a0a0c]">Preview Unavailable</div>
               </div>
               <div>
                  <h2 class="text-2xl font-bold leading-tight mb-2">{{ selectedVideo?.title }}</h2>
                  <p class="text-gray-400 text-sm leading-relaxed">{{ selectedVideo?.description }}</p>
               </div>
           </div>

           <div class="col-span-1 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col">
              <div class="flex border-b border-white/10 mb-4">
                  <button v-for="tab in ['Overview', 'Comments']" :key="tab"
                     class="flex-1 pb-3 text-xs font-black uppercase tracking-widest text-center transition-colors"
                     :class="activeDetailTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'"
                     @click="activeDetailTab = tab">
                     {{ tab }}
                  </button>
               </div>
               
               <div class="flex-1 overflow-y-auto custom-scrollbar">
                  <div v-if="activeDetailTab === 'Overview'" class="space-y-4">
                     <div class="bg-black/20 p-4 rounded-xl">
                        <div class="text-[10px] text-gray-500 font-black uppercase mb-1">Views</div>
                        <div class="text-2xl font-black">{{ formatNumber(selectedVideo?.stats?.views || selectedVideo?.views || 0) }}</div>
                     </div>
                     <div class="bg-black/20 p-4 rounded-xl">
                        <div class="text-[10px] text-gray-500 font-black uppercase mb-1">Published</div>
                        <div class="text-sm font-bold">{{ formatDate(selectedVideo?.publishedAt) }}</div>
                     </div>
                  </div>
                  
                  <div v-if="activeDetailTab === 'Comments'" class="space-y-4">
                     <div v-if="store.comments.length === 0" class="text-center py-8 text-gray-500 text-xs">No comments</div>
                     <div v-for="comment in store.comments" :key="comment.id" class="flex gap-3 text-sm pb-3 border-b border-white/5 last:border-0">
                        <div class="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                           <img v-if="comment.avatar" :src="comment.avatar" class="w-full h-full" />
                        </div>
                        <div>
                           <div class="font-bold text-xs mb-1">{{ comment.author }} <span class="text-gray-500 font-normal ml-1">{{ formatDate(comment.date) }}</span></div>
                           <p class="text-gray-300 text-xs leading-relaxed">{{ comment.text }}</p>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        </div>
     </el-dialog>

     <!-- Simple Upload & Live Dialogs Implementation (omitted for brevity but would follow same style) -->
     <!-- Keeping the existing dialog structure but wrapping logic -->
     <el-dialog v-model="showUploadDialog" title="Upload Video" width="500px" class="glass-dialog" :show-close="false">
         <!-- ... Upload form content with glass inputs ... -->
         <el-form :model="uploadForm" layout="vertical">
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Title</label>
               <el-input v-model="uploadForm.title" class="glass-input" />
            </div>
            <div class="mb-4">
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Description</label>
               <el-input v-model="uploadForm.description" type="textarea" :rows="3" class="glass-input" />
            </div>
            
            <el-tabs v-model="uploadSource" class="glass-tabs">
               <el-tab-pane label="Local File" name="local">
                  <div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-white/30 transition-colors cursor-pointer relative bg-white/5">
                     <input type="file" ref="fileInput" accept="video/*" class="absolute inset-0 opacity-0 cursor-pointer" @change="handleFileChange">
                     <div v-if="selectedFile">
                        <video-one theme="filled" size="24" class="text-blue-500 mb-2 mx-auto" />
                        <p class="text-xs font-bold">{{ selectedFile.name }}</p>
                     </div>
                     <div v-else>
                        <upload-one theme="outline" size="24" class="text-gray-500 mb-2 mx-auto" />
                        <p class="text-xs text-gray-500">Click to upload video</p>
                     </div>
                  </div>
               </el-tab-pane>
               <el-tab-pane label="From Projects" name="archive">
                   <div class="text-center py-4 text-xs text-gray-500">Select previously rendered project</div>
               </el-tab-pane>
            </el-tabs>
         </el-form>
         <template #footer>
            <div class="flex gap-3">
               <button class="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors" @click="showUploadDialog = false">Cancel</button>
               <button class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-blue-600/20" @click="uploadVideo" :disabled="uploading">
                  {{ uploading ? 'Uploading...' : 'Upload' }}
               </button>
            </div>
         </template>
     </el-dialog>

     <el-dialog v-model="showLiveStreamDialog" title="Live Streaming" width="600px" class="glass-dialog" :show-close="false">
        <div class="grid grid-cols-2 gap-6 mb-8">
           <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Stream Title</label>
              <el-input v-model="liveForm.title" class="glass-input" />
           </div>
           <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Privacy</label>
              <el-select v-model="liveForm.privacy" class="glass-select w-full" popper-class="glass-dropdown">
                 <el-option label="Public" value="public" />
                 <el-option label="Private" value="private" />
              </el-select>
           </div>
        </div>

        <div class="bg-black/40 rounded-xl border border-white/5 p-6 mb-8">
            <div class="flex justify-between items-start mb-4">
               <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">RTMP URL</span>
               <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-blue-400 truncate max-w-[200px]">{{ account?.rtmpUrl || 'N/A' }}</span>
                  <copy theme="outline" size="14" class="text-gray-500 cursor-pointer hover:text-white" @click="copyToClipboard(account?.rtmpUrl)" />
               </div>
            </div>
            <div class="flex justify-between items-start">
               <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">Stream Key</span>
               <div class="flex items-center gap-2">
                   <span class="text-xs font-mono text-purple-400">•••••••••••••</span>
                   <copy theme="outline" size="14" class="text-gray-500 cursor-pointer hover:text-white" @click="copyToClipboard(account?.streamKey)" />
               </div>
            </div>
        </div>

        <div class="flex gap-4">
           <button class="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors" @click="setupLive">
              Refresh Credentials
           </button>
           <button class="flex-1 h-12 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2" @click="goLive">
              <broadcast theme="outline" size="16" /> Launch Studio
           </button>
        </div>
     </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlatformStore } from '@/stores/platform';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';
import {
   ArrowLeft, Refresh, PlayOne, VideoOne,
   Youtube, Facebook, Tiktok, Broadcast, Connection,
   User, UploadOne, Delete, PreviewOpen, Broadcast as Construction,
   Search, Loading, Copy
} from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import { cn } from '@/utils/ui';

const route = useRoute();
const router = useRouter();
const accountId = route.query.accountId as string;
const store = usePlatformStore();
const projectStore = useProjectStore();

const activeTab = ref('Videos');
const showUploadDialog = ref(false);
const uploadSource = ref('local');
const uploadForm = ref({ title: '', description: '' });
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const archiveVideos = ref<any[]>([]);
const loadingArchive = ref(false);
const selectedArchiveVideo = ref<any>(null);

const showVideoDialog = ref(false);
const showLiveStreamDialog = ref(false);
const selectedVideo = ref<any>(null);
const activeDetailTab = ref('Overview');

const filters = reactive({
   search: '',
   sort: 'newest',
   page: 1,
   limit: 12
});

const account = computed(() => store.accounts.find(a => a._id === accountId));
const videos = computed(() => store.videos);
const totalVideos = computed(() => store.totalVideos);
const stats = computed(() => store.stats);
const loading = computed(() => store.videoLoading);
const uploading = ref(false);

const loadingLive = ref(false);
const liveForm = reactive({
   title: '',
   description: 'Live via AntFlow',
   privacy: 'public'
});

const platformIcon = computed(() => {
   switch (account.value?.platform) {
      case 'youtube': return Youtube;
      case 'facebook': return Facebook;
      case 'tiktok': return Tiktok;
      case 'ant-media': return Broadcast;
      default: return Connection;
   }
});

const platformClass = computed(() => {
   switch (account.value?.platform) {
      case 'youtube': return 'text-red-500';
      case 'facebook': return 'text-blue-600';
      case 'tiktok': return 'text-pink-500';
      case 'ant-media': return 'text-orange-500';
      default: return 'text-gray-500';
   }
})

const accountName = computed(() => account.value?.accountName || 'Platform');
const topVideos = computed(() => {
   return [...videos.value].filter(v => v.views > 0).sort((a, b) => b.views - a.views).slice(0, 5);
});

const formatNumber = (num: number) => {
   if (!num) return '0';
   return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
}

const formatDate = (date: string) => {
   return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDuration = (val: any) => { return val || ''; }

const loadData = async () => {
   if (!accountId) return;
   await Promise.all([
      store.fetchVideos(accountId, { page: filters.page, limit: filters.limit, search: filters.search, sort: filters.sort }),
      store.fetchStats(accountId)
   ]);
}

const refreshData = async () => { await loadData(); toast.success('Data refreshed'); }
const handleSearch = () => { filters.page = 1; loadData(); }
const handlePageChange = (val: number) => { filters.page = val; loadData(); }
const handleSizeChange = (val: number) => { filters.limit = val; filters.page = 1; loadData(); }

const deleteVideo = async (videoId: string) => {
   if (!confirm('Are you sure you want to delete this video?')) return;
   await store.deleteVideo(accountId, videoId);
}

const handleFileChange = (e: Event) => {
   const target = e.target as HTMLInputElement;
   if (target.files && target.files[0]) {
      selectedFile.value = target.files[0];
      if (!uploadForm.value.title) uploadForm.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, "");
   }
}

const uploadVideo = async () => {
   if (uploadSource.value === 'local' && !selectedFile.value) return;
   uploading.value = true;
   try {
      const formData = new FormData();
      formData.append('file', selectedFile.value!);
      formData.append('title', uploadForm.value.title);
      formData.append('description', uploadForm.value.description);
      await store.uploadVideo(accountId, formData, true);
      showUploadDialog.value = false;
      loadData();
   } catch (e) {}
   uploading.value = false;
}

const openVideoDetail = (video: any) => {
   selectedVideo.value = video;
   showVideoDialog.value = true;
   activeDetailTab.value = 'Overview';
   store.fetchComments(accountId, video.id);
}

const setupLive = async () => {
   loadingLive.value = true;
   try {
      await store.fetchLiveInfo(accountId, liveForm);
      toast.success('Live stream configured');
   } catch (e) {} finally { loadingLive.value = false; }
};

const goLive = () => {
   showLiveStreamDialog.value = false;
   router.push({ name: 'live-studio', query: { platformId: accountId } });
}

const copyToClipboard = (text: string) => {
   if (!text) return;
   navigator.clipboard.writeText(text);
   toast.success('Copied');
};

onMounted(async () => {
   if (!accountId) { router.push('/platforms'); return; }
   if (store.accounts.length === 0) await store.fetchAccounts();
   await loadData();
});
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* Glass Inputs Overrides */
:global(.glass-input .el-input__wrapper),
:global(.glass-select .el-input__wrapper) {
   background: rgba(255, 255, 255, 0.05) !important;
   box-shadow: none !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 12px;
   padding-top: 4px;
   padding-bottom: 4px;
}

:global(.glass-input .el-input__inner) {
   color: white !important;
   font-weight: 500;
}

:global(.glass-pagination button),
:global(.glass-pagination li) {
   background: transparent !important; 
   color: #666;
}
:global(.glass-pagination li.is-active) {
   color: #3b82f6; 
   font-weight: 900;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}
</style>
