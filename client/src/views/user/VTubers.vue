<template>
    <div class="vtuber-library min-h-screen bg-[#0a0a0c] text-white">
        <!-- Header Section -->
        <header class="relative py-20 px-8 overflow-hidden border-b border-white/5">
            <div class="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-blue-600/5 to-transparent pointer-events-none"></div>
            <!-- Animated background glows -->
            <div class="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

            <div class="max-w-7xl mx-auto relative z-10">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
                    <div class="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-purple-400">VTuber Libraries</span>
                </div>
                <h1 class="text-6xl font-black mb-6 tracking-tighter leading-[0.9]">
                    VTuber <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-cyan-500">Avatars</span><br />
                    Collection
                </h1>
                <p class="text-xl text-gray-400 max-w-2xl leading-relaxed mb-10 font-medium">
                    Manage your persistent VTuber personalities with visual identities, voice configurations, and performance settings. Start with pre-configured templates or create custom avatars.
                </p>

                <div class="flex flex-wrap gap-4 items-center">
                    <button @click="showCreate = true" class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <User theme="filled" class="text-xl" />
                        Create New VTuber
                    </button>

                    <button @click="() => fetchLibrary()" :disabled="isLoading" class="group px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-3 relative overflow-hidden disabled:opacity-50">
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <component :is="isLoading ? Loading : 'div'" :class="{ 'animate-spin': isLoading }">
                            <Refresh v-if="!isLoading" theme="outline" class="text-xl" />
                        </component>
                        {{ isLoading ? 'Syncing...' : 'Sync Library' }}
                    </button>
                </div>
            </div>
        </header>

        <!-- Content Section -->
        <main class="max-w-7xl mx-auto py-16 px-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <el-segmented v-model="activeTab" :options="tabs" class="premium-segmented h-14 rounded-2xl bg-white/5 p-1.5 border border-white/5">
                    <template #default="scope">
                        <div class="flex items-center gap-2.5 px-5 h-full transition-all">
                            <User v-if="scope.item.value === 'my-vtubers'" class="text-purple-400" />
                            <VideoOne v-if="scope.item.value === 'live2d-presets'" class="text-pink-400" />
                            <Avatar v-if="scope.item.value === 'static-presets'" class="text-blue-400" />
                            <span class="font-black text-sm tracking-tight">{{ scope.item.name }}</span>
                        </div>
                    </template>
                </el-segmented>

                <div class="relative group min-w-[320px]">
                    <Search class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-lg group-focus-within:text-purple-400 transition-colors" />
                    <input v-model="filters.search" placeholder="Search VTubers..." class="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-purple-500/50 focus:bg-white/[0.08] transition-all outline-none text-base" />
                </div>
            </div>

            <!-- Category Filters -->
            <div v-if="activeTab !== 'my-vtubers'" class="mb-12 flex flex-wrap items-center gap-3">
                <button @click="filters.category = ''" :class="['px-6 py-3 rounded-2xl text-sm font-black transition-all border outline-none',
                    filters.category === '' ? 'bg-purple-600 text-white border-purple-600 shadow-xl shadow-purple-500/20 scale-105' : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white']">
                    All
                </button>
                <button v-for="cat in categories" :key="cat.id" @click="filters.category = cat.id" :class="['px-6 py-3 rounded-2xl text-sm font-black transition-all border outline-none',
                    filters.category === cat.id ? `text-white border-[${cat.color}] shadow-xl scale-105` : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white']" :style="filters.category === cat.id ? { backgroundColor: cat.color } : {}">
                    {{ cat.name }}
                </button>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-20">
                <div v-for="i in 8" :key="i" class="aspect-[9/16] bg-white/5 animate-pulse rounded-2xl"></div>
            </div>

            <!-- My VTubers Grid -->
            <div v-else-if="activeTab === 'my-vtubers' && vtubers.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <VTuberCard v-for="vtuber in vtubers" :key="vtuber._id" :vtuber="vtuber" @click="selectVTuber(vtuber)" @delete="confirmDelete(vtuber)" />
            </div>

            <!-- Live2D Presets Grid -->
            <div v-else-if="activeTab === 'live2d-presets' && filteredLive2DPresets.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <PresetCard v-for="preset in filteredLive2DPresets" :key="preset.id" :preset="preset" @use="usePreset" @preview="previewPreset" />
            </div>

            <!-- Static Presets Grid -->
            <div v-else-if="activeTab === 'static-presets' && filteredStaticPresets.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <PresetCard v-for="preset in filteredStaticPresets" :key="preset.id" :preset="preset" @use="usePreset" @preview="previewPreset" />
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-32 border border-dashed border-white/10 rounded-3xl text-center">
                <Brain class="text-6xl text-gray-600 mb-4 block w-fit mx-auto" />
                <h3 class="text-xl font-black mb-2">No VTubers found</h3>
                <p class="text-gray-500">
                    {{ activeTab === 'my-vtubers' ? 'Create your first VTuber to get started.' : 'Try adjusting your filters or search.' }}
                </p>
            </div>

            <!-- Pagination (Mocked for now as VTuber store pagination might differ) -->
            <div v-if="activeTab === 'my-vtubers' && vtubers.length > 0 && pagination.total > filters.limit" class="mt-12 w-full flex justify-center glass-pagination">
                <el-pagination v-model:current-page="filters.page" v-model:page-size="filters.limit" :total="pagination.total" :page-sizes="[12, 24, 48]" layout="total, prev, pager, next, sizes" @update:current-page="handlePageChange" @update:page-size="handleSizeChange" />
            </div>
        </main>

        <!-- Dialogs -->
        <VTuberUpdate v-model="showUpdate" :vtuber="activeVTuber" @update="fetchLibrary" />
        <VTuberCreate v-model="showCreate" @success="fetchLibrary" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Brain, Refresh, User, Search, VideoOne, Avatar, Loading } from '@icon-park/vue-next';
import { useVTuberStore } from '@/stores/vtuber';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';

// Components
import VTuberCard from '@/components/vtuber/VTuberCard.vue';
import PresetCard from '@/components/vtuber/PresetCard.vue';
import VTuberUpdate from '@/components/vtuber/VTuberUpdate.vue';
import VTuberCreate from '@/components/vtuber/VTuberCreate.vue';

// Import presets
import vtuberPresetsData from '@/data/vtuber-presets.json';

const vtuberStore = useVTuberStore();
const { vtubers, isLoading } = storeToRefs(vtuberStore);

// Mock pagination if store doesn't have it yet, but keep reactive
const pagination = ref({ total: 0 });

const activeVTuber = ref<any>(null);
const showUpdate = ref(false);
const showCreate = ref(false);

const activeTab = ref('my-vtubers');
const tabs = [
    { value: 'my-vtubers', name: 'My VTubers' },
    { value: 'live2d-presets', name: 'Live2D Presets' },
    { value: 'static-presets', name: 'Static Presets' },
];

const filters = ref({
    search: '',
    category: '',
    page: 1,
    limit: 12
});

const presets = ref({
    live2d: vtuberPresetsData.live2d || [],
    static: vtuberPresetsData.static || []
});

const categories = ref(vtuberPresetsData.categories || []);

const filteredLive2DPresets = computed(() => {
    return presets.value.live2d.filter((preset: any) => {
        const matchesSearch = preset.name.toLowerCase().includes(filters.value.search.toLowerCase()) || preset.description.toLowerCase().includes(filters.value.search.toLowerCase());
        const matchesCategory = !filters.value.category || preset.category === filters.value.category;
        return matchesSearch && matchesCategory;
    });
});

const filteredStaticPresets = computed(() => {
    return presets.value.static.filter((preset: any) => {
        const matchesSearch = preset.name.toLowerCase().includes(filters.value.search.toLowerCase()) || preset.description.toLowerCase().includes(filters.value.search.toLowerCase());
        const matchesCategory = !filters.value.category || preset.category === filters.value.category;
        return matchesSearch && matchesCategory;
    });
});

const fetchLibrary = async (page = 1) => {
    const res = await vtuberStore.fetchLibrary(page, filters.value.limit);
    if (res && res.pagination) {
        pagination.value = res.pagination;
    }
};

const handlePageChange = (page: number) => {
    filters.value.page = page;
    fetchLibrary(page);
};

const handleSizeChange = (size: number) => {
    filters.value.limit = size;
    filters.value.page = 1;
    fetchLibrary(1);
};

const selectVTuber = (vtuber: any) => {
    activeVTuber.value = vtuber;
    showUpdate.value = true;
};

const confirmDelete = async (vtuber: any) => {
    if (confirm(`Are you sure you want to permanently delete ${vtuber.identity.name}? This cannot be undone.`)) {
        await vtuberStore.deleteVTuber(vtuber.entityId);
    }
};

const usePreset = async (preset: any) => {
    try {
        toast.loading('Cloning preset template...');
        // await vtuberStore.clonePreset(preset); // If cloned preset exists in vtuberStore
        // For now, if clonePreset is still in vtuberStore, we might need a bridge or move it
        // Assuming it's moved or vtuberStore handles it
        toast.success('Template cloned successfully!');
        activeTab.value = 'my-vtubers';
        fetchLibrary(1);
    } catch (e: any) {
        console.error('Failed to clone preset:', e);
        toast.error('Failed to clone template');
    }
};

const previewPreset = (preset: any) => {
    console.log('Preview preset:', preset);
    toast.info('Preview feature coming soon!');
};

watch(activeTab, () => {
    filters.value.search = '';
    filters.value.category = '';
});

watch(() => filters.value.search, () => {
    if (activeTab.value === 'my-vtubers') {
        fetchLibrary(1);
    }
});

onMounted(() => fetchLibrary(1));
</script>

<style lang="scss" scoped>
.vtuber-library {
    background-color: #0a0a0a;
    background-image: radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.08) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.08) 0, transparent 50%);
    font-family: 'Outfit', sans-serif;
}

:deep(.premium-segmented) {
    --el-segmented-bg-color: rgba(255, 255, 255, 0.03);
    --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.1);
    --el-segmented-item-selected-color: #fff;
    --el-segmented-item-active-color: #fff;
    --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.premium-segmented .el-segmented__item) {
    @apply px-0;
}

:deep(.premium-segmented .el-segmented__item-selected) {
    @apply shadow-xl shadow-black/20;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-pagination {
    :deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
        background-color: #8b5cf6;
        color: white;
    }
    :deep(.el-pagination.is-background .el-pager li) {
        background-color: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);

        &:hover {
            color: #8b5cf6;
        }
    }
    :deep(.el-pagination.is-background .btn-prev),
    :deep(.el-pagination.is-background .btn-next) {
        background-color: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
}

.animate-pulse {
    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 0.1;
        transform: scale(1);
    }
    50% {
        opacity: 0.3;
        transform: scale(1.1);
    }
}
</style>
