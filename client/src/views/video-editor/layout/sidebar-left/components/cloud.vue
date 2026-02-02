<template>
  <div class="cloud-drive-browser p-4 h-full flex flex-col">
    <div class="header mb-6 flex justify-between items-center">
      <div>
        <h3 class="text-white font-black uppercase text-xs tracking-[0.2em]">Cloud Storage Hub</h3>
        <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Direct Asset Injection</p>
      </div>
      <el-button @click="fetchFiles" circle size="small" class="glass-btn">
        <template #icon><Refresh /></template>
      </el-button>
    </div>

    <div class="search-bar mb-6 relative group">
      <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <search class="text-white/20 group-focus-within:text-blue-500 transition-colors" />
      </div>
      <input 
        v-model="searchQuery" 
        placeholder="Search cloud files..." 
        class="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all"
      />
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
      <div v-if="loading" class="grid grid-cols-2 gap-3">
        <div v-for="i in 6" :key="i" class="aspect-square rounded-2xl bg-white/5 animate-pulse"></div>
      </div>
      
      <div v-else-if="filteredFiles.length === 0" class="flex flex-col items-center justify-center py-20 opacity-30">
        <folder-open class="text-4xl mb-4" />
        <p class="text-[10px] uppercase font-black tracking-widest">No assets found</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div 
          v-for="file in filteredFiles" 
          :key="file.key" 
          class="cloud-item group relative aspect-square bg-white/5 rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
          @click="importAsset(file)"
        >
          <!-- Preview -->
          <div class="absolute inset-0 flex items-center justify-center p-2 bg-black/40">
            <img v-if="isImage(file.url)" :src="file.url" class="w-full h-full object-cover rounded-xl" />
            <div v-else class="flex flex-col items-center gap-2">
               <video-one v-if="isVideo(file.url)" class="text-2xl text-blue-400" />
               <music v-else-if="isAudio(file.url)" class="text-2xl text-purple-400" />
               <file-doc v-else class="text-2xl text-gray-400" />
            </div>
          </div>

          <!-- Overlay -->
          <div class="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
             <add-one class="text-2xl text-white mb-2" />
             <p class="text-[8px] text-white font-black uppercase text-center truncate w-full">{{ file.key.split('/').pop() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Metadata Sync info -->
    <div class="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
       <info class="text-blue-400 text-sm mt-0.5" />
       <p class="text-[9px] text-blue-400/70 font-bold uppercase leading-relaxed">
         Assets imported from cloud storage are added as external references. Ensure your storage CORS settings are configured.
       </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMediaStore } from '@/stores/media';
import { Refresh, Search, FolderOpen, VideoOne, Music, FileDoc, AddOne, Info } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { toast } from 'vue-sonner';

const mediaStore = useMediaStore();
const editorStore = useEditorStore();
const files = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value;
  const q = searchQuery.value.toLowerCase();
  return files.value.filter(f => f.key.toLowerCase().includes(q));
});

const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);
const isAudio = (url: string) => /\.(mp3|wav|m4a)$/i.test(url);

const fetchFiles = async () => {
  loading.value = true;
  try {
    const res = await mediaStore.fetchCloudMedia();
    files.value = res.data.files || [];
  } catch (error) {
    console.error('Failed to sync cloud assets:', error);
  } finally {
    loading.value = false;
  }
};

const importAsset = async (file: any) => {
  try {
    const type = isImage(file.url) ? 'image' : isVideo(file.url) ? 'video' : isAudio(file.url) ? 'audio' : null;
    if (!type) {
      toast.error('Unsupported file format');
      return;
    }

    if (type === 'image') {
       await editorStore.addImage({ src: file.url, name: file.key });
    } else if (type === 'video') {
       await editorStore.addVideo({ src: file.url, name: file.key });
    } else if (type === 'audio') {
       await editorStore.addAudio({ src: file.url, name: file.key });
    }
    toast.success('Asset synced to canvas');
  } catch (error) {
    toast.error('Failed to import asset');
  }
};

onMounted(fetchFiles);
</script>

<style scoped>
.glass-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
}
.glass-btn:hover {
  background: rgba(37, 99, 235, 0.2);
  border-color: rgba(37, 99, 235, 0.5);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
