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
            <button v-if="!isGuest && showEmbedButton" class="ctrl-btn" :class="{ active: hasEmbedUrl }"
                @click="promptEmbed">
                <movie theme="outline" />
            </button>
        </div>

        <div class="action-zone">
            <template v-if="!isGuest">
                <div class="control-group flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <button class="status-indicator live" :class="{ active: isLive }" @click="$emit('toggle-live')"
                        data-guide="go-live">
                        <broadcast theme="filled" size="14" class="mr-2" />
                        {{ isLive ? $t('studio.stageControls.live') : $t('studio.stageControls.goLive') }}
                    </button>
                    <button v-if="isLive" class="status-indicator highlight" @click="$emit('capture-highlight')">
                        <magic theme="filled" size="14" class="mr-2" />
                        {{ $t('studio.stageControls.highlight') }}
                    </button>
                    <button class="status-indicator rec" :class="{ active: isRecording }"
                        @click="$emit('toggle-record')">
                        <div class="rec-dot mr-2"></div>
                        {{ isRecording ? $t('studio.stageControls.recording') : $t('studio.stageControls.rec') }}
                    </button>
                </div>
            </template>
            <template v-else>
                <div class="flex items-center gap-3 px-6 py-2 bg-green-500/10 rounded-2xl border border-green-500/20">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-[10px] font-black uppercase text-green-500 tracking-widest">{{ $t('studio.stageControls.onAir') }}</span>
                </div>
            </template>
        </div>

        <div class="config-controls">
            <template v-if="!isGuest">
                <button class="ctrl-btn" :title="$t('studio.stageControls.inviteGuest')" @click="$emit('invite-guest')">
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
    User, ShareTwo, SettingTwo, Magic, Close, Movie
} from '@icon-park/vue-next';
import SettingsPopover from '@/components/studio/popovers/SettingsPopover.vue';
import { useStudioStore } from '@/stores/studio';
import { ElMessageBox } from 'element-plus';
import { toast } from 'vue-sonner';

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

const studioStore = useStudioStore();

const localStreamQuality = computed({
    get: () => props.streamQuality || 'high',
    set: (val) => emit('update:streamQuality', val)
});

const showEmbedButton = computed(() => {
    return ['game_streaming', 'sport', 'commentary'].includes(studioStore.streamingContext as string);
});

const hasEmbedUrl = computed(() => !!studioStore.embeddedVideoUrl);

const promptEmbed = async () => {
    try {
        const { value } = await ElMessageBox.prompt('Enter YouTube or Twitch URL', 'Embed Video', {
            confirmButtonText: 'Embed',
            cancelButtonText: 'Clear',
            inputPlaceholder: 'https://www.youtube.com/watch?v=...',
            inputValue: studioStore.embeddedVideoUrl || '',
            roundButton: true,
            distinguishCancelAndClose: true
        });
        
        studioStore.embeddedVideoUrl = value;
        toast.success('Video embedded successfully!');
    } catch (action) {
        if (action === 'cancel') {
            studioStore.embeddedVideoUrl = null;
            toast.info('Embed cleared');
        }
    }
};
</script>

<style scoped lang="scss">
.studio-controls {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    background: rgba(10, 10, 15, 0.6);
    backdrop-filter: blur(40px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);

    .media-controls,
    .config-controls {
        display: flex;
        gap: 16px;
    }

    .ctrl-btn {
        width: 48px;
        height: 48px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            color: #fff;
            transform: translateY(-2px);
        }

        &.active {
            background: rgba(59, 130, 246, 0.15);
            border-color: rgba(59, 130, 246, 0.5);
            color: #3b82f6;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }

        .platform-count {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #3b82f6;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #0a0a0f;
        }
    }

    .status-indicator {
        height: 44px;
        padding: 0 24px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid transparent;

        &.live {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.1);

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                transform: scale(1.02);
            }

            &.active {
                background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                color: #fff;
                border: none;
                box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
            }
        }

        &.rec {
            background: rgba(255, 255, 255, 0.03);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.05);

            &:hover {
                background: rgba(255, 255, 255, 0.08);
                transform: scale(1.02);
            }

            &.active {
                background: rgba(255, 77, 79, 0.1);
                border-color: rgba(255, 77, 79, 0.3);
                color: #ff4d4f;

                .rec-dot {
                    background: #ff4d4f;
                    box-shadow: 0 0 10px #ff4d4f;
                    animation: pulse 1s infinite;
                }
            }
        }

        &.highlight {
            background: rgba(168, 85, 247, 0.08);
            color: #a855f7;
            border: 1px solid rgba(168, 85, 247, 0.2);

            &:hover {
                background: rgba(168, 85, 247, 0.15);
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
            }
        }

        .rec-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
        }
    }
}
</style>
