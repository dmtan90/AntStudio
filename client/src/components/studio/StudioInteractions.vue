<template>
    <aside class="interaction-panel glass-dark">
        <div class="section-tabs">
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'layout' }"
                @click="localActiveTab = 'layout'">{{ $t('studio.interactions.tabs.layout') }}</button>
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'scene' }"
                @click="localActiveTab = 'scene'">{{ $t('studio.interactions.tabs.guests') }}</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'chat' }"
                @click="localActiveTab = 'chat'">{{ $t('studio.interactions.tabs.chat') }}</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'moments' }"
                @click="localActiveTab = 'moments'">{{ $t('studio.interactions.tabs.moments') }}</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'stats' }"
                @click="localActiveTab = 'stats'">{{ $t('studio.interactions.tabs.stats') }}</button>
        </div>

        <div v-if="localActiveTab === 'layout'"
            class="layout-flow p-4 animate-in scrollbar-hide overflow-y-auto max-h-[calc(100vh-120px)]">
            <!-- Layout content placeholder -->
            <LayoutSettings />
        </div>

        <div v-else-if="localActiveTab === 'scene'"
            class="scene-flow p-4 animate-in scrollbar-hide overflow-y-auto max-h-[calc(100vh-120px)]">
            <!-- Scene content placeholder -->
            <GuestSettings :guest-personas="guestPersonas" :remote-guests="remoteGuests" @invite-guest="inviteGuest"
                @summon-guest="summonGuest" @toggle-guest="toggleGuest" @add-mobile-cam="addMobileCam"
                @toggle-mute="toggleMute" @toggle-camera="toggleCamera" @remove-guest="removeGuest"
                @assign-slot="assignSlot" :guest-video-elements="guestVideoElements" />
        </div>

        <div v-else-if="localActiveTab === 'chat'" class="chat-flow" ref="chatFlow">
            <template v-if="messages.length > 0">
                <div v-for="msg in messages" :key="msg.id" class="chat-message group animate-in"
                    :class="{ 'is-social': msg.isSocial }">
                    <div class="msg-header flex items-center gap-2 justify-between">
                        <div class="flex items-center gap-2">
                            <youtube v-if="msg.user.includes('YouTube')" size="12" class="text-red-500" />
                            <facebook v-else-if="msg.user.includes('FB')" size="12" class="text-blue-500" />
                            <tiktok v-else-if="msg.user.includes('TikTok')" size="12" class="text-pink-500" />
                            <span class="user">{{ msg.user }}:</span>
                        </div>
                        
                        <!-- VTuber Reply Action -->
                        <button v-if="activeVTuber" 
                            @click="handleVTuberReply(msg)"
                            class="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded hover:bg-purple-500/40"
                            :disabled="isProcessingReply">
                            {{ $t('studio.interactions.replyAs') }} {{ activeVTuberName }}
                        </button>
                    </div>
                    <span class="text">
                        <template v-for="(part, index) in parseEmojis(msg.text)" :key="index">
                            <AnimatedEmoji v-if="part.isEmoji" :emoji="part.text" />
                            <span v-else>{{ part.text }}</span>
                        </template>
                    </span>
                    
                    <!-- VTuber Response Display (Optional) -->
                    <div v-if="msg.vtuberResponse" class="mt-2 pl-2 border-l-2 border-purple-500 text-[10px] text-purple-300/80 italic">
                        {{ msg.vtuberResponse }}
                    </div>
                </div>
            </template>
            <div v-else class="empty-chat flex flex-col items-center justify-center h-full opacity-20 gap-4">
                <broadcast theme="outline" size="48" />
                <p class="text-[10px] uppercase font-black tracking-[0.2em] text-center">{{ $t('studio.interactions.waitingEngagement') }}</p>
            </div>
        </div>

        <div v-else-if="localActiveTab === 'moments'" class="moments-flow p-4 animate-in">
            <h4 class="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">{{ $t('studio.interactions.viralPeaks') }}</h4>
            <div v-if="studioStore.viralMoments.length > 0" class="flex flex-col gap-3">
                <div v-for="moment in studioStore.viralMoments" :key="moment.id" 
                    class="moment-card glass-light p-3 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-blue-400">{{ moment.reason }}</span>
                        <span class="text-[8px] opacity-40">{{ new Date(moment.timestamp).toLocaleTimeString() }}</span>
                    </div>
                    <div class="aspect-video bg-black/40 rounded-lg mb-2 flex items-center justify-center group-hover:bg-black/60 transition-colors cursor-pointer relative overflow-hidden">
                        <video v-if="moment.s3Key" :src="getFileUrl(moment.s3Key)" class="w-full h-full object-cover opacity-60 group-hover:opacity-100" muted />
                        <play theme="filled" class="absolute opacity-50 group-hover:opacity-100" />
                    </div>
                    <div class="flex gap-2">
                        <button @click="studioStore.draftMoment(moment.id)" 
                            class="flex-1 py-1 text-[8px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-md border border-white/5">
                            {{ $t('studio.interactions.draftPost') }}
                        </button>
                        <button @click="studioStore.publishMoment(moment.id)"
                            class="flex-1 py-1 text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md border border-blue-500/10">
                            {{ $t('studio.interactions.shareNow') }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-else class="empty-moments flex flex-col items-center justify-center py-12 opacity-20 gap-4 text-center">
                <magic theme="outline" size="32" />
                <p class="text-[9px] uppercase font-black tracking-[0.1em]">{{ $t('studio.interactions.noViralMoments') }}</p>
            </div>
        </div>

        <div v-else class="stats-flow p-6 animate-in">
            <!-- Stats content -->
            <div class="stat-item flex justify-between items-end mb-6">
                <div class="flex flex-col">
                    <span class="opacity-30 text-[9px] uppercase font-black tracking-widest mb-1">{{ $t('studio.interactions.liveAudience') }}</span>
                    <span class="text-3xl font-black tracking-tighter">{{ viewers || 0 }}</span>
                </div>
                <div class="flex flex-col items-end">
                    <span class="opacity-30 text-[9px] uppercase font-black tracking-widest mb-1 text-right">{{ $t('studio.interactions.peak') }}</span>
                    <span class="text-xs font-mono opacity-60">{{ engagement?.peakViewers || viewers || 0 }}</span>
                </div>
            </div>

            <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-black opacity-30 uppercase">{{ $t('studio.interactions.uplinkStability') }}</span>
                        <div class="flex items-center gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full"
                                :class="health?.status === 'good' ? 'bg-green-400' : 'bg-yellow-400'"></div>
                            <span class="text-[9px] font-black uppercase"
                                :class="health?.status === 'good' ? 'text-green-400' : (health?.status === 'poor' ? 'text-red-400' : 'text-yellow-400')">{{
                                    health?.status || '...' }}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-black opacity-30 uppercase">{{ $t('studio.interactions.bitrate') }}</span>
                        <div class="flex items-center gap-2">
                           <span v-if="effectiveQuality" class="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-black">{{ effectiveQuality }}</span>
                           <span class="text-xs font-mono">{{ Math.round(health?.bitrate || 0) }} kbps</span>
                        </div>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[9px] font-black opacity-30 uppercase">{{ $t('studio.interactions.latency') }}</span>
                        <span class="text-xs font-mono">{{ health?.rtt ? Math.round(health.rtt) + 'ms' : '--' }}</span>
                    </div>
                    <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500/40" :style="{ width: Math.min((health?.rtt || 0) / 5, 100) + '%' }"></div>
                    </div>
                </div>
            </div>

            <div class="mt-8">
                <h5 class="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">{{ $t('studio.interactions.engagementIndex') }}</h5>
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                        <p class="text-lg font-black text-blue-400">{{ (engagement?.likes || 0) > 1000 ?
                            (engagement.likes / 1000).toFixed(1) + 'k' : engagement?.likes || 0 }}</p>
                        <p class="text-[8px] opacity-30 uppercase font-black">{{ $t('studio.interactions.likes') }}</p>
                    </div>
                    <div class="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                        <p class="text-lg font-black text-purple-400">{{ (engagement?.shares || 0) > 1000 ?
                            (engagement.shares / 1000).toFixed(1) + 'k' : engagement?.shares || 0 }}</p>
                        <p class="text-[8px] opacity-30 uppercase font-black">{{ $t('studio.interactions.shares') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="interaction-buttons flex-col gap-3" v-if="localActiveTab === 'chat'">
            <div class="chat-input-wrapper relative">
                <input 
                    v-model="chatInput" 
                    type="text" 
                    :placeholder="$t('studio.interactions.sendMessagePlaceholder')" 
                    class="chat-input"
                    @keyup.enter="handleSendChat"
                />
                <button class="send-btn" @click="handleSendChat" :disabled="!chatInput.trim()">
                    <send theme="filled" size="14" />
                </button>
            </div>
            <div class="flex gap-2">
                <button class="interact-btn like" @click="trackEngagement('like')">
                    <like theme="filled" />
                </button>
                <button class="interact-btn dislike" @click="trackEngagement('dislike')">
                    <dislike theme="filled" />
                </button>
            </div>
            
            <!-- Dev/Simulate Tools -->
            <div v-if="!isGuest && activeVTuber" class="mt-2 pt-2 border-t border-white/5">
                <p class="text-[9px] uppercase opacity-40 font-black mb-2">{{ $t('studio.interactions.simulateInteraction') }}</p>
                <div class="grid grid-cols-3 gap-2">
                    <button @click="simulateGift('Rocket', 500)" class="gift-btn">
                        🚀 Rocket
                    </button>
                    <button @click="simulateGift('Heart', 100)" class="gift-btn">
                        ❤️ Heart
                    </button>
                    <button @click="simulatePoll" class="gift-btn">
                        📊 Poll
                    </button>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { ref, watch, onUpdated, computed } from 'vue';
import {
    Youtube, Facebook, Tiktok,
    Like, Dislike, Broadcast, Send, Magic, Play
} from '@icon-park/vue-next';
import AnimatedEmoji from '@/components/studio/AnimatedEmoji.vue';
import LayoutSettings from '@/components/studio/drawers/LayoutSettings.vue';
import GuestSettings from '@/components/studio/drawers/GuestSettings.vue';
import { useProjectStore } from '@/stores/project';
import { useVTuberStore } from '@/stores/vtuber';
import { storeToRefs } from 'pinia';
import { useStudioStore } from '@/stores/studio';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const studioStore = useStudioStore();

const projectStore = useProjectStore();
const vtuberStore = useVTuberStore();
const { currentVTuber } = storeToRefs(vtuberStore);
const { health, engagement, viewerCount: viewers } = storeToRefs(studioStore);

const props = defineProps<{
    messages: any[];
    guestPersonas: any[];
    remoteGuests: any[];
    inviteGuest: () => void;
    summonGuest: (persona: any) => void;
    toggleGuest: (guestId: string, isVisible: boolean) => void;
    toggleMute: (guestId: string, muted: boolean) => void;
    toggleCamera: (guestId: string, camOn: boolean) => void;
    removeGuest: (guestId: string) => void;
    assignSlot: (guestId: string, slot: number) => void;
    addMobileCam: (guestId: string) => void;
    isGuest: boolean;
    guestVideoElements: Map<string, HTMLVideoElement>;
    // viewers?: number;
    // health?: any;
    // engagement?: any;
    effectiveQuality?: string;
}>();

watch([health, engagement, viewers], (values) => {
    console.log('Interactions:', values);
});

const parseEmojis = (text: string) => {
    // Regex for basic emojis
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
        // Text before emoji
        if (match.index > lastIndex) {
            parts.push({ text: text.substring(lastIndex, match.index), isEmoji: false });
        }
        // The emoji itself
        parts.push({ text: match[0], isEmoji: true });
        lastIndex = emojiRegex.lastIndex;
    }

    // Remaining text
    if (lastIndex < text.length) {
        parts.push({ text: text.substring(lastIndex), isEmoji: false });
    }

    return parts.length > 0 ? parts : [{ text, isEmoji: false }];
};

const emit = defineEmits(['spawn-like', 'spawn-dislike', 'send-chat']);
const localActiveTab = ref('layout');
if (props.isGuest) {
    localActiveTab.value = 'chat';
}
const chatFlow = ref<HTMLElement | null>(null);
const chatInput = ref('');
const isProcessingReply = ref(false);

const activeVTuber = computed(() => currentVTuber.value);
const activeVTuberName = computed(() => currentVTuber.value?.identity?.name || 'VTuber');

const handleVTuberReply = async (msg: any) => {
    if (!activeVTuber.value || isProcessingReply.value) return;
    
    isProcessingReply.value = true;
    try {
        const result = await vtuberStore.reactToChat(
            activeVTuber.value.entityId, 
            msg.user, 
            msg.text
        );
        
        // Optimistically update UI
        msg.vtuberResponse = result.text;
        toast.success(`${t('studio.interactions.toast.repliedAs')} ${activeVTuberName.value}`);
    } catch (e) {
        toast.error(t('studio.interactions.toast.replyFailed'));
    } finally {
        isProcessingReply.value = false;
    }
};

const simulateGift = async (giftName: string, amount: number) => {
    if (!activeVTuber.value) return;
    try {
        await vtuberStore.reactToGift(
            activeVTuber.value.entityId,
            'Simulated User',
            giftName,
            amount
        );
    } catch (e) {
        toast.error(t('studio.interactions.toast.giftFailed'));
    }
};

const simulatePoll = async () => {
    if (!activeVTuber.value) return;
    try {
        await vtuberStore.reactToPoll(
            activeVTuber.value.entityId,
            'Best Pizza Topping?',
            'Pineapple 🍍'
        );
        toast.success(t('studio.interactions.toast.pollTriggered'));
    } catch (e) {
        toast.error(t('studio.interactions.toast.pollFailed'));
    }
};

const handleSendChat = () => {
    if (!chatInput.value.trim()) return;
    emit('send-chat', chatInput.value);
    chatInput.value = '';
};

const trackEngagement = async (type: 'like' | 'dislike') => {
    try {
        const projectId = window.location.pathname.split('/').pop();
        if (projectId && projectId.length === 24) {
            await projectStore.trackEngagement(projectId, type);
            if (type === 'like') emit('spawn-like');
            else emit('spawn-dislike');
        }
    } catch (error) {
        console.error('[Interactions] Failed to track engagement:', error);
    }
};

// Auto-scroll chat to bottom
onUpdated(() => {
    if (chatFlow.value) {
        chatFlow.value.scrollTop = chatFlow.value.scrollHeight;
    }
});
</script>

<style scoped lang="scss">
.interaction-panel {
    width: 320px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 12px;

    .section-tabs {
        display: flex;
        padding: 4px;
        gap: 4px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;

        .tab-btn {
            flex: 1;
            height: 32px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            background: transparent;

            &:hover {
                color: rgba(255, 255, 255, 0.6);
                background: rgba(255, 255, 255, 0.02);
            }

            &.active {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
        }
    }

    .chat-flow {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        .chat-message {
            font-size: 13px;
            line-height: 1.6;
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 1rem;
            transition: all 0.3s;

            &:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.06);
            }

            .user {
                font-weight: 900;
                color: #3b82f6;
                margin-right: 6px;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.05em;
            }

            .text {
                color: rgba(255, 255, 255, 0.85);
            }

            &.is-social {
                background: rgba(59, 130, 246, 0.08);
                border-left: 3px solid #3b82f6;
                border-radius: 1rem;
            }
        }
    }

    .interaction-buttons {
        padding: 4px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .chat-input-wrapper {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
            padding: 4px 4px 4px 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:focus-within {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(59, 130, 246, 0.4);
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
            }

            .chat-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #fff;
                font-size: 14px;
                height: 40px;
                outline: none;

                &::placeholder {
                    color: rgba(255, 255, 255, 0.2);
                    font-size: 13px;
                }
            }

            .send-btn {
                width: 36px;
                height: 36px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #3b82f6;
                color: #fff;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

                &:disabled {
                    opacity: 0.2;
                    cursor: not-allowed;
                    background: rgba(255, 255, 255, 0.05);
                }

                &:not(:disabled):hover {
                    transform: scale(1.05) rotate(5deg);
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                }
            }
        }

        .interact-btn {
            flex: 1;
            height: 44px;
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &.like {
                background: rgba(255, 77, 79, 0.08);
                border-color: rgba(255, 77, 79, 0.1);
                color: #ff4d4f;

                &:hover {
                    background: rgba(255, 77, 79, 0.15);
                    border-color: rgba(255, 77, 79, 0.3);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(255, 77, 79, 0.2);
                }
            }

            &.dislike {
                background: rgba(255, 255, 255, 0.03);
                border-color: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.4);

                &:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: rgba(255, 255, 255, 0.7);
                    transform: translateY(-2px);
                }
            }
        }
        
        .gift-btn {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            height: 32px;
            font-size: 10px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            
            &:hover {
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
                border-color: rgba(255, 255, 255, 0.1);
                transform: translateY(-1px);
            }
        }
    }
}
</style>
