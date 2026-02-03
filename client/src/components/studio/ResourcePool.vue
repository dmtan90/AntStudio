<template>
    <div class="resource-pool h-full flex flex-col p-4 animate-in">
        <header class="flex justify-between items-center mb-6">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-40">Resource Pool</h3>
            <el-upload action="/api/s3/upload" :show-file-list="false" :on-success="handleUploadSuccess"
                :before-upload="beforeUpload" class="upload-trigger">
                <el-button type="primary" size="small" circle>
                    <plus theme="outline" size="14" />
                </el-button>
            </el-upload>
        </header>

        <div class="resource-grid flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
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
        </div>
    </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';

const studioStore = useStudioStore();
const { resourcePool } = storeToRefs(studioStore);

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
};

const setAsBackground = (asset: any) => {
    studioStore.updateVisualSettings({
        background: {
            mode: 'virtual',
            blurLevel: 'low',
            assetUrl: asset.url,
            isAssetVideo: asset.type === 'video'
        }
    });
    toast.success('Background updated');
};

const setAsMedia = (asset: any) => {
    studioStore.setMedia(asset.id);
    toast.success('Media source updated');
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
