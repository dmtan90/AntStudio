<template>
    <div class="release-hub p-8 animate-in">
        <header class="flex justify-between items-start mb-12">
            <div>
                <h1 class="text-4xl font-black tracking-tighter text-white mb-2">RELEASE REGISTRY</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Global Fleet Version Control
                </p>
            </div>
            <div class="flex gap-4">
                <button @click="showUpload = true"
                    class="px-6 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
                    Publish New Build
                </button>
            </div>
        </header>

        <!-- Upload Modal -->
        <div v-if="showUpload"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div class="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-lg p-8">
                <h3 class="text-xl font-black mb-6">DEPLOY NEW VERSION</h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-black uppercase text-gray-500">Semantic Version</label>
                        <input v-model="form.version" placeholder="e.g. 1.5.0"
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-gray-500">Release Channel</label>
                        <select v-model="form.channel"
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none">
                            <option value="stable">Stable (Production)</option>
                            <option value="beta">Beta (Testing)</option>
                            <option value="nightly">Nightly (Dev)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-gray-500">Tactical Notes</label>
                        <textarea v-model="form.releaseNotes" rows="4" placeholder="Changelog..."
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"></textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-gray-500">Artifact URL (S3/CDN)</label>
                        <input v-model="form.downloadUrl" :placeholder="'https://cdn.' + uiStore.appName.toLowerCase().replace(/\s+/g, '') + '.ai/builds/...'"
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button @click="showUpload = false"
                            class="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Cancel</button>
                        <button @click="publishRelease"
                            class="px-6 py-2 bg-blue-600 rounded-xl text-xs font-black uppercase hover:bg-blue-500">Deploy</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- History -->
        <div class="grid grid-cols-1 gap-4">
            <div v-for="rel in releases" :key="rel._id"
                class="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all flex justify-between items-center group">
                <div class="flex items-center gap-6">
                    <div
                        :class="['w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border',
                            rel.channel === 'stable' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                rel.channel === 'beta' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' : 'bg-red-500/20 border-red-500/30 text-red-400']">
                        v{{ rel.version }}
                    </div>
                    <div>
                        <div class="flex items-center gap-3">
                            <h3 class="font-bold text-white">{{ rel.channel.toUpperCase() }} CHANNEL</h3>
                            <span class="text-[10px] font-mono opacity-40">{{ formatDate(rel.publishedAt) }}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1 max-w-xl truncate">{{ rel.releaseNotes }}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <a :href="rel.downloadUrl" target="_blank"
                        class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 hover:text-blue-400 transition-all flex items-center gap-2">
                        <download theme="outline" /> Download Artifact
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUIStore } from '@/stores/ui';
import { Download } from '@icon-park/vue-next';
import api from '@/utils/api';
import { toast } from 'vue-sonner';
import { useAdminStore } from '@/stores/admin';

const uiStore = useUIStore();
const adminStore = useAdminStore();
const releases = ref<any[]>([]);
const showUpload = ref(false);
const form = reactive({
    version: '',
    channel: 'stable',
    releaseNotes: '',
    downloadUrl: ''
});

const fetchReleases = async () => {
    try {
        const data = await adminStore.fetchReleases();
        releases.value = data.releases || [];
    } catch (e) {
        console.error('Failed to fetch releases', e);
    }
};

const publishRelease = async () => {
    try {
        await adminStore.createRelease(form);
        // toast.success is handled in store or we can do it here if store doesn't
        showUpload.value = false;
        fetchReleases();
        form.version = '';
        form.releaseNotes = '';
        form.downloadUrl = '';
    } catch (e: any) {
        // Error handled in store or console
    }
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();

onMounted(fetchReleases);
</script>

<style scoped>
.release-hub {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.05), transparent 40%);
}
</style>
