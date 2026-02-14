<template>
    <aside class="interaction-panel glass-dark">
        <div class="section-tabs">
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'layout' }"
                @click="localActiveTab = 'layout'">Layout</button>
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'scene' }"
                @click="localActiveTab = 'scene'">Guests</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'chat' }"
                @click="localActiveTab = 'chat'">Chat</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'moments' }"
                @click="localActiveTab = 'moments'">Moments</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'stats' }"
                @click="localActiveTab = 'stats'">Stats</button>
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
                            Reply as {{ activeVTuberName }}
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
                <p class="text-[10px] uppercase font-black tracking-[0.2em] text-center">Waiting for engagement...</p>
            </div>
        </div>

        <div v-else-if="localActiveTab === 'moments'" class="moments-flow p-4 animate-in">
            <h4 class="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Viral Peaks</h4>
            <div v-if="studioStore.viralMoments.length > 0" class="flex flex-col gap-3">
                <div v-for="moment in studioStore.viralMoments" :key="moment.id" 
                    class="moment-card glass-light p-3 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-blue-400">{{ moment.reason }}</span>
                        <span class="text-[8px] opacity-40">{{ new Date(moment.timestamp).toLocaleTimeString() }}</span>
                    </div>
                    <div class="aspect-video bg-black/40 rounded-lg mb-2 flex items-center justify-center group-hover:bg-black/60 transition-colors cursor-pointer relative overflow-hidden">
                        <video v-if="moment.s3Url" :src="moment.s3Url" class="w-full h-full object-cover opacity-60 group-hover:opacity-100" muted />
                        <play theme="filled" class="absolute opacity-50 group-hover:opacity-100" />
                    </div>
                    <div class="flex gap-2">
                        <button @click="studioStore.draftMoment(moment.id)" 
                            class="flex-1 py-1 text-[8px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-md border border-white/5">
                            Draft Post
                        </button>
                        <button @click="studioStore.publishMoment(moment.id)"
                            class="flex-1 py-1 text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md border border-blue-500/10">
                            Share Now
                        </button>
                    </div>
                </div>
            </div>
            <div v-else class="empty-moments flex flex-col items-center justify-center py-12 opacity-20 gap-4 text-center">
                <magic theme="outline" size="32" />
                <p class="text-[9px] uppercase font-black tracking-[0.1em]">No viral moments<br/>captured yet</p>
            </div>
        </div>

        <div v-else class="stats-flow p-6 animate-in">
            <!-- Stats content -->
            <div class="stat-item flex justify-between items-end mb-6">
                <div class="flex flex-col">
                    <span class="opacity-30 text-[9px] uppercase font-black tracking-widest mb-1">Live Audience</span>
                    <span class="text-3xl font-black tracking-tighter">{{ viewers || 0 }}</span>
                </div>
                <div class="flex flex-col items-end">
                    <span class="opacity-30 text-[9px] uppercase font-black tracking-widest mb-1 text-right">Peak</span>
                    <span class="text-xs font-mono opacity-60">{{ (viewers || 0) + 124 }}</span>
                </div>
            </div>

            <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-black opacity-30 uppercase">Uplink Stability</span>
                        <div class="flex items-center gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full"
                                :class="health?.status === 'good' ? 'bg-green-400' : 'bg-yellow-400'"></div>
                            <span class="text-[9px] font-black uppercase"
                                :class="health?.status === 'good' ? 'text-green-400' : 'text-yellow-400'">{{
                                    health?.status || 'OPTIMIZING' }}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-black opacity-30 uppercase">Bitrate</span>
                        <span class="text-xs font-mono">{{ Math.round(health?.bitrate || 0) }} kbps</span>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[9px] font-black opacity-30 uppercase">Latency (RTT)</span>
                        <span class="text-xs font-mono">{{ Math.round(health?.rtt || 24) }}ms</span>
                    </div>
                    <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500/40" :style="{ width: '15%' }"></div>
                    </div>
                </div>
            </div>

            <div class="mt-8">
                <h5 class="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Engagement Index</h5>
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                        <p class="text-lg font-black text-blue-400">{{ (engagement?.likes || 0) > 1000 ?
                            (engagement.likes / 1000).toFixed(1) + 'k' : engagement?.likes || 0 }}</p>
                        <p class="text-[8px] opacity-30 uppercase font-black">Likes</p>
                    </div>
                    <div class="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                        <p class="text-lg font-black text-purple-400">{{ (engagement?.shares || 0) > 1000 ?
                            (engagement.shares / 1000).toFixed(1) + 'k' : engagement?.shares || 0 }}</p>
                        <p class="text-[8px] opacity-30 uppercase font-black">Shares</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="interaction-buttons flex-col gap-3" v-if="localActiveTab === 'chat'">
            <div class="chat-input-wrapper relative">
                <input 
                    v-model="chatInput" 
                    type="text" 
                    placeholder="Send a message..." 
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
                <p class="text-[9px] uppercase opacity-40 font-black mb-2">Simulate Interaction</p>
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

const studioStore = useStudioStore();

const projectStore = useProjectStore();
const vtuberStore = useVTuberStore();
const { currentVTuber } = storeToRefs(vtuberStore);

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
    viewers?: number;
    health?: any;
    engagement?: any;
}>();

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
        toast.success(`Replied as ${activeVTuberName.value}`);
    } catch (e) {
        toast.error('Failed to generate reply');
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
        toast.error('Gift reaction failed');
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
        toast.success('Triggered Poll Reaction');
    } catch (e) {
        toast.error('Poll reaction failed');
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
    border-left: 1px solid rgba(255, 255, 255, 0.05);

    .section-tabs {
        display: flex;
        padding: 12px;
        gap: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);

        .tab-btn {
            flex: 1;
            height: 32px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            background: transparent;

            &:hover {
                color: rgba(255, 255, 255, 0.6);
            }

            &.active {
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
            }
        }
    }

    .chat-flow {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        .chat-message {
            font-size: 12px;
            line-height: 1.5;

            .user {
                font-weight: 800;
                color: #3b82f6;
                margin-right: 4px;
            }

            .text {
                opacity: 0.8;
            }

            &.is-social {
                padding: 8px 12px;
                background: rgba(59, 130, 246, 0.05);
                border-radius: 12px;
                border-left: 2px solid #3b82f6;
            }
        }
    }

    .interaction-buttons {
        padding: 12px 16px 16px;
        display: flex;
        flex-direction: column;
        border-top: 1px solid rgba(255, 255, 255, 0.03);

        .chat-input-wrapper {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 2px 2px 2px 14px;
            transition: all 0.2s;

            &:focus-within {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .chat-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #fff;
                font-size: 13px;
                height: 36px;
                outline: none;

                &::placeholder {
                    color: rgba(255, 255, 255, 0.2);
                }
            }

            .send-btn {
                width: 32px;
                height: 32px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #3b82f6;
                color: #fff;
                border: none;
                cursor: pointer;
                transition: all 0.2s;

                &:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                    background: rgba(255, 255, 255, 0.05);
                }

                &:not(:disabled):hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
            }
        }

        .interact-btn {
            flex: 1;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: none;
            transition: all 0.2s;

            &.like {
                background: rgba(255, 77, 79, 0.1);
                color: #ff4d4f;

                &:hover {
                    background: rgba(255, 77, 79, 0.2);
                    transform: scale(1.05);
                }
            }

            &.dislike {
                background: rgba(255, 255, 255, 0.05);
                color: #666;

                &:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.05);
                }
            }
        }
        
        .gift-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            height: 28px;
            font-size: 10px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            transition: all 0.2s;
            
            &:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border-color: rgba(255, 255, 255, 0.2);
            }
        }
    }
}
</style>
