<template>
    <div class="neural-archive p-6 animate-in">
        <header class="page-header mb-10 flex justify-between items-start">
            <div>
                <h1 class="text-3xl font-black text-white tracking-tight mb-2">Neural Archive</h1>
                <p class="text-gray-400 uppercase text-[10px] font-bold tracking-widest">Orchestrating Persistent AI
                    Personalities & Stylistic Weights</p>
            </div>
            <div class="flex items-center gap-4">
                <el-button type="primary" @click="showCreate = true" class="create-btn">Manifest New Soul</el-button>
                <el-button @click="fetchArchives" :loading="loading" class="glass-btn">Sync Archives</el-button>
                <span
                    class="text-[10px] font-black px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full uppercase">COGNITIVE
                    ENGINE V2.0</span>
            </div>
        </header>

        <div v-if="archives.length > 0" class="archive-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SoulCard v-for="archive in archives" :key="archive._id" :archive="archive"
                @click="selectArchive(archive)" />
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="empty-state py-20 text-center glass-card rounded-3xl border-dashed">
            <brain theme="outline" size="64" class="mx-auto mb-6 opacity-10" />
            <h2 class="text-xl font-bold">No Persistent Souls Found</h2>
            <p class="opacity-40 text-sm max-w-md mx-auto mt-2">Establish characters in your projects to initialize
                their neural footprints in the archive.</p>
        </div>

        <!-- Dialogs -->
        <SoulTuningDialog v-model="showTuning" :archive="activeArchive" @update="fetchArchives" />
        <SoulManifestDialog v-model="showCreate" @success="fetchArchives" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Brain } from '@icon-park/vue-next';
import { useNeuralStore } from '@/stores/neural';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';

// Components
import SoulCard from '@/components/neural/SoulCard.vue';
import SoulTuningDialog from '@/components/neural/SoulTuningDialog.vue';
import SoulManifestDialog from '@/components/neural/SoulManifestDialog.vue';

const neuralStore = useNeuralStore();
const { archives, loading } = storeToRefs(neuralStore);

// Remove local archives and loading?
// const loading = ref(true); // Remove
// const archives = ref<any[]>([]); // Remove
const activeArchive = ref<any>(null);
const showTuning = ref(false);
const showCreate = ref(false);

const fetchArchives = async () => {
    await neuralStore.fetchBioDoubles();
};

const selectArchive = (archive: any) => {
    activeArchive.value = archive;
    showTuning.value = true;
};

onMounted(fetchArchives);
</script>

<style lang="scss" scoped>
.neural-archive {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent 40%);
}

.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
}

.create-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}
</style>
