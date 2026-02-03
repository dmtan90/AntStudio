<template>
    <footer class="studio-controls glass-dark">
        <div class="media-controls">
            <button class="ctrl-btn" :class="{ active: micOn }" @click="$emit('toggle-mic')">
                <microphone v-if="micOn" theme="filled" />
                <microphone v-else theme="outline" class="opacity-30" />
            </button>
            <button class="ctrl-btn" :class="{ active: camOn }" @click="$emit('toggle-cam')">
                <camera v-if="camOn" theme="filled" />
                <camera-five v-else theme="outline" />
            </button>
            <button v-if="!isGuest" class="ctrl-btn" :class="{ active: isScreenSharing }"
                @click="$emit('toggle-screen')">
                <share-two theme="outline" />
            </button>
        </div>

        <div class="action-zone">
            <template v-if="!isGuest">
                <div class="control-group flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <button class="status-indicator live" :class="{ active: isLive }" @click="$emit('toggle-live')">
                        <broadcast theme="filled" size="14" class="mr-2" />
                        {{ isLive ? 'LIVE' : 'GO LIVE' }}
                    </button>
                    <button v-if="isLive" class="status-indicator highlight" @click="$emit('capture-highlight')">
                        <magic theme="filled" size="14" class="mr-2" />
                        HIGHLIGHT
                    </button>
                    <button class="status-indicator rec" :class="{ active: isRecording }"
                        @click="$emit('toggle-record')">
                        <div class="rec-dot mr-2"></div>
                        {{ isRecording ? 'RECORDING' : 'REC' }}
                    </button>
                </div>
            </template>
            <template v-else>
                <div class="flex items-center gap-3 px-6 py-2 bg-green-500/10 rounded-2xl border border-green-500/20">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-[10px] font-black uppercase text-green-500 tracking-widest">On Air</span>
                </div>
            </template>
        </div>

        <div class="config-controls">
            <template v-if="!isGuest">
                <button class="ctrl-btn" title="Invite Guest" @click="$emit('invite-guest')">
                    <user theme="outline" />
                    <div v-if="guestCount" class="platform-count">{{ guestCount }}</div>
                </button>
                <button class="ctrl-btn" @click="$emit('show-platforms')">
                    <Broadcast theme="outline" />
                    <div v-if="platformCount" class="platform-count">{{ platformCount }}</div>
                </button>
                <SettingsPopover v-model:stream-quality="localStreamQuality">
                    <template #trigger>
                        <button class="ctrl-btn">
                            <setting-two theme="outline" />
                        </button>
                    </template>
                </SettingsPopover>
            </template>
            <template v-else>
                <SettingsPopover v-model:stream-quality="localStreamQuality">
                    <template #trigger>
                        <button class="ctrl-btn">
                            <setting-two theme="outline" />
                        </button>
                    </template>
                </SettingsPopover>
                <button class="ctrl-btn border-red-500/30 text-red-500 hover:bg-red-500/10" @click="$emit('exit')">
                    <close theme="outline" />
                </button>
            </template>
        </div>
    </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
    Microphone, Camera, CameraFive, Broadcast,
    User, ShareTwo, SettingTwo, Magic, Close
} from '@icon-park/vue-next';
import SettingsPopover from '@/components/studio/popovers/SettingsPopover.vue';

const props = defineProps<{
    micOn: boolean;
    camOn: boolean;
    isLive: boolean;
    isRecording: boolean;
    platformCount: number;
    guestCount: number;
    isGuest?: boolean;
    isScreenSharing?: boolean;
    streamQuality?: string;
}>();

const emit = defineEmits([
    'toggle-mic', 'toggle-cam', 'toggle-screen', 'toggle-live', 'toggle-record', 'capture-highlight',
    'invite-guest', 'show-platforms', 'show-settings', 'exit', 'update:streamQuality'
]);

const localStreamQuality = computed({
    get: () => props.streamQuality || 'high',
    set: (val) => emit('update:streamQuality', val)
});
</script>

<style scoped lang="scss">
.studio-controls {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .media-controls,
    .config-controls {
        display: flex;
        gap: 12px;
    }

    .ctrl-btn {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        position: relative;

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }

        &.active {
            background: rgba(59, 130, 246, 0.1);
            border-color: #3b82f6;
            color: #3b82f6;
        }

        .platform-count {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #3b82f6;
            color: #fff;
            font-size: 8px;
            font-weight: 900;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    .status-indicator {
        height: 40px;
        padding: 0 20px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s;
        border: none;

        &.live {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            &.active {
                background: #ff4d4f;
                color: #fff;
                box-shadow: 0 0 20px rgba(255, 77, 79, 0.4);
            }
        }

        &.rec {
            background: rgba(255, 255, 255, 0.03);
            color: #fff;

            &:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            &.active {
                background: rgba(255, 77, 79, 0.1);
                color: #ff4d4f;

                .rec-dot {
                    background: #ff4d4f;
                    animation: pulse 1s infinite;
                }
            }
        }

        &.highlight {
            background: rgba(168, 85, 247, 0.1);
            color: #a855f7;
            border: 1px solid rgba(168, 85, 247, 0.1);

            &:hover {
                background: rgba(168, 85, 247, 0.2);
            }
        }

        .rec-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #666;
        }
    }
}
</style>
