<template>
    <div class="resource-pool h-full flex flex-col p-4 animate-in">
        <header class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-40">Resources</h3>
            <div class="flex items-center gap-2">
                <el-segmented v-model="activeTab" :options="tabOptions" size="small" class="studio-segmented" />
                <el-upload 
                  v-if="activeTab === 'pool'"
                  :action="studioStore.currentProjectId ? `/api/projects/${studioStore.currentProjectId}/assets/upload` : '/api/s3/upload'" 
                  :show-file-list="false" 
                  :on-success="handleUploadSuccess"
                  :before-upload="beforeUpload" 
                  class="upload-trigger"
                >
                    <el-button type="primary" size="small" circle>
                        <plus theme="outline" size="14" />
                    </el-button>
                </el-upload>
            </div>
        </header>

        <!-- Search for Library -->
        <div v-if="activeTab === 'library'" class="mb-4">
            <el-input
                v-model="librarySearch"
                placeholder="Search Library..."
                size="small"
                class="studio-search"
                clearable
                @input="searchLibrary"
            >
                <template #prefix>
                    <search theme="outline" size="14" />
                </template>
            </el-input>
        </div>

        <div class="resource-grid flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            <!-- Session Pool View -->
            <template v-if="activeTab === 'pool'">
                <div v-if="resourcePool.length === 0"
                    class="empty-state py-12 text-center opacity-20 border-2 border-dashed border-white/10 rounded-2xl">
                    <p class="text-[10px] font-bold uppercase tracking-widest">No assets loaded</p>
                    <p class="text-[8px] mt-1">Upload images or videos for your show</p>
                </div>

                <div v-for="asset in resourcePool" :key="asset.id"
                    class="resource-card group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-white/5 hover:border-blue-500/50 transition-all">
                    <img v-if="asset.type === 'image'" :src="asset.url"
                        class="absolute inset-0 w-full h-full object-cover" />
                    <video v-else :src="asset.url" class="absolute inset-0 w-full h-full object-cover" muted loop />

                    <div
                        class="overlay absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p class="text-[10px] font-bold truncate mb-2">{{ asset.name }}</p>
                        <div class="actions flex gap-2">
                            <el-button size="small" class="glass-btn flex-1 !text-[8px]"
                                @click="setAsBackground(asset)">BG</el-button>
                            <el-button size="small" class="glass-btn flex-1 !text-[8px]"
                                @click="setAsMedia(asset)">MEDIA</el-button>
                            <el-button size="small" type="danger" circle @click="studioStore.removeResource(asset.id)">
                                <delete theme="outline" size="12" />
                            </el-button>
                        </div>
                    </div>

                    <div
                        class="type-badge absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[8px] font-black uppercase tracking-tighter">
                        {{ asset.type }}
                    </div>
                </div>
            </template>

            <!-- Global Library View -->
            <template v-else>
                <div v-if="loading" class="py-12 text-center opacity-40">
                    <el-icon class="is-loading"><loading-icon /></el-icon>
                    <p class="text-[10px] mt-2 font-bold uppercase">Fetching Hub...</p>
                </div>
                <div v-else-if="libraryResources.length === 0" class="empty-state py-12 text-center opacity-20 border-2 border-dashed border-white/10 rounded-2xl">
                    <p class="text-[10px] font-bold uppercase tracking-widest">Library Empty</p>
                </div>
                <div v-for="item in libraryResources" :key="item._id"
                    class="resource-card group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-white/5 hover:border-blue-500/50 transition-all">
                    <img v-if="item.contentType?.startsWith('image/')" :src="getFileUrl(item.key)"
                        class="absolute inset-0 w-full h-full object-cover" />
                    <video v-else-if="item.contentType?.startsWith('video/')" :src="getFileUrl(item.key)" class="absolute inset-0 w-full h-full object-cover" muted loop />
                    <div v-else class="absolute inset-0 flex items-center justify-center bg-white/5">
                         <component :is="getIconComponent(item.contentType)" size="32" class="opacity-20" />
                    </div>

                    <div
                        class="overlay absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center p-3">
                        <p class="text-[10px] font-bold truncate mb-3 w-full text-center">{{ item.fileName }}</p>
                        <el-button size="small" class="primary-studio-btn w-full !text-[10px]" @click="addToPool(item)">
                            <plus theme="outline" size="12" class="mr-1" /> Add to Session
                        </el-button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Plus, Delete, Search, Loading as LoadingIcon, FolderOne, FileWord, FilePdf, FileExcel, FilePpt, PlayTwo } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { useMediaStore } from '@/stores/media';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';

const studioStore = useStudioStore();
const mediaStore = useMediaStore();
const { resourcePool } = storeToRefs(studioStore);
const { resources: libraryResources, loading } = storeToRefs(mediaStore);

const activeTab = ref('pool');
const tabOptions = [
    { label: 'Pool', value: 'pool' },
    { label: 'Library', value: 'library' }
];

const librarySearch = ref('');

const searchLibrary = () => {
    mediaStore.fetchMedia({ search: librarySearch.value, limit: 20 });
};

watch(activeTab, (newTab) => {
    if (newTab === 'library' && libraryResources.value.length === 0) {
        searchLibrary();
    }
});

const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
        toast.error('Only images and videos are allowed');
        return false;
    }
    return true;
};

const handleUploadSuccess = (response: any, file: any) => {
    const asset = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: file.raw.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
        url: response.url || URL.createObjectURL(file.raw),
        thumbnail: response.url || URL.createObjectURL(file.raw),
        addedAt: Date.now()
    };
    studioStore.addResource(asset);
    toast.success('Asset added to pool');

    // Also tell mediaStore to refresh so it shows in library later
    mediaStore.fetchMedia();
};

const addToPool = (item: any) => {
    const asset = {
        id: item._id, // use real ID
        name: item.fileName,
        type: item.contentType?.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
        url: getFileUrl(item.key),
        thumbnail: getFileUrl(item.key),
        addedAt: Date.now()
    };
    
    // Check if already in pool
    if (resourcePool.value.some(a => a.id === asset.id)) {
        toast.error('Asset already in session pool');
        return;
    }

    studioStore.addResource(asset);
    toast.success(`${item.fileName} added to session`);
    activeTab.value = 'pool'; // Switch back to see it
};

const setAsBackground = (asset: any) => {
    studioStore.updateVisualSettings({
        background: {
            mode: 'virtual',
            blurLevel: 'low',
            assetUrl: asset.url,
            isAssetVideo: asset.type === 'video',
            is360: false
        }
    });
    toast.success('Background updated');
};

const setAsMedia = (asset: any) => {
    studioStore.setMedia(asset.id);
    toast.success('Media source updated');
};

const getIconComponent = (contentType: string) => {
  if (contentType?.startsWith('video/')) return PlayTwo;
  if (contentType?.includes('pdf')) return FilePdf;
  if (contentType?.includes('word')) return FileWord;
  if (contentType?.includes('excel')) return FileExcel;
  if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) return FilePpt;
  return FolderOne;
};
</script>

<style scoped lang="scss">
.glass-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
}

.studio-segmented {
  background: rgba(255, 255, 255, 0.05) !important;
  padding: 2px !important;
  border-radius: 12px !important;
}

.studio-search {
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    box-shadow: none !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 10px !important;
    padding: 2px 12px !important;
  }
}

.primary-studio-btn {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: white !important;
  font-weight: 800 !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
}

.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
}
</style>
