<template>
    <div class="preview-stage" @dragover.prevent="onDragOver" @drop="onDrop">
        <div class="canvas-wrapper glass-dark" ref="canvasWrapper">

            <!-- Real-time Render Canvas (Injected via slot from Parent) -->
            <slot name="canvas"></slot>

            <!-- Floating Interactions Overlay -->
            <div class="interaction-overlay">
                <transition-group name="float-up">
                    <div v-for="like in activeLikes" :key="like.id" class="floating-heart" :style="like.style">
                        <like theme="filled" size="24" />
                    </div>
                </transition-group>
            </div>
        </div>

        <!-- Bottom Control Bar -->
        <slot name="controls"></slot>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Like } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { useUIStore } from '@/stores/ui';

defineProps<{
    activeLikes: any[];
}>();

const studioStore = useStudioStore();
const uiStore = useUIStore();
const appSlug = computed(() => uiStore.appName.toLowerCase().replace(/\s+/g, '-'));
const guestDndType = computed(() => `application/${appSlug.value}-guest`);
const activeRegion = ref<string | null>(null);

const onDragOver = (event: DragEvent) => {
    // Simply allow drop
};

const onDrop = (event: DragEvent) => {
    const guestId = event.dataTransfer?.getData('application/antflow-guest');
    if (!guestId) return;

    // Calculate slot based on drop position relative to stage
    // For now, simpler: map to regions based on rects if multiple slots
    // Or just assign to first available slot if generic drop on stage

    // Advanced: Calculate which region was dropped on
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Find the best region in current scene
    const regions = studioStore.activeScene.layout.regions;
    let bestRegion = regions[0];
    let minDistance = Infinity;

    regions.forEach(r => {
        const centerX = r.x + r.width / 2;
        const centerY = r.y + r.height / 2;
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (dist < minDistance) {
            minDistance = dist;
            bestRegion = r;
        }
    });

    if (bestRegion) {
        if (bestRegion.source === 'host') {
            studioStore.swapWithHost(guestId);
        } else if (bestRegion.source.startsWith('guest')) {
            const slotIdx = parseInt(bestRegion.source.replace('guest', '')) - 1;
            studioStore.assignGuestToSlot(guestId, slotIdx);
        }
    } else {
        // Fallback or generic slot 1
        studioStore.assignGuestToSlot(guestId, 0);
    }

};
</script>


<style scoped lang="scss">
.preview-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    gap: 20px;
    background: radial-gradient(circle at center, rgba(30, 64, 175, 0.05) 0%, transparent 70%);

    .canvas-wrapper {
        flex: 1;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: #000;
        position: relative;
        overflow: hidden;
        box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5);
        @include flex-center;
    }

    .interaction-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 10;
    }

    .floating-heart {
        position: absolute;
        bottom: 20px;
        color: #ff4d4f;
        filter: drop-shadow(0 0 10px rgba(255, 77, 79, 0.5));
    }
}

.float-up-enter-active {
    animation: float-up 2s ease-out forwards;
}

@keyframes float-up {
    0% {
        transform: translateY(0) scale(1) rotate(0);
        opacity: 1;
    }

    100% {
        transform: translateY(-400px) scale(1.5) rotate(20deg);
        opacity: 0;
    }
}
</style>
