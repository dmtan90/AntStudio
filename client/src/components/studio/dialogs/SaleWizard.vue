<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useStudioStore, type Product } from '@/stores/studio';
import { useMediaStore } from '@/stores/media';
import api, { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Search, Music, Pic, Config, CheckOne, Copy, 
    FileTextOne, PlayOne, Loading as LoadingIcon, 
    Refresh, Plus, Upload, DeleteFive, EditTwo,
    VideoTwo, Hands, LinkOne, Magic
} from '@icon-park/vue-next';
import { usePlatformStore } from '@/stores/platform';
import { useInfluencerStore } from '@/stores/influencer';
import { useMarketplaceStore } from '@/stores/marketplace';

const props = defineProps<{
  activeInfluencers: any[];
  inline?: boolean;
}>();

const emit = defineEmits(['close', 'complete']);

const studioStore = useStudioStore();
const mediaStore = useMediaStore();
const platformStore = usePlatformStore();
const influencerStore = useInfluencerStore();
const productStore = useMarketplaceStore();
const currentStep = ref(1);
const loading = ref(false);

const bgInput = ref<HTMLInputElement | null>(null);
const musicInput = ref<HTMLInputElement | null>(null);
const videoInputs = ref<Record<string, HTMLInputElement>>({});

function setVideoInput(el: any, pid: string) {
    if (el) videoInputs.value[pid] = el;
}

// Step 1: Product Selection
const availableProducts = ref<Product[]>([]);
const selectedProductIds = ref<string[]>([]);
const queueMode = ref<'manual' | 'auto'>('manual');
const productSearch = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const filteredProducts = computed(() => {
    let list = [...availableProducts.value];
    
    // Search
    if (productSearch.value) {
        const q = productSearch.value.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    
    // Smart Auto Sort
    if (queueMode.value === 'auto') {
        list.sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));
    }
    
    return list;
});

const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / pageSize.value));

// Watch queueMode for Smart Auto
watch(queueMode, (newMode) => {
    if (newMode === 'auto') {
        selectedProductIds.value = availableProducts.value.map(p => p._id);
    }
    else{
        selectedProductIds.value = [];
    }
});

function toggleProduct(pid: string) {
    if (queueMode.value === 'auto') return; // Disabled in auto mode
    
    if (selectedProductIds.value.includes(pid)) {
        selectedProductIds.value = selectedProductIds.value.filter(id => id !== pid);
    } else {
        selectedProductIds.value.push(pid);
    }
}

// Step 2: Assignment (Merged into Step 3 logic)
const assignmentMap = ref<Record<string, string>>({}); // productId -> influencerId

// Step 3: AI Video Prep
const videoJobs = ref<Record<string, { jobId: string, status: string, url?: string }>>({});

// Step 4: Script Preview
const orchestrationScript = ref<any[]>([]);

// Step 5: Configuration
const configState = reactive({
  platforms: [] as string[],
  ratio: '16:9' as '16:9' | '9:16',
  bgId: 'studio',
  bgmId: 'none',
  bgmTitle: 'None',
  showLowerThird: true,
  showTicker: true,
  showChat: true,
  bgSearch: '',
  bgmSearch: ''
});

const searchResults = reactive({
    backgrounds: [] as any[],
    music: [] as any[],
    searchingBg: false,
    searchingMusic: false,
    searchingVideo: false,
    videos: {} as Record<string, any[]>
});

async function searchBackgrounds() {
    if (!configState.bgSearch) return;
    searchResults.searchingBg = true;
    try {
        const res = await api.get('/media/pexels/images', { params: { query: configState.bgSearch, per_page: 8 } });
        searchResults.backgrounds = res.data.data?.photos || res.data.photos || [];
    } catch (e) {
        toast.error('Failed to search backgrounds');
    } finally {
        searchResults.searchingBg = false;
    }
}

async function searchMusic() {
    if (!configState.bgmSearch) return;
    searchResults.searchingMusic = true;
    try {
        const res = await mediaStore.searchYouTubeMusic({ 
            query: configState.bgmSearch, 
            preferCovers: false, 
            language: 'en', 
            maxResults: 8 
        });
        searchResults.music = res.videos || [];
    } catch (e) {
        toast.error('Failed to search music');
    } finally {
        searchResults.searchingMusic = false;
    }
}

const videoSearchQueries = ref<Record<string, string>>({});

async function searchStockVideos(pid: string) {
    const query = videoSearchQueries.value[pid];
    if (!query) return;
    
    searchResults.searchingVideo = true;
    try {
        const res = await api.get('/media/pexels/videos', { params: { query, per_page: 8 } });
        searchResults.videos[pid] = res.data.data?.photos || res.data.photos || [];
    } catch (e) {
        toast.error('Failed to search videos');
    } finally {
        searchResults.searchingVideo = false;
    }
}

function selectStockVideo(pid: string, video: any) {
    videoJobs.value[pid] = { 
        jobId: `stock-${video.id}`, 
        status: 'existing', 
        url: video.details.src 
    };
    searchResults.videos[pid] = []; // Clear results after selection
    toast.success('Stock video selected');
}

function selectBgm(video: any) {
    configState.bgmId = video.videoId;
    configState.bgmTitle = video.title;
    toast.success(`Music Selected: ${video.title}`);
}

onMounted(async () => {
    try {
        const data = await productStore.fetchProducts();
        //const res = await api.get('/commerce/products');
        availableProducts.value = data;

        // Initialize Auto Mode if default
        if (queueMode.value === 'auto') {
            selectedProductIds.value = availableProducts.value.map(p => p._id);
        }

        // Load platforms
        await platformStore.fetchAccounts();
    } catch (e) {
        toast.error('Failed to initialize wizard');
    }
});

const preStep3 = async () => {
    loading.value = true;
    try {
        // Auto assignment if only 1 influencer
        if (props.activeInfluencers.length === 1) {
            selectedProductIds.value.forEach(pid => {
                assignmentMap.value[pid] = props.activeInfluencers[0].entityId;
            });
        }

        // 1. First, check local props (personas already have aidolClips from syncLibrary)
        props.activeInfluencers.forEach(persona => {
            const clips = persona.visual?.aidolClips || {};
            selectedProductIds.value.forEach(pid => {
                const videoUrl = clips[pid];
                if (videoUrl) {
                    if (!videoJobs.value[pid] || assignmentMap.value[pid] === persona.entityId) {
                        videoJobs.value[pid] = { 
                            jobId: 'existing', 
                            status: 'existing', 
                            url: videoUrl 
                        };
                        if (!assignmentMap.value[pid]) assignmentMap.value[pid] = persona.entityId;
                    }
                }
            });
        });

        // 2. Fetch from API as a secondary check (for newly generated clips in other sessions)
        const influencerIds = props.activeInfluencers.map(i => i.entityId);
        for (const iid of influencerIds) {
            const data = await influencerStore.fetchSalesPlaylist(iid, selectedProductIds.value);
            // const res = await api.get(`/influencer/${iid}/sales/playlist`, { 
            //     params: { productIds: selectedProductIds.value.join(',') } 
            // });
            if (data) {
                data.forEach((item: any) => {
                    if (!videoJobs.value[item.productId]) {
                        videoJobs.value[item.productId] = { 
                            jobId: 'existing', 
                            status: 'existing', 
                            url: item.videoUrl 
                        };
                        if (!assignmentMap.value[item.productId]) {
                            assignmentMap.value[item.productId] = iid;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Failed to prefetch videos:', e);
    } finally {
        loading.value = false;
        currentStep.value = 3;
    }
};

const nextStep = () => {
    if (currentStep.value === 1 && selectedProductIds.value.length === 0) {
        toast.error('Please select at least one product');
        return;
    }
    
    // Step 2 is now merged into Step 3
    if (currentStep.value === 1) {
        preStep3();
        return;
    }

    currentStep.value++;
};

const prevStep = () => {
    if (currentStep.value === 3) {
        currentStep.value = 1;
        return;
    }
    currentStep.value--;
};

const generateVideos = async (pid: string | null = null) => {
    loading.value = true;
    try {
        const pids = pid ? [pid] : selectedProductIds.value;
        for(const pid of pids){
            await generateVideo(pid);
        }
    } catch (e) {
    
    } finally {
        loading.value = false;
    }
};

const generateVideo = async (pid: string) => {
    if(!pid){
        return;
    }
    try {
        const iid = assignmentMap.value[pid];
        if(!iid){
            toast.error('Product is not assigned to any influencer');
            return;
        }
        loading.value = true;
        const data = await influencerStore.generateProductVideo(iid, pid);  //api.post(`/influencer/${iid}/sales/prepare`, { productIds: [pid] });
        if (data) {
            videoJobs.value[pid] = { 
                jobId: data.jobId,
                status: data.status, 
                url: data.videoUrl 
            };
        }
        toast.success('AI Video generation completed');
    } catch (e) {
        toast.error('Failed to start generation');
    } finally {
        loading.value = false;
    }
};

// startPolling and pollInterval REMOVED as flow is now synchronous

onUnmounted(() => {
    // interval cleanup no longer needed
});

const storyboardVideo = (idolName: string, type: string, productId: string) => {
    let clipUrl = "";
    const influencer = getInfluencer(idolName);
    if(!influencer){
        return null;
    }
    if(influencer.visual?.modelType === 'aidol'){
        if(influencer?.visual?.aidolClips){
            clipUrl = influencer.visual.aidolClips[type] || "";
            if(!clipUrl && productId){
                clipUrl = influencer.visual.aidolClips[productId] || "";
            }
        }
    }else{
        clipUrl = influencer.visual?.video || "";
    }
    return getFileUrl(clipUrl);
}

const getPreviewUrl = (pid: string) => {
    const job = videoJobs.value[pid];
    if (job?.url) return getFileUrl(job.url);
    const product = getProduct(pid);
    return product?.video;
};

const copyPrompt = async (pid: string) => {
    try {
        const product = availableProducts.value.find(p => p._id === pid);
        const influencerId = assignmentMap.value[pid];
        const influencer = props.activeInfluencers.find(i => i.entityId === influencerId);
        
        const prompt = `Professional green screen video of ${influencer?.identity?.name || 'an influencer'} demonstrating and using the product: ${product?.name}. 
Focus on authentic details: ${product?.description || ''}.`;
        
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt copied to clipboard');
    } catch (e) {
        toast.error('Failed to copy prompt');
    }
};

const generateScript = async () => {
    loading.value = true;
    try {
        const influencerIds = props.activeInfluencers.map(i => i.entityId);
        const language = props.activeInfluencers[0]?.meta?.voiceConfig?.language || "en-US";
        console.log("generateScript", influencerIds, language);
        const data: any = await influencerStore.prepareSaleScripts(influencerIds, selectedProductIds.value, assignmentMap.value, language);
        console.log("generateScript", data);
        orchestrationScript.value = data.script || data;
        if(orchestrationScript.value.length > 0 && orchestrationScript.value[0].type != 'speaking'){
            orchestrationScript.value[0].type = "speaking";
        }
    } catch (e) {
        toast.error('Failed to generate script');
    } finally {
        loading.value = false;
    }
};

const startLive = () => {
    loading.value = true;
    try {
        // Apply Products
        const products = selectedProductIds.value.map(pid => {
            const p = availableProducts.value.find(x => x._id === pid);
            return {
                ...p,
                video: videoJobs.value[pid]?.url || p?.video
            };
        });
        studioStore.featuredProducts = products;

        // Apply Script
        studioStore.activeScript = orchestrationScript.value;

        // Apply Visuals
        studioStore.streamRatio = configState.ratio;
        
        // Apply visual settings
        const bgAsset = studioStore.backgroundAssets.find(a => a.id === configState.bgId);
        const finalBgUrl = bgAsset ? bgAsset.url : (configState.bgId.includes('/') ? configState.bgId : getFileUrl(configState.bgId));

        studioStore.updateVisualSettings({
            background: {
                mode: 'virtual',
                blurLevel: 'low',
                assetUrl: finalBgUrl || '/bg/pro-studio.jpg',
                isAssetVideo: false,
                is360: false
            },
            showLowerThird: configState.showLowerThird,
            showTicker: configState.showTicker,
            showChat: configState.showChat,
            tickerText: `${studioStore.featuredProducts.map(p => p.name).join(' • ')} available now! `
        });

        // Apply Music
        if (configState.bgmId !== 'none') {
            studioStore.setBgm(configState.bgmId);
        }

        // Emit completion with platforms
        emit('complete', { platforms: [...configState.platforms] });
    } catch (e) {
        toast.error('Failed to start live session');
    } finally {
        loading.value = false;
    }
};

function togglePlatform(accountId: string) {
    if (configState.platforms.includes(accountId)) {
        configState.platforms = configState.platforms.filter(x => x !== accountId);
    } else {
        configState.platforms.push(accountId);
    }
}

const handleAssignmentChange = (pid: string, newInfluencerId: string) => {
    assignmentMap.value[pid] = newInfluencerId;
    const videoUrl = videoJobs.value[pid]?.url;
    if (videoUrl) {
         const influencer = props.activeInfluencers.find(i => i.entityId === newInfluencerId);
         if (influencer) {
              if (!influencer.visual) influencer.visual = {};
              if (!influencer.visual.aidolClips) influencer.visual.aidolClips = {};
              influencer.visual.aidolClips[pid] = videoUrl;
              
              influencerStore.syncAidolClips(newInfluencerId, influencer.visual.aidolClips).catch(e => {
                   console.error("Failed to sync aidol clip to new influencer", pid, e);
              });
         }
    }
};

async function handleLocalUpload(type: 'bg' | 'bgm' | 'video', pid?: string, event?: Event) {
    const file = (event?.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    loading.value = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const data: any = await mediaStore.uploadMedia(formData);
        // const res = await api.post('/media/upload', formData, {
        //     headers: { 'Content-Type': 'multipart/form-data' }
        // });

        const s3Key = data.s3Key || data.key;
        
        if (type === 'bg') {
            configState.bgId = s3Key;
            toast.success('Background uploaded');
        } else if (type === 'bgm') {
            configState.bgmId = s3Key;
            configState.bgmTitle = file.name;
            toast.success('Music uploaded');
        } else if (type === 'video' && pid) {
            videoJobs.value[pid] = { jobId: `manual-${Date.now()}`, status: 'existing', url: s3Key };
            toast.success('Video uploaded');
            
            // Phase 125: Sync immediate
            const iid = assignmentMap.value[pid];
            if (iid) {
                const influencer = props.activeInfluencers.find(i => i.entityId === iid);
                if (influencer) {
                    if (!influencer.visual) influencer.visual = {};
                    if (!influencer.visual.aidolClips) influencer.visual.aidolClips = {};
                    influencer.visual.aidolClips[pid] = s3Key;
                    
                    influencerStore.syncAidolClips(iid, influencer.visual.aidolClips).catch(e => {
                         console.error("Failed to sync aidol clip for product", pid, e);
                    });
                }
            }
        }
    } catch (e) {
        toast.error('Upload failed');
    } finally {
        loading.value = false;
    }
}

const getProduct = (pid: string) => {
    return availableProducts.value.find(p => p._id === pid);
}

const getInfluencer = (influencerId: string) => {
    return props.activeInfluencers.find(i => i.entityId === influencerId);
}

const getInfluencerByProduct = (pid: string) => {
    return assignmentMap.value[pid] ? getInfluencer(assignmentMap.value[pid]) : null;
}

</script>

<template>
  <div :class="[inline ? 'w-full h-full' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4']">
    <div :class="['w-full bg-[#121212] overflow-hidden flex flex-col', 
                  inline ? 'h-full bg-transparent' : 'max-w-4xl border border-white/10 rounded-2xl shadow-2xl max-h-[90vh]']">
      <!-- Header -->
      <div v-if="!inline" class="sticky top-0 z-10 p-6 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">Sale</span>
            SaleStudio Setup Wizard
          </h2>
          <p class="text-white/40 text-sm mt-1">Step {{ currentStep }} of 6: 
            {{ currentStep === 1 ? 'Product Selection' : 
               currentStep === 2 ? 'Influencer Assignment' :
               currentStep === 3 ? 'AI Video Aide Prep' :
               currentStep === 4 ? 'Script Orchestration' :
               currentStep === 5 ? 'Scene & Platform Config' : 'Final Review' }}
          </p>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
          <i class="i-lucide-x w-6 h-6"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <!-- Step 1: Products -->
        <div v-if="currentStep === 1" class="space-y-6">
            <div class="flex flex-col gap-4">
                <div class="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                    <div class="text-white font-medium">Auto (Smart) Mode</div>
                    <div class="text-xs text-white/40">Automatically select and rank products by buyer intent</div>
                    </div>
                    <el-switch v-model="queueMode" active-value="auto" inactive-value="manual" />
                </div>

                <div class="flex items-center gap-4">
                    <el-input v-model="productSearch" placeholder="Search products..." class="studio-search flex-1">
                        <template #prefix><Search theme="outline" size="14" /></template>
                    </el-input>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[340px]">
                <div v-for="product in paginatedProducts" :key="product._id"
                     @click="toggleProduct(product._id)"
                     :class="['p-3 rounded-xl border transition-all flex flex-col max-h-[200px]', 
                              selectedProductIds.includes(product._id) ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20',
                              queueMode === 'auto' ? 'cursor-default grayscale-[0.5]' : 'cursor-pointer']">
                    <div class="relative">
                        <img :src="product.image" class="w-full aspect-square object-cover rounded-lg mb-2" />
                        <div v-if="queueMode === 'auto'" class="absolute top-2 right-2 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                            INTENT: {{ product.intentScore || 0 }}
                        </div>
                    </div>
                    <div class="text-sm font-medium text-white truncate">{{ product.name }}</div>
                    <div class="mt-auto flex items-center justify-between">
                        <div class="text-xs text-white/40">{{ product.price }} {{ product.currency }}</div>
                        <CheckOne v-if="selectedProductIds.includes(product._id)" theme="filled" size="16" class="text-blue-500" />
                    </div>
                </div>
                <div v-if="filteredProducts.length === 0" class="col-span-full flex flex-col items-center justify-center py-12 text-white/20">
                    <Search theme="outline" size="32" class="mb-2" />
                    <p>No products found</p>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
                <button v-for="p in totalPages" :key="p" 
                        @click="currentPage = p"
                        :class="['w-8 h-8 rounded-lg text-xs font-bold transition-all border', 
                                 currentPage === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10']">
                    {{ p }}
                </button>
            </div>
        </div>

        <!-- Step 2: Assignment (REMOVED - Merged into Step 3) -->

        <!-- Step 3: Videos -->
        <div v-if="currentStep === 3" class="space-y-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-white font-medium">AI Product Aid Videos</h3>
                <button @click="generateVideos()" :disabled="loading" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                   {{ loading ? 'Starting AI...' : 'Generate All Videos' }}
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div v-for="pid in selectedProductIds" :key="pid" class="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-3 relative">
                    <!-- Influencer Selector Overlay -->
                    <template v-if="activeInfluencers.length == 1">
                        <div class="absolute top-2 right-2 z-30">
                            <el-avatar :size="32" :src="getFileUrl(activeInfluencers.find(i => i.entityId === assignmentMap[pid])?.visual?.thumbnailUrl)" shape="circle">
                                {{ activeInfluencers.find(i => i.entityId === assignmentMap[pid])?.identity?.name?.[0] }}
                            </el-avatar>
                        </div>
                    </template>
                    <div v-else class="absolute top-2 right-2 z-20">
                        <el-dropdown trigger="click" @command="(id: string) => handleAssignmentChange(pid, id)">
                            <el-tooltip :content="getInfluencerByProduct(pid)?.identity?.name || 'No assigned'" placement="top">
                                <el-avatar :size="32" :src="getFileUrl(getInfluencerByProduct(pid)?.visual?.thumbnailUrl) || ''" shape="circle">
                                    {{ getInfluencerByProduct(pid).identity?.name?.[0] || 'N/A' }}
                                </el-avatar>
                            </el-tooltip>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item v-for="inf in activeInfluencers" :key="inf.entityId" :command="inf.entityId" :active="assignmentMap[pid] === inf.entityId">
                                        <div class="flex items-center gap-2">
                                            <el-avatar :size="20" :src="inf.visual?.thumbnailUrl" />
                                            <span>{{ inf.identity.name }}</span>
                                        </div>
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>

                    <div class="flex items-center gap-3">
                         <img :src="availableProducts.find(p => p._id === pid)?.image" class="w-10 h-10 rounded-lg object-cover" />
                         <div class="flex-1 overflow-hidden pr-20">
                             <div class="text-white text-sm font-bold truncate">{{ availableProducts.find(p => p._id === pid)?.name }}</div>
                             <div class="text-[10px] text-white/40">ID: {{ pid.slice(-6) }}</div>
                         </div>
                    </div>
                    
                    <div class="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center text-white/20 text-xs text-center relative border border-white/5">
                        <video v-if="getPreviewUrl(pid)" :src="getPreviewUrl(pid)" controls class="w-full h-full object-contain"></video>
                        <div v-else-if="loading && (!videoJobs[pid] || videoJobs[pid]?.status === 'generating')" class="flex flex-col items-center gap-2">
                            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                            <span>Generating AI Video...</span>
                        </div>
                        <div v-else class="flex flex-col items-center gap-2 text-white/20">
                            <PlayOne theme="outline" size="24" />
                            <span>Awaiting Video Aide</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-2">
                        <div class="flex gap-2">
                            <el-button @click="generateVideos(pid)" :icon="Refresh" :loading="loading" class="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-500/30">
                                AI Generate
                            </el-button>
                            <el-button @click="copyPrompt(pid)" :icon="Copy" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 border border-white/10" title="Copy Prompt for external tools">
                                
                            </el-button>
                            <el-button @click="videoInputs[pid]?.click()" :icon="Upload" class="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 border border-white/10">
                                Upload
                            </el-button>
                            <input type="file" :ref="el => setVideoInput(el, pid)" class="hidden" accept="video/*" @change="handleLocalUpload('video', pid, $event)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 4: Script -->
        <div v-if="currentStep === 4" class="space-y-6">
            <div class="flex items-center justify-between mb-4">
                <div class="text-white font-medium uppercase tracking-widest text-xs">Live Sales Storyboard</div>
                <el-button @click="generateScript" :icon="Refresh" :loading="loading" class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                    Regenerate Script
                </el-button>
            </div>
            <el-empty v-if="orchestrationScript.length === 0" description="No script generated yet">
                <el-button @click="generateScript" :icon="Magic" :loading="loading" class="mt-4 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all">
                    Generate Storyboard
                </el-button>
            </el-empty>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="(line, idx) in orchestrationScript" :key="idx" 
                     class="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all shadow-xl flex flex-col">
                    
                    <!-- Post Header -->
                    <div class="flex items-center justify-between px-4 py-3 bg-white/2 border-b border-white/5">
                        <div class="flex items-center gap-3">
                            <el-avatar :size="36" :src="getFileUrl(activeInfluencers.find(i => i.entityId === line.speaker)?.visual?.thumbnailUrl)" class="border border-white/10" />
                            <div class="flex flex-col">
                                <span class="text-[11px] font-bold text-white leading-tight">
                                    {{ activeInfluencers.find(i => i.entityId === line.speaker)?.identity?.name || 'AI Assistant' }}
                                </span>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest leading-none">
                                        {{ line.type ? (availableProducts.find(p => p._id === line.type)?.name || line.type) : 'Dialogue' }}
                                    </span>
                                    <span v-if="line.gesture" class="text-[9px] text-white/30 flex items-center gap-1">
                                        <component :is="'Hands'" theme="outline" size="10" />
                                        {{ line.gesture }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button @click="orchestrationScript.splice(idx, 1)" class="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                <DeleteFive theme="outline" size="14" />
                            </button>
                        </div>
                    </div>

                    <!-- Post Body (Dialogue) -->
                    <div class="p-4 flex-1">
                        <video :src="storyboardVideo(line.speaker, line.type, line.productId)" controls class="w-full aspect-[16/9] object-contain"></video>
                        <textarea v-model="line.text" 
                                  rows="3"
                                  class="w-full bg-transparent border-none focus:ring-0 text-sm text-white/90 leading-relaxed p-0 resize-none hover:text-white transition-colors custom-scrollbar"
                                  placeholder="What does the influencer say?"></textarea>
                    </div>

                    <!-- Post Footer (Product Association) -->
                    <div v-if="line.productId" class="px-4 py-2 bg-blue-600/5 border-t border-white/5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-white/30 font-medium uppercase tracking-wider">Showcasing:</span>
                            <span class="text-[10px] text-blue-400 font-bold">
                                {{ availableProducts.find(p => p._id === line.productId)?.name || 'Linked Product' }}
                            </span>
                        </div>
                        <div class="flex items-center gap-1 text-[9px] text-white/20">
                            <LinkOne theme="outline" size="10" />
                            <span>Auto-Triggered</span>
                        </div>
                    </div>

                    <!-- Index Indicator Overlay -->
                    <div class="absolute -left-2 top-2 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center text-[9px] text-white/40 font-black z-10">
                        {{ idx + 1 }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 5: Config -->
        <div v-if="currentStep === 5" class="space-y-6">
            <div class="grid grid-cols-2 gap-8">
                <!-- Left Column: Platforms & Ratio & Overlays -->
                <div class="space-y-6">
                    <div class="space-y-3">
                        <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">Target Platforms</label>
                        <div class="flex flex-col gap-2">
                             <div v-for="acc in platformStore.accounts" :key="acc._id"
                                class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                                :class="configState.platforms.includes(acc._id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'"
                                @click="togglePlatform(acc._id)">
                                <div class="flex items-center gap-3">
                                    <!-- Platform icon by type -->
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                                         :class="{
                                           'bg-red-600': acc.platform === 'youtube',
                                           'bg-blue-700': acc.platform === 'facebook',
                                           'bg-black border border-white/20': acc.platform === 'tiktok',
                                           'bg-purple-600': acc.platform === 'twitch',
                                           'bg-yellow-500 text-black': acc.platform === 'ant-media',
                                           'bg-white/10': acc.platform === 'custom-rtmp'
                                         }">
                                        <span>{{ acc.platform === 'youtube' ? '▶' : acc.platform === 'facebook' ? 'f' : acc.platform === 'tiktok' ? '♪' : acc.platform === 'ant-media' ? 'AMS' : 'RTMP' }}</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-xs font-bold text-white">{{ acc.accountName }}</span>
                                        <span class="text-[10px] text-white/40 uppercase">{{ acc.platform }}</span>
                                    </div>
                                </div>
                                <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center" :class="configState.platforms.includes(acc._id) ? 'bg-blue-600 border-transparent' : ''">
                                    <CheckOne v-if="configState.platforms.includes(acc._id)" theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                            <div v-if="platformStore.accounts.length === 0" class="text-xs text-white/20 p-4 border border-dashed border-white/10 rounded-xl text-center">No accounts connected. Please add one in settings.</div>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">Frame Ratio</label>
                        <div class="flex gap-2">
                            <button v-for="r in ['16:9', '9:16']" :key="r"
                                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2"
                                :class="configState.ratio === r ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'"
                                @click="configState.ratio = r as '16:9' | '9:16'">
                                <span :class="r === '16:9' ? 'w-5 h-3' : 'w-3 h-5'" class="border border-current rounded-sm"></span>
                                {{ r === '16:9' ? 'Landscape' : 'Portrait' }}
                            </button>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">Overlays</label>
                        <div class="grid grid-cols-1 gap-2">
                            <label v-for="opt in [{key: 'showLowerThird', label: 'Lower Third (Product Info)'}, {key: 'showTicker', label: 'News Ticker (Product List)'}, {key: 'showChat', label: 'Live Chat Bubble'}]" :key="opt.key"
                                class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                <span class="text-xs text-white/70">{{ opt.label }}</span>
                                <el-switch v-model="configState[opt.key]" size="small" />
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Background & Music -->
                <div class="space-y-6">
                    <!-- Background Selector -->
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">Background</label>
                            <div class="flex gap-1">
                                <el-input v-model="configState.bgSearch" placeholder="Search..." size="small" class="w-32 studio-search" @keyup.enter="searchBackgrounds">
                                    <template #suffix><Search theme="outline" size="12" class="cursor-pointer" @click="searchBackgrounds" /></template>
                                </el-input>
                            </div>
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                            <!-- Local Upload -->
                             <div class="aspect-video rounded-lg overflow-hidden border-2 border-dashed border-white/10 cursor-pointer hover:border-blue-500/50 transition-all flex flex-col items-center justify-center gap-1 bg-white/5"
                                 @click="bgInput?.click()">
                                <Upload theme="outline" size="16" class="text-white/40" />
                                <span class="text-[8px] text-white/40 uppercase font-bold">Upload</span>
                                <input type="file" ref="bgInput" class="hidden" accept="image/*" @change="handleLocalUpload('bg', undefined, $event)" />
                            </div>
                            <!-- Presets -->
                            <div v-for="bg in studioStore.backgroundAssets.slice(0, 3)" :key="bg.id"
                                class="aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative group"
                                :class="configState.bgId === bg.id ? 'border-blue-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'"
                                @click="configState.bgId = bg.id">
                                <img :src="bg.thumbnail" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100" v-if="configState.bgId !== bg.id">
                                    <Pic theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                            <!-- Search Results -->
                            <div v-for="photo in searchResults.backgrounds" :key="photo.id"
                                class="aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative group"
                                :class="configState.bgId === photo.details.src ? 'border-blue-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'"
                                @click="configState.bgId = photo.details.src">
                                <img :src="photo.preview" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100" v-if="configState.bgId !== photo.details.src">
                                    <Search theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Music Selector -->
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">Background Music</label>
                            <button class="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1" @click="musicInput?.click()">
                                <Upload theme="outline" size="10" />
                                UPLOAD MP3
                            </button>
                            <input type="file" ref="musicInput" class="hidden" accept="audio/*" @change="handleLocalUpload('bgm', undefined, $event)" />
                        </div>
                        <div class="space-y-2">
                            <el-input v-model="configState.bgmSearch" placeholder="Search YouTube..." size="small" class="studio-search" @keyup.enter="searchMusic">
                                <template #prefix><Music theme="outline" size="14" /></template>
                                <template #suffix><Refresh v-if="searchResults.searchingMusic" class="animate-spin" /><Search v-else theme="outline" size="14" class="cursor-pointer" @click="searchMusic" /></template>
                            </el-input>
                            <div v-if="configState.bgmId !== 'none'" class="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                                <div class="flex items-center gap-2 overflow-hidden">
                                    <Music theme="filled" size="14" class="text-blue-400" />
                                    <span class="text-[10px] text-blue-400 font-bold truncate">{{ configState.bgmTitle }}</span>
                                </div>
                                <button class="text-[10px] text-white/40 hover:text-white" @click="configState.bgmId = 'none'">Remove</button>
                            </div>
                            <div v-if="searchResults.music.length > 0" class="max-h-32 overflow-y-auto space-y-1 bg-black/20 rounded-lg p-1 custom-scrollbar">
                                <div v-for="m in searchResults.music" :key="m.videoId"
                                    class="p-2 rounded hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors group"
                                    @click="selectBgm(m)">
                                    <img :src="m.thumbnails[0]?.url" class="w-8 h-8 rounded object-cover" />
                                    <div class="flex-1 overflow-hidden">
                                        <p class="text-[10px] text-white/70 font-bold truncate group-hover:text-white transition-colors">{{ m.title }}</p>
                                        <p class="text-[8px] text-white/30 truncate">{{ m.author }}</p>
                                    </div>
                                    <Plus theme="outline" size="12" class="text-white/20 group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 6: Review -->
        <div v-if="currentStep === 6" class="space-y-6">
            <div class="p-8 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center space-y-4">
                <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckOne theme="outline" size="32" class="text-white" />
                </div>
                <h3 class="text-2xl font-bold text-white">Ready to Go Live?</h3>
                <p class="text-white/60 max-w-md mx-auto">
                    We've prepared {{ selectedProductIds.length }} products and coordinated with {{ activeInfluencers.length }} influencers. All visual aids and scripts are synced.
                </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">Selected Products</div>
                    <div class="text-xl font-bold text-white">{{ selectedProductIds.length }}</div>
                </div>
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">Aspect Ratio</div>
                    <div class="text-xl font-bold text-white">{{ configState.ratio }}</div>
                </div>
            </div>

            <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                <div class="text-[10px] text-white/40 uppercase font-bold mb-3">Target Platforms</div>
                <div class="flex flex-wrap gap-2">
                    <div v-for="aid in configState.platforms" :key="aid" 
                         class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div class="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black"
                             :class="{
                               'bg-red-600': platformStore.accounts.find(a => a._id === aid)?.platform === 'youtube',
                               'bg-blue-700': platformStore.accounts.find(a => a._id === aid)?.platform === 'facebook',
                               'bg-yellow-500 text-black': platformStore.accounts.find(a => a._id === aid)?.platform === 'ant-media',
                               'bg-white/10': !['youtube','facebook'].includes(platformStore.accounts.find(a => a._id === aid)?.platform)
                             }">▶</div>
                        <span class="text-xs font-bold text-white">{{ platformStore.accounts.find(a => a._id === aid)?.accountName || aid }}</span>
                    </div>
                    <div v-if="configState.platforms.length === 0" class="text-xs text-white/20 italic">No platforms selected</div>
                </div>
            </div>

            <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                <div class="text-[10px] text-white/40 uppercase font-bold mb-3">AI Crew</div>
                <div class="flex -space-x-2">
                    <el-avatar v-for="inf in activeInfluencers" :key="inf.entityId" :src="getFileUrl(inf.visual?.thumbnailUrl)" class="border-2 border-black" />
                </div>
            </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-white/10 flex items-center justify-between bg-black/40">
        <button v-if="currentStep > 1" @click="prevStep" class="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all">Back</button>
        <div v-else></div>
        
        <button v-if="currentStep < 6" @click="nextStep" class="px-8 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl font-bold shadow-lg shadow-white/10 transition-all flex items-center gap-2">
            Next
            <i class="i-lucide-chevron-right w-5 h-5"></i>
        </button>
        <button v-else @click="startLive" class="px-12 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
            START LIVE NOW
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.studio-search {
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    box-shadow: none !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
  }
  :deep(.el-input__inner) {
    color: white !important;
    font-size: 10px !important;
  }
}
</style>
