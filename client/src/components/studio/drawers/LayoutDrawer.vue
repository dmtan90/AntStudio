<template>
    <Teleport to="body">
        <Transition name="drawer">
            <div v-if="modelValue" class="drawer-overlay" @click="$emit('update:modelValue', false)">
                <aside class="scene-drawer glass-dark" @click.stop>
                    <!-- Header -->
                    <div class="drawer-header">
                        <div class="flex items-center gap-3">
                            <video-two theme="filled" size="24" class="text-blue-400" />
                            <div>
                                <h2 class="text-lg font-black text-white">{{ $t('studio.drawers.layout.sceneManager') }}</h2>
                                <p class="text-xs text-white/40">{{ $t('studio.drawers.layout.sceneManagerDesc') }}</p>
                            </div>
                        </div>
                        <button @click="$emit('update:modelValue', false)" class="close-btn">
                            <close-one theme="outline" size="20" />
                        </button>
                    </div>

                    <!-- Active Scene Info -->
                    <div class="active-scene-banner">
                        <div class="flex items-center gap-3">
                            <div class="scene-icon-large">
                                <component :is="getIcon(studioStore.activeScene.icon)" theme="filled" size="32" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-black text-white">{{ studioStore.activeScene.name
                                        }}</span>
                                    <div class="live-badge">{{ $t('studio.common.active') }}</div>
                                </div>
                                <p class="text-xs text-white/50 mt-1">{{ studioStore.activeScene.description }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Scene Grid -->
                    <div class="drawer-content">
                        <div class="section-title">{{ $t('studio.drawers.layout.availableScenes') }}</div>
                        <div class="scene-grid">
                            <div v-for="scene in studioStore.scenes" :key="scene.id" class="scene-card"
                                :class="{ active: scene.id === studioStore.activeScene.id }"
                                @click="switchToScene(scene.id)">
                                <div class="scene-preview">
                                    <component :is="getIcon(scene.icon)" theme="outline" size="40" />
                                    <div v-if="scene.hotkey" class="hotkey-badge">{{ scene.hotkey }}</div>
                                </div>
                                <div class="scene-info">
                                    <h3 class="scene-name">{{ scene.name }}</h3>
                                    <p class="scene-desc">{{ scene.description }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Transition Settings -->
                        <div class="section-title mt-6">{{ $t('studio.drawers.layout.transitionStyle') }}</div>
                        <div class="transition-selector">
                            <button v-for="transition in transitions" :key="transition.value" class="transition-btn"
                                :class="{ active: studioStore.transitionType === transition.value }"
                                @click="studioStore.transitionType = transition.value">
                                <component :is="transition.icon" theme="outline" size="20" />
                                <span>{{ $t(`studio.drawers.layout.transitions.${transition.value}`) }}</span>
                            </button>
                        </div>

                        <!-- Custom Scene Builder (Future) -->
                        <div class="section-title mt-6">{{ $t('studio.drawers.layout.customScenes') }}</div>
                        <button class="create-scene-btn">
                            <plus theme="outline" size="20" />
                            <span>{{ $t('studio.drawers.layout.createCustomScene') }}</span>
                        </button>
                    </div>
                </aside>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { useStudioStore } from '@/stores/studio';
import { VideoTwo, CloseOne, Plus } from '@icon-park/vue-next';
import * as Icons from '@icon-park/vue-next';
import type { TransitionType } from '@/stores/studio';

defineProps<{
    modelValue: boolean;
}>();

defineEmits(['update:modelValue']);

const studioStore = useStudioStore();

const transitions: { value: TransitionType; label: string; icon: any }[] = [
    { value: 'instant', label: 'Instant', icon: Icons.Lightning },
    { value: 'fade', label: 'Fade', icon: Icons.Sun },
    { value: 'slide', label: 'Slide', icon: Icons.Right },
    { value: 'zoom', label: 'Zoom', icon: Icons.ZoomIn },
    { value: 'wipe', label: 'Wipe', icon: Icons.Erase }
];

function getIcon(iconName: string) {
    return Icons[iconName as keyof typeof Icons] || Icons.User;
}

async function switchToScene(sceneId: string) {
    await studioStore.switchScene(sceneId);
}
</script>

<style scoped lang="scss">
.drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.scene-drawer {
    width: 600px;
    max-width: 90vw;
    max-height: 85vh;
    background: rgba(10, 10, 10, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.drawer-header {
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.close-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.active-scene-banner {
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.scene-icon-large {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgba(59, 130, 246, 0.2);
    border: 2px solid rgba(59, 130, 246, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #60a5fa;
}

.live-badge {
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #4ade80;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.5px;
}

.drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.section-title {
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;
}

.scene-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.scene-card {
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
        opacity: 0;
        transition: opacity 0.2s;
    }

    &:hover {
        border-color: rgba(59, 130, 246, 0.3);
        transform: translateY(-2px);

        &::before {
            opacity: 1;
        }
    }

    &.active {
        border-color: rgba(59, 130, 246, 0.5);
        background: rgba(59, 130, 246, 0.1);

        &::before {
            opacity: 1;
        }

        .scene-preview {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.4);
            color: #60a5fa;
        }
    }
}

.scene-preview {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 12px;
    position: relative;
    transition: all 0.2s;
}

.hotkey-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 900;
    color: white;
}

.scene-info {
    position: relative;
    z-index: 1;
}

.scene-name {
    font-size: 13px;
    font-weight: 900;
    color: white;
    margin-bottom: 4px;
}

.scene-desc {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
}

.transition-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.transition-btn {
    flex: 1;
    min-width: 100px;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    font-weight: 700;

    &:hover {
        border-color: rgba(59, 130, 246, 0.3);
        color: white;
    }

    &.active {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.4);
        color: #60a5fa;
    }
}

.create-scene-btn {
    width: 100%;
    padding: 16px;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
    font-weight: 700;

    &:hover {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.5);
    }
}

// Transition Animation
.drawer-enter-active,
.drawer-leave-active {
    transition: all 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
    opacity: 0;

    .scene-drawer {
        transform: scale(0.95) translateY(20px);
    }
}
</style>
