<template>
   <div class="recordings-gallery p-6 animate-in">
      <header class="gallery-header mb-8 flex justify-between items-center">
         <div>
            <h1 class="text-3xl font-black text-white tracking-tight">Studio Archive</h1>
            <p class="text-gray-400">Manage and distribute your professional captures.</p>
         </div>
         <div class="header-stats flex gap-8">
            <div class="stat">
               <span class="label">Total Records</span>
               <span class="value">{{ recordings.length }}</span>
            </div>
            <div class="stat">
               <span class="label">Storage Used</span>
               <span class="value">1.2 GB</span>
            </div>
         </div>
      </header>

      <div v-if="loading" class="p-20 text-center opacity-30">Loading your archives...</div>
      <div v-else-if="!recordings.length" class="empty-state p-32 text-center glass-card border-dashed">
         <div class="icon-orb mb-6 mx-auto"><video-file theme="outline" size="32" /></div>
         <h3 class="text-xl font-bold">No recordings found</h3>
         <p class="opacity-50 mb-6">Start a session in the Studio to capture your first produced show.</p>
         <router-link to="/live/setup" class="primary-btn px-8 inline-block">Enter Studio</router-link>
      </div>

      <div v-else class="recordings-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         <div v-for="rec in recordings" :key="rec.id" class="rec-card glass-card group">
            <div class="thumbnail-area">
               <img :src="rec.thumbnail" class="thumbnail" />
               <div class="duration-badge">{{ rec.duration }}</div>
               <div class="overlay">
                  <button class="play-btn" @click="previewRec(rec)">
                     <play theme="filled" />
                  </button>
               </div>
            </div>
            <div class="rec-info p-6">
               <div class="flex justify-between items-start mb-2">
                  <h4 class="title text-lg font-bold truncate pr-4">{{ rec.title }}</h4>
                  <div class="quality-tag">{{ rec.quality }}</div>
               </div>
               <p class="date text-xs opacity-40 font-black uppercase tracking-widest">{{ rec.date }}</p>

               <div class="metadata-summary mt-4 pt-4 border-t border-white/5 flex gap-4">
                  <div class="meta-item">
                     <magic theme="outline" size="12" class="mr-1" /> {{ rec.aiEffects }} FX
                  </div>
                  <div class="meta-item">
                     <broadcast theme="outline" size="12" class="mr-1" /> {{ rec.scenes }} Scenes
                  </div>
               </div>

               <div class="actions mt-6 flex gap-3">
                  <button class="action-btn flex-1" @click="downloadRec(rec)">
                     <download theme="outline" size="14" class="mr-2" /> Download
                  </button>
                  <button class="action-btn secondary">
                     <share-two theme="outline" size="14" />
                  </button>
               </div>
            </div>
         </div>
      </div>

      <!-- Preview Media Modal -->
      <el-dialog v-model="showPreview" :title="currentRec?.title" width="800px" class="glass-dialog dark-theme-dialog">
         <div v-if="currentRec" class="preview-container aspect-video bg-black rounded-xl overflow-hidden">
            <video :src="currentRec.videoUrl" controls class="w-full h-full"></video>
         </div>
      </el-dialog>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
   VideoFile, Play, Download, ShareTwo,
   Magic, Broadcast, More
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useMediaStore } from '@/stores/media';

import { getFileUrl } from '@/utils/api';

const loading = ref(true);
const recordings = ref<any[]>([]);
const showPreview = ref(false);
const currentRec = ref<any>(null);
const mediaStore = useMediaStore();

const fetchData = async () => {
   try {
      loading.value = true;
      loading.value = true;
      const data = await mediaStore.fetchMedia({ purpose: 'recording', limit: 50 });

      if (data.success) {
         recordings.value = data.data.media.map((m: any) => ({
            id: m._id,
            title: m.fileName,
            date: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(),
            duration: m.metadata?.duration || '00:00',
            thumbnail: m.metadata?.thumbnail ? getFileUrl(m.metadata.thumbnail) : 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=400',
            quality: m.metadata?.quality || 'HD',
            aiEffects: m.metadata?.aiEffects || 0,
            scenes: m.metadata?.scenes || 0,
            videoUrl: getFileUrl(m.key),
            size: m.size
         }));
      }
   } catch (e) {
      toast.error('Failed to load recordings');
   } finally {
      loading.value = false;
   }
};

const previewRec = (rec: any) => {
   currentRec.value = rec;
   showPreview.value = true;
};

const downloadRec = (rec: any) => {
   toast.info(`Preparing ${rec.title} for download...`);
   setTimeout(() => toast.success("Download started!"), 1500);
};

onMounted(fetchData);
</script>

<style lang="scss" scoped>
.header-stats {
   .stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .label {
         font-size: 10px;
         font-weight: 900;
         text-transform: uppercase;
         opacity: 0.3;
         letter-spacing: 0.1em;
      }

      .value {
         font-size: 18px;
         font-weight: 800;
         color: #3b82f6;
      }
   }
}

.rec-card {
   overflow: hidden;

   .thumbnail-area {
      aspect-ratio: 16/9;
      position: relative;

      .thumbnail {
         width: 100%;
         height: 100%;
         object-fit: cover;
      }

      .duration-badge {
         position: absolute;
         bottom: 12px;
         right: 12px;
         background: rgba(0, 0, 0, 0.8);
         padding: 4px 8px;
         border-radius: 6px;
         font-size: 10px;
         font-weight: 800;
      }

      .overlay {
         position: absolute;
         inset: 0;
         background: rgba(0, 0, 0, 0.4);
         @include flex-center;
         opacity: 0;
         transition: 0.3s;

         .play-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #fff;
            color: #000;
            border: none;
            font-size: 20px;
            cursor: pointer;
         }
      }
   }

   &:hover .overlay {
      opacity: 1;
   }

   .quality-tag {
      background: #1e1b4b;
      color: #818cf8;
      font-size: 9px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(129, 140, 248, 0.3);
   }

   .meta-item {
      display: flex;
      align-items: center;
      font-size: 11px;
      opacity: 0.5;
      font-weight: 700;
   }

   .action-btn {
      height: 36px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      @include flex-center;
      cursor: pointer;
      transition: 0.2s;

      &:hover {
         background: #fff;
         color: #000;
         border-color: #fff;
      }

      &.secondary {
         width: 36px;
         flex: none;
      }
   }
}
</style>
