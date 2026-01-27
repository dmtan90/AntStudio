<template>
    <div class="neural-archive p-6 animate-in">
        <header class="page-header mb-10 flex justify-between items-start">
            <div>
                <h1 class="text-3xl font-black text-white tracking-tight mb-2">Neural Archive</h1>
                <p class="text-gray-400 uppercase text-[10px] font-bold tracking-widest">Orchestrating Persistent AI
                    Personalities & Stylistic Weights</p>
            </div>
            <div class="flex items-center gap-4">
                <el-button @click="fetchArchives" :loading="loading" class="glass-btn">Sync Archives</el-button>
                <span
                    class="text-[10px] font-black px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full uppercase">COGNITIVE
                    ENGINE V2.0</span>
            </div>
        </header>

        <div v-if="archives.length > 0" class="archive-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div v-for="archive in archives" :key="archive._id"
                class="archive-card glass-card p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden"
                @click="selectArchive(archive)">

                <div
                    class="absolute top-0 left-0 w-1 h-full bg-blue-500/40 opacity-0 group-hover:opacity-100 transition-all">
                </div>

                <div class="flex justify-between items-start mb-6">
                    <div
                        class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                        <brain theme="outline" size="32" class="text-blue-400" />
                    </div>
                    <div class="text-right">
                        <span class="text-[8px] font-black uppercase opacity-40">Sync Status</span>
                        <p class="text-[10px] font-bold text-green-400 flex items-center justify-end gap-1">
                        <div class="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div> PERSISTENT
                        </p>
                    </div>
                </div>

                <h3 class="text-xl font-black mb-1">{{ archive.identity.name }}</h3>
                <p class="text-xs opacity-60 line-clamp-2 mb-4">{{ archive.identity.description || 'No neural description registered.' }}</p>

                <div class="flex gap-2 mb-6 flex-wrap">
                    <span v-for="trait in archive.identity.traits" :key="trait"
                        class="px-2 py-0.5 bg-black/40 border border-white/5 rounded text-[8px] font-black uppercase opacity-60">{{
                        trait }}</span>
                </div>

                <div class="stats-grid grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                        <p class="text-[8px] font-black opacity-30 uppercase">Neural Memory</p>
                        <p class="text-xs font-bold">{{ archive.memory.summaries.length }} Sessions</p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black opacity-30 uppercase">Style Weights</p>
                        <p class="text-xs font-bold">{{ archive.customization.loras.length }} LoRAs</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="empty-state py-20 text-center glass-card rounded-3xl border-dashed">
            <brain theme="outline" size="64" class="mx-auto mb-6 opacity-10" />
            <h2 class="text-xl font-bold">No Persistent Souls Found</h2>
            <p class="opacity-40 text-sm max-w-md mx-auto mt-2">Establish characters in your projects to initialize
                their neural footprints in the archive.</p>
        </div>

        <!-- Dialog: Neural Tuning -->
        <el-dialog v-model="showTuning" v-if="activeArchive" :title="`NEURAL TUNING: ${activeArchive.identity.name}`"
            width="800px" custom-class="tuning-dialog glass-dialog">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 p-4">
                <!-- Left: Identity & Memory -->
                <div class="space-y-8">
                    <section>
                        <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Core Identity</h4>
                        <el-form label-position="top">
                            <el-form-item label="Description (Neural Anchor)">
                                <el-input v-model="activeArchive.identity.description" type="textarea" :rows="3"
                                    class="glass-input" />
                            </el-form-item>
                        </el-form>
                    </section>

                    <section>
                        <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tactical Memory
                            (Last 3 Events)</h4>
                        <div class="space-y-3">
                            <div v-for="ev in activeArchive.memory.keyEvents.slice(-3).reverse()" :key="ev.date"
                                class="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p class="text-[10px] font-bold">{{ ev.description }}</p>
                                <p class="text-[8px] opacity-30 uppercase mt-1">{{ new
                                    Date(ev.date).toLocaleDateString() }}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Right: Style Tuning (LoRAs) -->
                <div class="space-y-8">
                    <section>
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40">Stylistic Weights
                                (LoRAs)</h4>
                            <el-button type="primary" size="small" circle @click="addLora">+</el-button>
                        </div>
                        <div class="space-y-4">
                            <div v-for="(lora, idx) in activeArchive.customization.loras" :key="idx"
                                class="lora-item p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative">
                                <div class="flex gap-4 items-center mb-3">
                                    <el-input v-model="lora.id" placeholder="LoRA ID (e.g. pixar_v2)" size="small"
                                        class="glass-input flex-1" />
                                    <button @click="activeArchive.customization.loras.splice(idx, 1)"
                                        class="text-red-500/40 hover:text-red-500"><close-small /></button>
                                </div>
                                <div class="flex gap-4 items-center">
                                    <span class="text-[10px] font-black uppercase w-20">Weight: {{ lora.weight }}</span>
                                    <el-slider v-model="lora.weight" :min="0" :max="1.5" :step="0.1" class="flex-1" />
                                </div>
                                <el-input v-model="lora.trigger" placeholder="Trigger word (optional)" size="small"
                                    class="glass-input mt-2" />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-between items-center px-4 pb-4">
                    <p class="text-[10px] italic opacity-30">Last synchronized: {{ new
                        Date(activeArchive.lastUpdated).toLocaleString() }}</p>
                    <div class="flex gap-4">
                        <el-button @click="showTuning = false" class="glass-btn">Abort</el-button>
                        <el-button type="primary" @click="handleUpdateStyle" :loading="updating"
                            class="create-btn px-8">Sync Neural Weights</el-button>
                    </div>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Brain, CloseSmall, Sync, Memory } from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';

const loading = ref(true);
const updating = ref(false);
const archives = ref<any[]>([]);
const activeArchive = ref<any>(null);
const showTuning = ref(false);

const fetchArchives = async () => {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/neural/list');
        archives.value = data.data;
    } catch (e) {
        toast.error("Telemetry failure: Failed to sync neural patterns");
    } finally {
        loading.value = false;
    }
};

const selectArchive = (archive: any) => {
    activeArchive.value = JSON.parse(JSON.stringify(archive)); // Deep clone for editing
    showTuning.value = true;
};

const addLora = () => {
    if (!activeArchive.value.customization.loras) activeArchive.value.customization.loras = [];
    activeArchive.value.customization.loras.push({ id: '', weight: 1.0, trigger: '' });
};

const handleUpdateStyle = async () => {
    updating.value = true;
    try {
        await axios.post(`/api/neural/archive/${activeArchive.value.entityId}/style`, {
            loras: activeArchive.value.customization.loras
        });
        toast.success("Neural patterns recalibrated and synchronized.");
        showTuning.value = false;
        fetchArchives();
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Strategic error synchronizing neural weights");
    } finally {
        updating.value = false;
    }
};

onMounted(fetchArchives);
</script>

<style lang="scss" scoped>
.neural-archive {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent 40%);
}

.archive-card {
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);

    &:hover {
        background: rgba(255, 255, 255, 0.04);
        transform: translateY(-4px);
    }
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

:deep(.tuning-dialog) {
    .el-dialog__body {
        padding-top: 0;
    }
}

.lora-item {
    transition: 0.3s;

    &:hover {
        border-color: rgba(59, 130, 246, 0.5);
    }
}
</style>
