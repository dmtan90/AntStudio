<template>
    <aside class="interaction-panel glass-dark">
        <div class="section-tabs">
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'layout' }"
                @click="localActiveTab = 'layout'">Layout</button>
            <button v-if="!isGuest" class="tab-btn" :class="{ active: localActiveTab === 'scene' }"
                @click="localActiveTab = 'scene'">Guests</button>
            <button class="tab-btn" :class="{ active: localActiveTab === 'chat' }"
                @click="localActiveTab = 'chat'">Chat</button>
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
                <div v-for="msg in messages" :key="msg.id" class="chat-message animate-in"
                    :class="{ 'is-social': msg.isSocial }">
                    <div class="msg-header flex items-center gap-2">
                        <youtube v-if="msg.user.includes('YouTube')" size="12" class="text-red-500" />
                        <facebook v-else-if="msg.user.includes('FB')" size="12" class="text-blue-500" />
                        <tiktok v-else-if="msg.user.includes('TikTok')" size="12" class="text-pink-500" />
                        <span class="user">{{ msg.user }}:</span>
                    </div>
                    <span class="text">{{ msg.text }}</span>
                </div>
            </template>
            <div v-else class="empty-chat flex flex-col items-center justify-center h-full opacity-20 gap-4">
                <broadcast theme="outline" size="48" />
                <p class="text-[10px] uppercase font-black tracking-[0.2em] text-center">Waiting for engagement...</p>
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

        <div class="interaction-buttons" v-if="localActiveTab === 'chat'">
            <button class="interact-btn like" @click="trackEngagement('like')">
                <like theme="filled" />
            </button>
            <button class="interact-btn dislike" @click="trackEngagement('dislike')">
                <dislike theme="filled" />
            </button>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { ref, watch, onUpdated } from 'vue';
import {
    Youtube, Facebook, Tiktok,
    Like, Dislike, Broadcast
} from '@icon-park/vue-next';
import LayoutSettings from '@/components/studio/drawers/LayoutSettings.vue';
import GuestSettings from '@/components/studio/drawers/GuestSettings.vue';

import api from '@/utils/api';

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

const emit = defineEmits(['spawn-like', 'spawn-dislike']);
const localActiveTab = ref('layout');
if (props.isGuest) {
    localActiveTab.value = 'chat';
}
const chatFlow = ref<HTMLElement | null>(null);

const trackEngagement = async (type: 'like' | 'dislike') => {
    try {
        const projectId = window.location.pathname.split('/').pop();
        if (projectId && projectId.length === 24) {
            await api.post(`/projects/${projectId}/track`, { type });
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
        padding: 16px;
        display: flex;
        gap: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.03);

        .interact-btn {
            flex: 1;
            height: 48px;
            border-radius: 16px;
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
    }
}
</style>
