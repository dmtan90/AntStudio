<template>
    <el-dialog
        v-model="visible"
        :title="t('influencers.dashboard.title')"
        width="90%"
        destroy-on-close
        class="influencer-dashboard-dialog"
        :fullscreen="true"
    >
        <div v-if="influencer" class="dashboard-content">
            <!-- Header with Active Session Info -->
            <div class="dashboard-header">
                <div class="user-info">
                    <el-avatar :size="64" :src="getFileUrl(influencer.visual?.thumbnailUrl || influencer.visual?.modelUrl)" />
                    <div class="name-box">
                        <h2>{{ influencer.identity.name }}</h2>
                        <div class="status-badge" :class="{ active: influencer.activeSession?.isLive }">
                            <div class="dot"></div>
                            {{ influencer.activeSession?.isLive ? t('influencers.dashboard.activeSession') : t('influencers.dashboard.engines.idle') }}
                        </div>
                    </div>
                </div>

                <div class="quick-stats">
                    <div class="stat-item">
                        <span class="label">{{ t('influencers.dashboard.stats.activeHours') }}</span>
                        <span class="value">{{ influencer.analytics?.totalStreamTime ? (influencer.analytics.totalStreamTime / 60).toFixed(1) : '0' }}h</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">{{ t('influencers.dashboard.stats.sessions') }}</span>
                        <span class="value">{{ influencer.analytics?.totalInteractions || 0 }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">{{ t('influencers.dashboard.stats.audienceReach') }}</span>
                        <span class="value">{{ influencer.analytics?.engagementScore || 0 }}</span>
                    </div>
                </div>
            </div>

            <!-- Main Control Grid -->
            <div class="dashboard-grid">
                <!-- Left Column: Engines & Automation -->
                <div class="grid-column">
                    <GCard class="engine-card">
                        <template #header>
                            <div class="card-header">
                                <Cpu theme="outline" size="20" />
                                <h3>{{ t('influencers.dashboard.engines.status') }}</h3>
                            </div>
                        </template>
                        
                        <div class="engine-list">
                            <div class="engine-item">
                                <div class="info">
                                    <VideoOne theme="outline" size="18" />
                                    <span>{{ t('influencers.dashboard.engines.content') }}</span>
                                </div>
                                <el-tag :type="influencer.automationSchedule?.vod?.enabled ? 'success' : 'info'" size="small">
                                    {{ influencer.automationSchedule?.vod?.enabled ? t('influencers.dashboard.engines.operational') : t('influencers.dashboard.engines.idle') }}
                                </el-tag>
                            </div>
                            <div class="engine-item">
                                <div class="info">
                                    <Broadcast theme="outline" size="18" />
                                    <span>{{ t('influencers.dashboard.engines.live') }}</span>
                                </div>
                                <el-tag :type="influencer.automationSchedule?.live?.enabled ? 'success' : 'info'" size="small">
                                    {{ influencer.automationSchedule?.live?.enabled ? t('influencers.dashboard.engines.operational') : t('influencers.dashboard.engines.idle') }}
                                </el-tag>
                            </div>
                        </div>

                        <div class="engine-details mt-4">
                            <p class="text-xs text-gray-500">{{ t('influencers.create.wizard.fields.jobRole') }}: <span class="text-blue-400 font-bold">{{ influencer.jobRole || 'Influencer' }}</span></p>
                        </div>
                    </GCard>

                    <GCard class="memory-card mt-4">
                        <template #header>
                            <div class="card-header">
                                <Brain theme="outline" size="20" />
                                <h3>{{ t('influencers.dashboard.memory.title') }}</h3>
                            </div>
                        </template>
                        <div class="memory-content">
                            <div class="memory-section">
                                <div class="section-label">{{ t('influencers.dashboard.memory.activeKnowledge') }}</div>
                                <div class="knowledge-items">
                                    <div v-for="(item, idx) in influencer.memory?.knowledgeEntries?.slice(0, 3)" :key="idx" class="knowledge-pill">
                                        {{ item.title }}
                                    </div>
                                    <div v-if="!influencer.memory?.knowledgeEntries?.length" class="text-gray-600 text-[10px] italic">No active knowledge entries.</div>
                                </div>
                            </div>
                            <div class="memory-section mt-3">
                                <div class="section-label">{{ t('influencers.dashboard.memory.history') }}</div>
                                <div class="history-list">
                                    <div v-for="(event, idx) in influencer.memory?.keyEvents?.slice(-2)" :key="idx" class="history-item">
                                        <time>{{ new Date(event.date).toLocaleDateString() }}</time>
                                        <p>{{ event.description }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GCard>

                    <GCard class="collaborators-card mt-4">
                        <template #header>
                            <div class="card-header">
                                <Peoples theme="outline" size="20" />
                                <h3>{{ t('influencers.dashboard.collaborators.title') }}</h3>
                                <div class="spacer"></div>
                                <GButton size="small" type="primary" :icon="Plus" @click="openInviteDialog" />
                            </div>
                        </template>
                        <div class="collaborators-content">
                            <div v-if="influencer.activeSession?.coHosts?.length" class="co-hosts-list mb-4">
                                <div class="section-label text-[9px] uppercase tracking-wider text-green-400 mb-2">Active Co-Hosts</div>
                                <div v-for="coHostId in influencer.activeSession.coHosts" :key="coHostId" class="collaborator-item">
                                    <div class="avatar-sm bg-purple-900/30 text-purple-200">{{ coHostId.charAt(0).toUpperCase() }}</div>
                                    <span class="name text-xs">{{ coHostId }}</span>
                                    <div class="spacer"></div>
                                    <GButton size="small" type="primary" class="text-red-400" @click="toggleCoHost(coHostId, 'remove')">Drop</GButton>
                                </div>
                            </div>

                            <div v-if="influencer.collaborationNetwork?.length" class="network-list">
                                <div v-for="collabId in influencer.collaborationNetwork" :key="collabId" class="collaborator-item">
                                    <div class="avatar-sm bg-gray-800 text-gray-400">{{ collabId.charAt(0).toUpperCase() }}</div>
                                    <span class="name text-xs">{{ collabId }}</span>
                                    <div class="spacer"></div>
                                    <el-tooltip content="Invite to Session">
                                        <GButton size="small" type="primary" :icon="Broadcast" @click="toggleCoHost(collabId, 'add')" />
                                    </el-tooltip>
                                </div>
                            </div>
                            <div v-else class="text-gray-600 text-[10px] italic py-2">No neural bonds established yet.</div>
                        </div>
                    </GCard>
                </div>

                <!-- Right Column: Video Pool & Clips -->
                <div class="grid-column flex-2">
                    <GCard class="pool-card">
                        <template #header>
                            <div class="card-header">
                                <VideoOne theme="outline" size="20" />
                                <h3>{{ t('influencers.dashboard.videoPool.title') }}</h3>
                                <div class="spacer"></div>
                                <GButton size="small" type="primary" :icon="Refresh" @click="syncPool">{{ t('common.refresh') }}</GButton>
                            </div>
                        </template>

                        <div class="pool-desc mb-4">
                            <p class="text-sm text-gray-400">{{ t('influencers.dashboard.videoPool.desc') }}</p>
                        </div>

                        <div v-if="clipsArray.length" class="clips-grid">
                            <div v-for="clip in clipsArray" :key="clip.productId" class="clip-card" @click="previewClip(clip)">
                                <div class="clip-thumb aspect-square">
                                    <video :src="getFileUrl(clip.url)" muted preload="metadata" />
                                    <div class="play-overlay">
                                        <PlayOne theme="filled" size="24" />
                                    </div>
                                </div>
                                <div class="clip-info">
                                    <span class="prod-id">PID: {{ clip.productId }}</span>
                                    <span class="timestamp">{{ t('common.time.justNow') }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-pool py-12 text-center border border-dashed border-white/10 rounded-xl">
                            <VideoFile theme="outline" size="48" class="text-gray-700 mb-2" />
                            <p class="text-gray-500">{{ t('influencers.dashboard.videoPool.empty') }}</p>
                            <GButton class="mt-4" size="small" type="primary" @click="showProductLink = true">{{ t('influencers.dashboard.videoPool.generateForProduct') }}</GButton>
                        </div>
                    </GCard>
                </div>
            </div>
        </div>

        <!-- Product Selection Dialog -->
        <el-dialog v-model="showProductLink" :title="t('influencers.dashboard.videoPool.generateForProduct')" width="400px" append-to-body>
            <div class="p-4">
                <el-input v-model="productSearch" placeholder="Enter Product IDs (comma separated)" class="mb-4" />
                <GButton :loading="preparing" type="primary" block @click="prepareVideos">{{ t('common.generate') }}</GButton>
            </div>
        </el-dialog>
    </el-dialog>

    <!-- Clip Preview Modal -->
    <el-dialog v-model="clipPreviewVisible" :title="activeClip?.productId" width="600px" append-to-body>
        <video v-if="activeClip" :src="getFileUrl(activeClip.url)" controls autoplay class="w-full rounded-xl" />
    </el-dialog>

    <!-- Invite Collaborator Dialog -->
    <el-dialog v-model="showInviteDialog" :title="t('influencers.dashboard.collaborators.invite')" width="450px" append-to-body>
        <div class="p-4">
            <el-input v-model="collaboratorSearch" placeholder="Search Neural Network..." class="mb-4">
                <template #prefix><Search /></template>
            </el-input>
            
            <div class="invites-list max-h-[300px] overflow-y-auto">
                <div v-for="i in filteredInfluencers" :key="i.entityId" class="collaborator-item p-2 hover:bg-white/5 rounded-lg transition-colors mb-1">
                    <div class="avatar-md bg-blue-900/40 text-blue-200 mr-3">{{ i.identity.name.charAt(0).toUpperCase() }}</div>
                    <div class="flex flex-col flex-1">
                        <span class="font-bold text-sm">{{ i.identity.name }}</span>
                        <span class="text-[10px] text-gray-500">{{ i.jobRole || 'Influencer' }}</span>
                    </div>
                    <GButton size="small" type="primary" @click="addCollaborator(i.entityId)">Add</GButton>
                </div>
                <div v-if="!filteredInfluencers.length" class="text-center py-8 text-gray-600 text-sm italic">
                    No matching influencers found.
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Cpu, VideoOne, Broadcast, Refresh, PlayOne, Brain, VideoFile, Peoples, Plus, Search, Link } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import GCard from '@/components/ui/GCard.vue';
import GButton from '@/components/ui/GButton.vue';
import { useInfluencerStore } from '@/stores/influencer';
import { useStudioStore } from '@/stores/studio';

const props = defineProps<{
    modelValue: boolean;
    influencer: any;
}>();

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const clipPreviewVisible = ref(false);
const activeClip = ref<any>(null);
const showProductLink = ref(false);
const productSearch = ref('');
const preparing = ref(false);

const showInviteDialog = ref(false);
const collaboratorSearch = ref('');

const influencerStore = useInfluencerStore();
const studioStore = useStudioStore();

const filteredInfluencers = computed(() => {
    return (influencerStore.influencers || []).filter(i => 
        i.entityId !== props.influencer.entityId &&
        i.identity.name.toLowerCase().includes(collaboratorSearch.value.toLowerCase()) &&
        !(props.influencer.collaborationNetwork || []).includes(i.entityId)
    );
});

const clipsArray = computed(() => {
    if (!props.influencer?.visual?.aidolClips) return [];
    
    // Mongoose Map is coming as an object in the frontend response usually
    const clips = props.influencer.visual.aidolClips;
    return Object.entries(clips).map(([productId, url]) => ({
        productId,
        url: url as string
    }));
});

const previewClip = (clip: any) => {
    activeClip.value = clip;
    clipPreviewVisible.value = true;
};

const syncPool = async () => {
    if (!props.influencer?.entityId) return;
    await influencerStore.fetchInfluencer(props.influencer.entityId);
    console.log('Pool synced');
};

const prepareVideos = async () => {
    if (!productSearch.value) return;
    const ids = productSearch.value.split(',').map(id => id.trim()).filter(id => id);
    if (!ids.length) return;

    preparing.value = true;
    try {
        await influencerStore.prepareSalesVideos(props.influencer.entityId, ids);
        showProductLink.value = false;
        productSearch.value = '';
        // Automatically sync after a few seconds to see if it started appearing (mock behavior)
        setTimeout(syncPool, 3000);
    } finally {
        preparing.value = false;
    }
};

const openInviteDialog = async () => {
    await influencerStore.fetchInfluencers();
    showInviteDialog.value = true;
};

const addCollaborator = async (collaboratorId: string) => {
    await influencerStore.toggleCollaborator(props.influencer.entityId, collaboratorId, 'add');
    showInviteDialog.value = false;
    collaboratorSearch.value = '';
};

const toggleCoHost = async (coHostId: string, action: 'add' | 'remove') => {
    await influencerStore.toggleCoHost(props.influencer.entityId, coHostId, action);
    
    // Also sync the live studio layout if a session is active
    const updatedInfluencer = influencerStore.currentInfluencer;
    if (action === 'add') {
        // Find co-host name from the store
        const coHostInfluencer = (influencerStore.influencers || []).find((i: any) => i.entityId === coHostId);
        const coHostName = coHostInfluencer?.identity?.name || coHostId;
        studioStore.addAICoHostToStudio(coHostId, coHostName);
    } else {
        studioStore.removeAICoHostFromStudio(coHostId);
    }
};
</script>

<style lang="scss" scoped>
.influencer-dashboard-dialog {
    :deep(.el-dialog) {
        background: #0d0d0f;
        border-radius: 0;
        margin-top: 0 !important;
    }
    
    :deep(.el-dialog__header) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        margin: 0;
        padding: 20px 30px;
    }
}

.dashboard-content {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 30px;
    background: linear-gradient(to right, rgba(139, 92, 246, 0.1), transparent);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .user-info {
        display: flex;
        gap: 20px;
        align-items: center;

        h2 {
            font-size: 28px;
            font-weight: 900;
            margin: 0;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 5px;

            .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #555;
            }

            &.active {
                color: #10b981;
                .dot {
                    background: #10b981;
                    box-shadow: 0 0 10px #10b981;
                }
            }
        }
    }

    .quick-stats {
        display: flex;
        gap: 40px;

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: flex-end;

            .label {
                font-size: 10px;
                font-weight: 900;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .value {
                font-size: 24px;
                font-weight: 900;
                color: #fff;
            }
        }
    }
}

.dashboard-grid {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 20px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;

    h3 {
        font-size: 14px;
        font-weight: 900;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .spacer {
        flex: 1;
    }
}

.engine-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .engine-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.03);
        padding: 12px;
        border-radius: 12px;

        .info {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 13px;
        }
    }
}

.memory-content {
    .memory-section {
        .section-label {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            color: #444;
            margin-bottom: 8px;
        }

        .knowledge-items {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;

            .knowledge-pill {
                background: rgba(59, 130, 246, 0.1);
                color: #60a5fa;
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                border: 1px solid rgba(59, 130, 246, 0.2);
            }
        }

        .history-list {
            display: flex;
            flex-direction: column;
            gap: 10px;

            .history-item {
                background: rgba(255, 255, 255, 0.02);
                padding: 10px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.03);

                time {
                    font-size: 9px;
                    color: #555;
                    font-weight: 900;
                }

                p {
                    font-size: 12px;
                    margin: 2px 0 0;
                    color: #aaa;
                    line-height: 1.4;
                }
            }
        }
    }
}

.clips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;

    .clip-card {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.2);

            .play-overlay {
                opacity: 1;
            }
        }

        .clip-thumb {
            position: relative;
            aspect-ratio: 9/16;
            background: #000;

            video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: 0.6;
            }

            .play-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.4);
                opacity: 0;
                transition: opacity 0.3s;
                color: #fff;
            }
        }

        .clip-info {
            padding: 10px;
            display: flex;
            flex-direction: column;

            .prod-id {
                font-size: 11px;
                font-weight: 900;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .timestamp {
                font-size: 9px;
                color: #555;
                font-weight: 700;
            }
        }
    }
}

.flex-2 {
    flex: 2;
}

@media (max-width: 1000px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
}

.collaborator-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    
    &:last-child {
        border-bottom: none;
    }

    .avatar-sm {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
    }

    .avatar-md {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
    }
}
</style>
