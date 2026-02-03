<template>
   <div class="live-stream-setup p-8 animate-in">
      <div class="setup-container glass-card">
         <header class="text-center mb-10">
            <div class="icon-glow mb-4">
               <broadcast theme="filled" size="48" />
            </div>
            <h1 class="text-4xl font-black tracking-tighter">Live Stream Setup</h1>
            <p class="opacity-50 mt-2">Broadcast your creativity to multiple platforms simultaneously.</p>
         </header>

         <div class="setup-grid grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left: Studio Mode -->
            <div class="mode-card glass-selectable" :class="{ active: mode === 'studio' }" @click="mode = 'studio'">
               <div class="mode-icon"><camera-five theme="outline" size="32" /></div>
               <div class="mode-info">
                  <h3>Interactive Studio</h3>
                  <p>Live camera with AI effects, filters, and real-time interactions.</p>
               </div>
            </div>

            <!-- Right: Video Mode -->
            <div class="mode-card glass-selectable" :class="{ active: mode === 'restream' }" @click="mode = 'restream'">
               <div class="mode-icon"><video-file theme="outline" size="32" /></div>
               <div class="mode-info">
                  <h3>Video Restream</h3>
                  <p>Restream an existing video or loop a video playlist.</p>
               </div>
            </div>
         </div>

         <!-- Video Selection for Restream Mode -->
         <div v-if="mode === 'restream'" class="video-selection mt-8 animate-slide-up">
            <h4 class="section-title">Select Content</h4>
            <div class="grid grid-cols-1 gap-4 mt-4">
               <el-select v-model="selectedProjectId" placeholder="Select a finished project..."
                  class="w-full glass-input">
                  <el-option v-for="proj in finishedProjects" :key="proj._id" :label="proj.title" :value="proj._id" />
               </el-select>
               <div class="flex items-center gap-4 mt-2">
                  <el-checkbox v-model="loopEnabled" label="Continuous Loop (24/7 Mode)" />
               </div>
            </div>
         </div>

         <div class="platform-selection mt-10">
            <h4 class="section-title">Select Destinations</h4>
            <div v-if="loading" class="p-4 opacity-50">Loading platforms...</div>
            <div v-else-if="!platforms.length"
               class="empty-notif p-6 text-center border-2 border-dashed border-white/10 rounded-2xl">
               <p class="opacity-50 mb-4">No platforms connected yet.</p>
               <router-link to="/platforms" class="primary-btn secondary inline-block">Connect Platforms
                  First</router-link>
            </div>
            <div v-else class="platforms-list grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
               <div v-for="p in platforms" :key="p._id" class="p-pill glass-selectable"
                  :class="{ active: selectedPlatforms.includes(p._id) }" @click="togglePlatform(p._id)">
                  <youtube v-if="p.platform === 'youtube'" theme="filled" />
                  <facebook v-else-if="p.platform === 'facebook'" theme="filled" />
                  <tiktok v-else-if="p.platform === 'tiktok'" theme="filled" />
                  <broadcast v-else theme="filled" />
                  <span>{{ p.accountName }}</span>
               </div>
            </div>
         </div>

         <div class="setup-footer mt-12 flex justify-center">
            <button class="primary-btn px-12 h-14 text-lg font-black" :disabled="!isConfigValid" @click="startStream">
               {{ mode === 'studio' ? 'ENTER BROADCAST STUDIO' : 'START AUTOMATED RESTREAM' }}
            </button>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
   Broadcast, CameraFive, VideoFile, Youtube,
   Facebook, Tiktok, Connection
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { usePlatformStore } from '@/stores/platform';
import { useProjectStore } from '@/stores/project';
import { useStreamingStore } from '@/stores/streaming';
import { storeToRefs } from 'pinia';

const router = useRouter();
const platformStore = usePlatformStore();
const projectStore = useProjectStore();
const streamingStore = useStreamingStore();

const { accounts: platforms } = storeToRefs(platformStore);
const { projects: finishedProjects } = storeToRefs(projectStore);

const mode = ref('studio');
const selectedPlatforms = ref<string[]>([]);
const selectedProjectId = ref<string | null>(null);
const loopEnabled = ref(true);
const loading = ref(true);

const isConfigValid = computed(() => {
   if (!selectedPlatforms.value.length) return false;
   if (mode.value === 'restream' && !selectedProjectId.value) return false;
   return true;
});

const fetchData = async () => {
   try {
      loading.value = true;
      await Promise.all([
         platformStore.fetchAccounts(),
         projectStore.fetchProjects({ status: 'completed' })
      ]);
      // Data is reactive via storeToRefs, no need to manually assign
   } finally {
      loading.value = false;
   }
};

const togglePlatform = (id: string) => {
   const idx = selectedPlatforms.value.indexOf(id);
   if (idx > -1) selectedPlatforms.value.splice(idx, 1);
   else selectedPlatforms.value.push(id);
};

const startStream = async () => {
   if (mode.value === 'studio') {
      router.push({
         name: 'live-studio',
         query: { platforms: selectedPlatforms.value.join(',') }
      });
   } else {
      const toastId = toast.loading("Initializing restream engine...");
      try {
         await streamingStore.startStream({
            projectId: selectedProjectId.value,
            platformAccountIds: selectedPlatforms.value,
            loop: loopEnabled.value
         });

         toast.success("Automated restream started! Check your platforms.", { id: toastId });
         router.push('/dashboard');
      } catch (e: any) {
         // Error toast might be handled in store, but we update the loading toast here
         toast.error(e.response?.data?.error || "Failed to start restream", { id: toastId });
      }
   }
};

onMounted(fetchData);
</script>

<style lang="scss" scoped>
.live-stream-setup {
   min-height: auto;
   display: flex;
   align-items: center;
   justify-content: center;
   padding: 40px 20px;
}

.setup-container {
   max-width: 900px;
   width: 100%;
   padding: 48px;
}

.icon-glow {
   width: 96px;
   height: 96px;
   border-radius: 50%;
   background: rgba($primary-rgb, 0.1);
   color: #3b82f6;
   @include flex-center;
   margin: 0 auto;
   box-shadow: 0 0 30px rgba($primary-rgb, 0.2);
}

.mode-card {
   padding: 32px;
   border-radius: 24px;
   display: flex;
   flex-direction: column;
   gap: 20px;

   h3 {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
   }

   p {
      font-size: 14px;
      opacity: 0.5;
      line-height: 1.5;
   }

   &.active {
      background: rgba($primary-rgb, 0.1);
      border-color: rgba($primary-rgb, 0.4);
      color: #3b82f6;
   }
}

.section-title {
   font-size: 11px;
   font-weight: 900;
   text-transform: uppercase;
   letter-spacing: 2px;
   opacity: 0.3;
}

.p-pill {
   display: flex;
   align-items: center;
   gap: 10px;
   padding: 12px 16px;
   border-radius: 12px;
   font-size: 13px;
   font-weight: 700;

   &.active {
      color: #3b82f6;
      border-color: rgba($primary-rgb, 0.4);
   }
}
</style>
