<template>
    <div class="gemini-live-chat min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] p-6">
        <!-- Header -->
        <div class="max-w-7xl mx-auto mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-black text-white mb-2">🎙️ {{ t('vtubers.geminiChat.title') }}</h1>
                    <p class="text-sm text-white/60">{{ t('vtubers.geminiChat.subtitle') }}</p>
                </div>
                <div class="flex items-center gap-4">
                    <el-radio-group v-model="viewMode" size="large" class="glass-radio">
                        <el-radio-button value="chat">{{ t('vtubers.geminiChat.tabs.liveChat') }}</el-radio-button>
                        <el-radio-button value="history">{{ t('vtubers.geminiChat.tabs.history') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div v-if="viewMode === 'chat'" class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Archive Selection -->
            <div class="lg:col-span-1">
                <div class="glass-panel p-6">
                    <h2 class="text-lg font-black text-white mb-4">{{ t('vtubers.geminiChat.sidebar.selectVtuber') }}</h2>
                    
                    <!-- Filter Info -->
                    <el-alert 
                        type="info" 
                        :closable="false"
                        class="mb-4 bg-blue-500/10 border-blue-500/20"
                    >
                        <template #title>
                            <span class="text-xs">{{ t('vtubers.geminiChat.sidebar.geminiOnly') }}</span>
                        </template>
                    </el-alert>

                    <!-- Archive List -->
                    <div class="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <div 
                            v-for="archive in liveCompatibleVTubers" 
                            :key="archive.entityId"
                            @click="selectArchive(archive)"
                            :class="[
                                'p-4 rounded-xl border cursor-pointer transition-all',
                                selectedArchive?.entityId === archive.entityId
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                            ]"
                        >
                            <div class="flex items-start gap-3">
                                <el-avatar :src="getFileUrl(archive.visual?.thumbnailUrl)" class="w-12 h-12 rounded-lg object-cover" >
                                    <template #error>
                                        <el-icon>
                                            <User />
                                        </el-icon> 
                                    </template>
                                </el-avatar>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h3 class="text-sm font-bold text-white truncate">{{ archive.name }}</h3>
                                        <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                            🎙️ {{ t('vtubers.geminiChat.sidebar.liveReady') }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-white/60 line-clamp-2">{{ archive.description }}</p>
                                    <div class="flex items-center gap-2 mt-2">
                                        <span class="text-xs text-white/40">{{ t('vtubers.geminiChat.sidebar.voiceLabel') }}</span>
                                        <span class="text-xs text-blue-400">{{ archive.voiceConfig?.voiceId || 'Puck' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Empty State -->
                        <div v-if="liveCompatibleVTubers.length === 0" class="text-center py-12">
                            <el-icon class="text-4xl text-white/20 mb-4"><info /></el-icon>
                            <p class="text-sm text-white/60 mb-4">{{ t('vtubers.geminiChat.sidebar.empty.title') }}</p>
                            <router-link to="/vtubers" class="text-xs text-blue-400 hover:text-blue-300">
                                {{ t('vtubers.geminiChat.sidebar.empty.action') }}
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Live Session -->
            <div class="lg:col-span-2">
                <div class="glass-panel p-8">
                    <!-- Not Connected State -->
                    <div v-if="!isConnected" class="text-center py-20">
                        <el-icon class="text-6xl text-white/20 mb-6"><microphone /></el-icon>
                        <h2 class="text-2xl font-black text-white mb-4">{{ t('vtubers.geminiChat.session.ready.title') }}</h2>
                        <p class="text-sm text-white/60 mb-8">
                            {{ selectedArchive ? t('vtubers.geminiChat.session.ready.connectTo', { name: selectedArchive.name }) : t('vtubers.geminiChat.session.ready.selectToBegin') }}
                        </p>
                        <el-button 
                            type="primary" 
                            size="large"
                            :disabled="!selectedArchive"
                            @click="startSession"
                            class="px-8"
                        >
                            <el-icon class="mr-2"><play-one /></el-icon>
                            {{ t('vtubers.geminiChat.session.ready.startAction') }}
                        </el-button>
                    </div>

                    <!-- Connected State -->
                    <div v-else class="space-y-6">
                        <!-- Avatar Display -->
                        <div class="aspect-video rounded-2xl border border-white/10 bg-black/40 overflow-hidden relative">
                            <Live2DViewer 
                                v-if="selectedArchive?.visual?.modelType === 'live2d'"
                                ref="live2dViewer"
                                :model-url="selectedArchive.visual.modelUrl"
                                :speaking-vol="audioLevel"
                                :background-url="selectedArchive.visual?.backgroundUrl"
                                :config="selectedArchive.visual?.live2dConfig"
                            />
                            <VRMViewer 
                                v-else-if="selectedArchive?.visual?.modelType === 'vrm'"
                                ref="vrmViewer"
                                :model-url="selectedArchive.visual.modelUrl"
                                :speaking-vol="audioLevel"
                            />
                            <StaticPhotoViewer 
                                v-else
                                :model-url="selectedArchive?.visual?.modelUrl"
                            />

                            <!-- Camera Preview Overlay -->
                            <div v-if="isCameraActive" class="absolute bottom-4 right-4 w-40 aspect-video rounded-xl border-2 border-blue-500 overflow-hidden shadow-2xl z-30 bg-black">
                                <video ref="previewVideo" autoplay playsinline class="w-full h-full object-cover"></video>
                                <div class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-blue-500 text-[8px] font-black text-white uppercase">{{ t('vtubers.geminiChat.session.visionActive') }}</div>
                            </div>

                            <!-- Audio Level Indicator -->
                            <div class="absolute bottom-4 left-4 right-4 max-w-[calc(100%-180px)]">
                                <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                                        :style="{ width: `${audioLevel * 100}%` }"
                                    ></div>
                                </div>
                            </div>

                            <!-- Connection Status -->
                            <div class="absolute top-4 right-4">
                                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span class="text-xs text-white font-medium">{{ t('vtubers.geminiChat.session.live') }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Controls -->
                        <div class="flex items-center justify-center gap-4">
                            <el-button 
                                :type="isSpeaking ? 'danger' : 'primary'"
                                size="large"
                                circle
                                @click="toggleMicrophone"
                            >
                                <el-icon class="text-2xl">
                                    <microphone v-if="!isSpeaking" />
                                    <microphone-one v-else />
                                </el-icon>
                            </el-button>

                            <el-button 
                                :type="isCameraActive ? 'primary' : 'info'"
                                size="large"
                                circle
                                @click="toggleCamera"
                                :title="isCameraActive ? t('vtubers.geminiChat.session.controls.stopVision') : t('vtubers.geminiChat.session.controls.startVision')"
                            >
                                <el-icon class="text-2xl">
                                    <videocamera v-if="!isCameraActive" />
                                    <camera v-else />
                                </el-icon>
                            </el-button>

                            <el-button 
                                type="danger"
                                size="large"
                                @click="endSession"
                            >
                                <el-icon class="mr-2"><close /></el-icon>
                                {{ t('vtubers.geminiChat.session.controls.endSession') }}
                            </el-button>
                        </div>

                        <!-- Session Info -->
                        <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                            <div class="text-center">
                                <p class="text-xs text-white/40 mb-1">{{ t('vtubers.geminiChat.session.info.archive') }}</p>
                                <p class="text-sm text-white font-medium">{{ selectedArchive?.name }}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-white/40 mb-1">{{ t('vtubers.geminiChat.session.info.voice') }}</p>
                                <p class="text-sm text-white font-medium">{{ selectedArchive?.voiceConfig?.voiceId || 'Puck' }}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-white/40 mb-1">{{ t('vtubers.geminiChat.session.info.sessionId') }}</p>
                                <p class="text-xs text-white/60 font-mono truncate">{{ sessionId }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Session History View -->
        <div v-else class="max-w-4xl mx-auto">
            <div class="glass-panel p-8">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-black text-white">{{ t('vtubers.geminiChat.history.title') }}</h2>
                    <el-button @click="fetchSessionHistory" :loading="loadingSessionHistory" class="glass-btn">
                        <el-icon class="mr-2"><refresh /></el-icon> {{ t('common.refresh') }}
                    </el-button>
                </div>

                <div v-if="loadingSessionHistory" class="flex justify-center py-20">
                    <el-skeleton :rows="5" animated />
                </div>

                <div v-else-if="sessionHistory.length === 0" class="text-center py-20">
                    <el-icon class="text-6xl text-white/20 mb-6"><History /></el-icon>
                    <p class="text-white/40">{{ t('vtubers.geminiChat.history.empty') }}</p>
                </div>

                <div v-else class="space-y-4">
                    <div 
                        v-for="session in sessionHistory" 
                        :key="session.sessionId"
                        class="p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        @click="viewSessionDetails(session)"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <img :src="getFileUrl(session.avatarUrl || '/default-avatar.png')" class="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <h3 class="text-sm font-bold text-white">{{ session.archiveName }}</h3>
                                    <p class="text-xs text-white/40">{{ formatDate(session.startTime) }}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
                                    {{ session.metadata?.voiceName || 'Puck' }}
                                </span>
                                <el-icon class="ml-2 text-white/20"><right /></el-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Session Detail Dialog -->
        <el-dialog
            v-model="showSessionDialog"
            :title="t('vtubers.geminiChat.dialogs.transcript.title')"
            width="600px"
            class="glass-dialog custom-dialog"
            destroy-on-close
        >
            <div v-if="selectedSessionDetail" class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-2">
                <div 
                    v-for="(msg, index) in selectedSessionDetail.messages" 
                    :key="index"
                    :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
                >
                    <div 
                        :class="[
                            'max-w-[80%] p-3 rounded-2xl text-sm shadow-lg',
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white/10 text-white/90 border border-white/5 rounded-tl-none'
                        ]"
                    >
                        <p v-if="msg.content">{{ msg.content }}</p>
                        
                        <!-- Tool Calls Display -->
                        <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="mt-2 pt-2 border-t border-white/10">
                            <div v-for="(call, cIndex) in msg.toolCalls" :key="cIndex" class="flex items-center gap-2 text-xs text-white/40 italic">
                                <el-icon><setting-two /></el-icon>
                                <span>{{ t('vtubers.geminiChat.dialogs.transcript.usedTool', { name: call.name }) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showSessionDialog = false">{{ t('common.close') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVTuberStore } from '@/stores/vtuber';
import { useUserStore } from '@/stores/user';
import { useLiveStore } from '@/stores/live';
import { useGeminiLive } from '@/composables/useGeminiLive';
import api, { getFileUrl } from '@/utils/api';
import Live2DViewer from '@/components/vtuber/Live2DViewer.vue';
import VRMViewer from '@/components/vtuber/VRMViewer.vue';
import StaticPhotoViewer from '@/components/vtuber/StaticPhotoViewer.vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { 
    Back, 
    Microphone, 
    MicrophoneOne, 
    PlayOne, 
    Close,
    Info,
    Refresh,
    History,
    Right,
    SettingTwo,
    Videocamera,
    Camera,
    User
} from '@icon-park/vue-next';

const { t } = useI18n()
const vtuberStore = useVTuberStore();
const userStore = useUserStore();
const liveStore = useLiveStore();
const {
    isConnected, 
    isSpeaking, 
    audioLevel, 
    isCameraActive,
    sessionId, 
    // archiveName, // Removed as we use selectedArchive.name
    // voiceName, // Removed as we use selectedArchive.voiceConfig.voiceId
    connect,
    disconnect,
    startMicrophone,
    stopMicrophone,
    startCamera,
    stopCamera,
    setToolCallCallback,
    sendToolResponse
} = useGeminiLive();

const previewVideo = ref<HTMLVideoElement | null>(null);

const viewMode = ref<'chat' | 'history'>('chat');
const sessionHistory = ref<any[]>([]);
const loadingSessionHistory = ref(false);
const showSessionDialog = ref(false);
const selectedSessionDetail = ref<any>(null);

const selectedArchive = ref<any>(null);
const live2dViewer = ref<any>(null);
const vrmViewer = ref<any>(null);

// Filter VTubers to show only Gemini TTS compatible ones
const liveCompatibleVTubers = computed(() => {
    return (vtuberStore.vtubers || []).filter(vtuber => 
        vtuber.meta?.voiceConfig?.provider === 'gemini'
    );
});

// Load initial data
onMounted(async () => {
    // Archives are already loaded by the store
    fetchSessionHistory();
});

// Fetch session history
async function fetchSessionHistory() {
    loadingSessionHistory.value = true;
    try {
        const data = await liveStore.fetchSessions();
        if (data) {
            sessionHistory.value = data;
        }
    } catch (error) {
        console.error('[GeminiLiveChat] Failed to fetch history:', error);
    } finally {
        loadingSessionHistory.value = false;
    }
}

// View session details
async function viewSessionDetails(session: any) {
    try {
        const data = await liveStore.fetchSessionDetail(session.sessionId);
        if (data) {
            selectedSessionDetail.value = data;
            showSessionDialog.value = true;
        }
    } catch (error) {
        ElMessage.error(t('vtubers.geminiChat.toasts.loadDetailFailed'));
    }
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Select archive
function selectArchive(archive: any) {
    if (isConnected.value) {
        ElMessage.warning(t('vtubers.geminiChat.toasts.endCurrentSession'));
        return;
    }
    selectedArchive.value = archive;
}

// Start live session
async function startSession() {
    if (!selectedArchive.value) return;

    try {
        await connect({
            archiveId: selectedArchive.value.entityId,
            token: userStore.token || undefined
        });

        // Register tool call handler
        setToolCallCallback(handleToolCall);

        // Start microphone automatically
        await startMicrophone();
    } catch (error: any) {
        console.error('[GeminiLiveChat] Failed to start session:', error);
        ElMessage.error(t('vtubers.geminiChat.toasts.startFailed'));
    }
}

// Handle tool calls from Gemini
function handleToolCall(toolCall: any) {
    console.log('[GeminiLiveChat] Executing tool call:', toolCall);

    for (const call of toolCall.functionCalls || []) {
        const functionName = call.name;
        const args = call.args;
        const callId = call.id;

        if (!functionName || !args) continue;

        let result = { success: true };

        switch (functionName) {
            case 'set_avatar_pose':
                if (live2dViewer.value?.setPose) live2dViewer.value.setPose(args.part, args.value);
                if (vrmViewer.value?.setPose) vrmViewer.value.setPose(args.part, args.value);
                break;
            case 'set_eye_focus':
                if (live2dViewer.value?.setEyeFocus) live2dViewer.value.setEyeFocus(args.target);
                if (vrmViewer.value?.setEyeFocus) vrmViewer.value.setEyeFocus(args.target);
                break;
            case 'trigger_performance':
                if (live2dViewer.value?.triggerPerformance) live2dViewer.value.triggerPerformance(args.style, args.intensity);
                if (vrmViewer.value?.triggerPerformance) vrmViewer.value.triggerPerformance(args.style, args.intensity);
                break;
            case 'change_expression':
            case 'set_expression':
                changeExpression(args.expression);
                break;
            case 'play_animation':
            case 'play_motion':
                playAnimation(args.animation || args.motion);
                break;
            case 'change_mood':
            case 'set_mood':
                changeMood(args.mood);
                break;
            case 'switch_scene':
            case 'switch_layout':
                ElMessage.info(t('vtubers.geminiChat.toasts.switchedScene', { name: args.sceneId || args.layoutId }));
                break;
            case 'trigger_hype_event':
                ElMessage.success(t('vtubers.geminiChat.toasts.hypeEvent', { reason: args.reason }));
                break;
            case 'shoutout_viewer':
                ElMessage.success(t('vtubers.geminiChat.toasts.shoutout', { name: args.viewerName }));
                break;
            case 'start_quest':
                ElMessage.warning(t('vtubers.geminiChat.toasts.questStarted', { title: args.title }));
                break;
            case 'trigger_dynamic_deal':
                ElMessage.success(t('vtubers.geminiChat.toasts.aiDeal', { reason: args.reason }));
                break;
            case 'generate_background':
                ElMessage.info(t('vtubers.geminiChat.toasts.generatingBg', { prompt: args.prompt }));
                break;
            case 'capture_moment':
            case 'archive_moment':
                ElMessage.info(t('vtubers.geminiChat.toasts.momentCaptured', { description: args.description }));
                break;
            default:
                console.warn('[GeminiLiveChat] Unknown tool:', functionName);
                result = { success: false, message: `Unknown tool: ${functionName}` } as any;
        }

        // Send feedback back to Gemini
        if (callId) {
            sendToolResponse(callId, functionName, result);
        }
    }
}

// Avatar control functions
function changeExpression(expression: string) {
    console.log('[GeminiLiveChat] Changing expression to:', expression);
    
    // For Live2D viewer
    if (live2dViewer.value?.setExpression) {
        live2dViewer.value.setExpression(expression);
    }
    
    // For VRM viewer
    if (vrmViewer.value?.setExpression) {
        vrmViewer.value.setExpression(expression);
    }
    
    ElMessage.info(t('vtubers.geminiChat.toasts.expression', { name: expression }));
}

function playAnimation(animation: string) {
    console.log('[GeminiLiveChat] Playing animation:', animation);
    
    // For Live2D viewer
    if (live2dViewer.value?.playMotion) {
        live2dViewer.value.playMotion(animation);
    }
    
    // For VRM viewer
    if (vrmViewer.value?.playAnimation) {
        vrmViewer.value.playAnimation(animation);
    }
    
    ElMessage.info(t('vtubers.geminiChat.toasts.animation', { name: animation }));
}

function changeMood(mood: string) {
    console.log('[GeminiLiveChat] Changing mood to:', mood);
    
    // For Live2D viewer
    if (live2dViewer.value?.setMood) {
        live2dViewer.value.setMood(mood);
    }
    
    // For VRM viewer
    if (vrmViewer.value?.setMood) {
        vrmViewer.value.setMood(mood);
    }
    
    ElMessage.info(t('vtubers.geminiChat.toasts.mood', { name: mood }));
}

// End live session
function endSession() {
    disconnect();
    ElMessage.info(t('vtubers.geminiChat.toasts.sessionEnded'));
}

// Toggle microphone
function toggleMicrophone() {
    if (isSpeaking.value) {
        stopMicrophone();
    } else {
        startMicrophone();
    }
}

// Toggle camera
async function toggleCamera() {
    if (isCameraActive.value) {
        stopCamera();
    } else {
        const stream = await startCamera();
        if (previewVideo.value) {
            previewVideo.value.srcObject = stream;
        }
    }
}
</script>

<style scoped>
.glass-panel {
    background: rgba(10, 10, 10, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 1.5rem;
}

.glass-btn {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: white;
    font-size: 0.875rem;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.glass-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
</style>
