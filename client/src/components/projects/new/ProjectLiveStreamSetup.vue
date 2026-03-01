<template>
   <div class="live-stream-setup p-8 animate-in">
      <div class="setup-container glass-card">
         <header class="text-center mb-10">
            <div class="icon-glow mb-4">
               <broadcast theme="filled" size="48" />
            </div>
            <h1 class="text-4xl font-black tracking-tighter">{{ t('projects.new.setup.liveStream.title') }}</h1>
            <p class="opacity-50 mt-2">{{ t('projects.new.setup.liveStream.desc') }}</p>
         </header>

         <div class="setup-grid grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left: Studio Mode -->
            <div class="mode-card glass-selectable" :class="{ active: mode === 'studio' }" @click="mode = 'studio'">
               <div class="mode-icon"><camera-five theme="outline" size="32" /></div>
               <div class="mode-info">
                  <h3>{{ t('projects.new.setup.liveStream.studioMode') }}</h3>
                  <p>{{ t('projects.new.setup.liveStream.studioDesc') }}</p>
               </div>
            </div>

            <!-- Right: Video Mode -->
            <div class="mode-card glass-selectable" :class="{ active: mode === 'restream' }" @click="mode = 'restream'">
               <div class="mode-icon"><video-file theme="outline" size="32" /></div>
               <div class="mode-info">
                  <h3>{{ t('projects.new.setup.liveStream.restreamMode') }}</h3>
                  <p>{{ t('projects.new.setup.liveStream.restreamDesc') }}</p>
               </div>
            </div>
         </div>

         <!-- Video Selection for Restream Mode -->
         <div v-if="mode === 'restream'" class="video-selection mt-8 animate-slide-up">
            <h4 class="section-title">{{ t('projects.new.setup.liveStream.selectContent') }}</h4>
            <div class="grid grid-cols-1 gap-4 mt-4">
               <el-select v-model="selectedProjectId" :placeholder="t('projects.new.setup.liveStream.selectProject')"
                  class="w-full glass-input">
                  <el-option v-for="proj in finishedProjects" :key="proj._id" :label="proj.title" :value="proj._id" />
               </el-select>
               <div class="flex items-center gap-4 mt-2">
                  <el-checkbox v-model="loopEnabled" :label="t('projects.new.setup.liveStream.loopMode')" />
               </div>
            </div>
         </div>

         <div class="platform-selection mt-10">
            <h4 class="section-title">{{ t('projects.new.setup.liveStream.selectDestinations') }}</h4>
            <div v-if="loading" class="p-4 opacity-50">{{ t('projects.new.setup.liveStream.loading') }}</div>
            <div v-else-if="!platforms.length"
               class="empty-notif p-6 text-center border-2 border-dashed border-white/10 rounded-2xl">
               <p class="opacity-50 mb-4">{{ t('projects.new.setup.liveStream.noPlatforms') }}</p>
               <router-link to="/platforms" class="primary-btn secondary inline-block">{{ t('projects.new.setup.liveStream.connectFirst') }}</router-link>
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
               {{ mode === 'studio' ? t('projects.new.setup.liveStream.studioBtn') : t('projects.new.setup.liveStream.restreamBtn') }}
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
import { useI18n } from 'vue-i18n';

const router = useRouter();
const platformStore = usePlatformStore();
const projectStore = useProjectStore();
const streamingStore = useStreamingStore();
const { t } = useI18n()

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
      const toastId = toast.loading(t('projects.new.setup.liveStream.toasts.initializing'));
      try {
         await streamingStore.startStream({
            projectId: selectedProjectId.value,
            platformAccountIds: selectedPlatforms.value,
            loop: loopEnabled.value
         });

         toast.success(t('projects.new.setup.liveStream.toasts.success'), { id: toastId });
         router.push('/dashboard');
      } catch (e: any) {
         // Error toast might be handled in store, but we update the loading toast here
         toast.error(e.response?.data?.error || t('projects.new.setup.liveStream.toasts.failed'), { id: toastId });
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
