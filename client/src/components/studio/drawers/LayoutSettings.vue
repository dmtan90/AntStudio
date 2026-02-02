<template>
    <div class="layout-settings flex flex-col gap-8 animate-in">
        <!-- Layout Selection -->
        <section>
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
                            <div class="live-badge">ACTIVE</div>
                        </div>
                        <p class="text-xs text-white/50 mt-1">{{ studioStore.activeScene.description }}</p>
                    </div>
                </div>
            </div>

            <!-- Scene Grid -->
            <div class="drawer-content">
                <div class="section-title">Available Layouts</div>
                <div class="scene-grid">
                    <div v-for="scene in studioStore.scenes" :key="scene.id" class="scene-card"
                        :class="{ active: scene.id === studioStore.activeScene.id }" @click="switchToScene(scene.id)">
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
                <div class="section-title mt-6">Transition Style</div>
                <div class="transition-selector">
                    <button v-for="transition in transitions" :key="transition.value" class="transition-btn"
                        :class="{ active: studioStore.transitionType === transition.value }"
                        @click="studioStore.transitionType = transition.value">
                        <component :is="transition.icon" theme="outline" size="20" />
                        <span>{{ transition.label }}</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- Dynamic Settings (e.g. PiP) -->
        <section v-if="studioStore.activeScene.type === 'pip'" class="dynamic-settings-section animate-in">
            <div class="drawer-content pt-0">
                <div class="section-title">PiP Frame Settings</div>

                <!-- Shape Selection -->
                <div class="setting-group mb-6">
                    <label class="setting-label">Frame Shape</label>
                    <div class="shape-grid">
                        <button v-for="shape in shapes" :key="shape.id" class="shape-btn"
                            :class="{ active: (overlayRegion?.shape || 'rect') === shape.id }"
                            @click="updateOverlayProperty('shape', shape.id)">
                            <component :is="shape.icon" theme="outline" size="18" />
                            <span>{{ shape.name }}</span>
                        </button>
                    </div>
                </div>

                <!-- Corner Radius (for Rect/Square) -->
                <div v-if="overlayRegion?.shape !== 'circle'" class="setting-group mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <label class="setting-label m-0">Corner Radius</label>
                        <span class="text-[10px] text-white/40 font-mono">{{ overlayRegion?.borderRadius || 0
                        }}px</span>
                    </div>
                    <input type="range" min="0" max="64" step="1" :value="overlayRegion?.borderRadius || 0"
                        @input="updateOverlayProperty('borderRadius', Number(($event.target as HTMLInputElement).value))"
                        class="glass-slider" />
                </div>

                <!-- Border Settings -->
                <div class="setting-group mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <label class="setting-label m-0">Border</label>
                        <el-switch v-model="hasBorder" size="small" />
                    </div>
                    <div v-if="hasBorder" class="flex gap-4 items-end animate-in">
                        <div class="flex-1">
                            <label class="text-[10px] opacity-30 uppercase block mb-2">Width</label>
                            <input type="range" min="1" max="10" step="1" :value="overlayRegion?.border?.width || 2"
                                @input="updateBorder('width', Number(($event.target as HTMLInputElement).value))"
                                class="glass-slider" />
                        </div>
                        <div class="w-12">
                            <label class="text-[10px] opacity-30 uppercase block mb-2">Color</label>
                            <input type="color" :value="overlayRegion?.border?.color || '#3b82f6'"
                                @input="updateBorder('color', ($event.target as HTMLInputElement).value)"
                                class="color-picker-input" />
                        </div>
                    </div>
                </div>

                <!-- Shadow Settings -->
                <div class="setting-group mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <label class="setting-label m-0">Shadow (Glow)</label>
                        <el-switch v-model="hasShadow" size="small" />
                    </div>
                    <div v-if="hasShadow" class="shadow-controls animate-in">
                        <div class="flex gap-4 mb-4">
                            <div class="flex-1">
                                <label class="text-[10px] opacity-30 uppercase block mb-2">Blur Force</label>
                                <input type="range" min="0" max="40" step="1" :value="overlayRegion?.shadow?.blur || 15"
                                    @input="updateShadow('blur', Number(($event.target as HTMLInputElement).value))"
                                    class="glass-slider" />
                            </div>
                            <div class="w-12">
                                <label class="text-[10px] opacity-30 uppercase block mb-2">Color</label>
                                <input type="color" :value="overlayRegion?.shadow?.color || '#000000'"
                                    @input="updateShadow('color', ($event.target as HTMLInputElement).value)"
                                    class="color-picker-input" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] opacity-30 uppercase block mb-2">Offset X</label>
                                <input type="range" min="-20" max="20" step="1" :value="overlayRegion?.shadow?.x || 0"
                                    @input="updateShadow('x', Number(($event.target as HTMLInputElement).value))"
                                    class="glass-slider" />
                            </div>
                            <div>
                                <label class="text-[10px] opacity-30 uppercase block mb-2">Offset Y</label>
                                <input type="range" min="-20" max="20" step="1" :value="overlayRegion?.shadow?.y || 0"
                                    @input="updateShadow('y', Number(($event.target as HTMLInputElement).value))"
                                    class="glass-slider" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { VideoTwo, CloseOne, Plus } from '@icon-park/vue-next';
import * as Icons from '@icon-park/vue-next';
import type { TransitionType } from '@/stores/studio';

// defineProps<{
//     modelValue: boolean;
// }>();

// defineEmits(['update:modelValue']);

const studioStore = useStudioStore();

const transitions: { value: TransitionType; label: string; icon: any }[] = [
    { value: 'instant', label: 'Instant', icon: Icons.Lightning },
    { value: 'fade', label: 'Fade', icon: Icons.Sun },
    { value: 'slide', label: 'Slide', icon: Icons.Right },
    { value: 'zoom', label: 'Zoom', icon: Icons.ZoomIn },
    { value: 'wipe', label: 'Wipe', icon: Icons.Erase }
];

const shapes = [
    { id: 'rect', name: 'Rectangle', icon: Icons.RectangleOne },
    { id: 'square', name: 'Square', icon: Icons.Square },
    { id: 'circle', name: 'Circle', icon: Icons.Round }
];

const overlayRegion = computed(() => {
    return studioStore.activeScene.layout.regions.find(r => r.id === 'overlay');
});

const hasBorder = computed({
    get: () => !!overlayRegion.value?.border,
    set: (val) => {
        if (val) {
            updateOverlayProperty('border', { width: 2, color: '#3b82f6' });
        } else {
            updateOverlayProperty('border', undefined);
        }
    }
});

const hasShadow = computed({
    get: () => !!overlayRegion.value?.shadow,
    set: (val) => {
        if (val) {
            updateOverlayProperty('shadow', { blur: 15, color: 'rgba(0,0,0,0.5)', x: 0, y: 4 });
        } else {
            updateOverlayProperty('shadow', undefined);
        }
    }
});

function updateOverlayProperty(key: string, value: any) {
    const region = studioStore.activeScene.layout.regions.find(r => r.id === 'overlay');
    if (region) {
        (region as any)[key] = value;
    }
}

function updateBorder(key: string, value: any) {
    const region = overlayRegion.value;
    if (region) {
        if (!region.border) region.border = { width: 2, color: '#3b82f6' };
        (region.border as any)[key] = value;
    }
}

function updateShadow(key: string, value: any) {
    const region = overlayRegion.value;
    if (region) {
        if (!region.shadow) region.shadow = { blur: 15, color: 'rgba(0,0,0,0.5)', x: 0, y: 4 };
        (region.shadow as any)[key] = value;
    }
}

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
    padding-top: 20px;
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

// PiP Settings Styles
.shape-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.shape-btn {
    padding: 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: 0.2s;

    span {
        font-size: 10px;
        font-weight: 700;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: white;
    }

    &.active {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.4);
        color: #60a5fa;
    }
}

.setting-label {
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 8px;
    display: block;
}

.glass-slider {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid white;
        transition: 0.2s;

        &:hover {
            transform: scale(1.2);
        }
    }
}

.color-picker-input {
    width: 100%;
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: 8px;
    }
}

.shadow-controls {
    display: flex;
    flex-direction: column;
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
