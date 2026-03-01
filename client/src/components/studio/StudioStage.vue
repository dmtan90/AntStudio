<template>
    <div class="preview-stage" 
         @dragover.prevent="onDragOver" 
         @dragleave="onDragLeave" 
         @drop="onDrop">
        
        <!-- Drag Highlight Overlay -->
        <!--<transition name="fade">
            <div v-if="isDragging" class="absolute inset-0 z-50 bg-blue-500/10 border-4 border-blue-500/50 rounded-3xl backdrop-blur-sm pointer-events-none flex items-center justify-center">
                <div class="bg-blue-500/80 px-6 py-2 rounded-full text-white font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                    Drop to Assign Slot
                </div>
            </div>
        </transition>-->
        <div class="canvas-wrapper glass-dark" ref="canvasWrapper">

            <!-- Real-time Render Canvas (Injected via slot from Parent) -->
            <slot name="canvas"></slot>

            <!-- Floating Interactions Overlay -->
            <div class="interaction-overlay">
                <transition-group name="float-up">
                    <div v-for="fx in activeFX" :key="fx.id" :class="['floating-fx', fx.type]" :style="fx.style">
                        <component :is="getFXIcon(fx.type)" theme="filled" :size="fx.size || 24" />
                    </div>
                </transition-group>
 
                <!-- Particle Explosion (Confetti/Cash) -->
                <div v-for="explosion in activeExplosions" :key="explosion.id" class="explosion-container" :style="explosion.style">
                    <div v-for="p in 12" :key="p" class="particle" :class="explosion.type" :style="getParticleStyle(p)">
                         <component :is="getFXIcon(explosion.type)" theme="filled" size="14" />
                    </div>
                </div>
 
                 <!-- Break Mode Overlay (Phase 18) -->
                 <transition name="fade">
                     <div v-if="studioStore.visualSettings.breakMode.enabled" 
                         class="absolute inset-0 z-[20] flex flex-col items-center justify-center p-12 text-center break-overlay">
                         <div class="relative mb-8 animate-bounce-slow">
                             <div class="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                             <like theme="outline" size="64" class="text-red-400 relative z-10" />
                         </div>
                         <h2 class="text-5xl font-black uppercase tracking-tighter mb-4 animate-in slide-in-from-bottom-4 duration-700">
                             {{ studioStore.visualSettings.breakMode.message }}
                         </h2>
                         <div class="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ $t('studio.stage.sessionPaused') }}</span>
                        </div>

                        <!-- Decorative background text -->
                        <div class="absolute -bottom-10 -right-10 text-[120px] font-black opacity-[0.03] rotate-12 pointer-events-none whitespace-nowrap">
                            {{ $t('studio.stage.beRightBack') }}
                        </div>
                    </div>
                </transition>

                <!-- Sponsorship Badge (Phase 18) -->
                <transition name="slide-up">
                    <div v-if="studioStore.visualSettings.specialOverlays.showSponsorship"
                        class="absolute bottom-8 left-8 z-[15] animate-in slide-in-from-left-4 duration-500">
                        <div class="flex items-center gap-4 p-1.5 pr-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-yellow-500/30">
                            <div class="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center animate-pulse">
                                <ChartLine theme="filled" size="20" class="text-black" />
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[8px] font-black uppercase tracking-widest text-yellow-500">{{ $t('studio.stage.sponsor') }}</span>
                                <span class="text-[14px] font-bold text-white leading-tight">
                                    {{ studioStore.visualSettings.specialOverlays.sponsorName }}
                                </span>
                            </div>
                        </div>
                    </div>
                </transition>
             </div>
        </div>

        <!-- Bottom Control Bar -->
        <slot name="controls"></slot>
    </div>
</template>

<script setup lang="ts">
import { Like, Fire, Snowflake, Financing, 
    Trophy, Sunrise, Flashlamp, Cactus, 
    Rocket, Drink, Lotus, ChartLine 
} from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { useUIStore } from '@/stores/ui';

const props = defineProps<{
    activeFX: any[];
    activeExplosions?: any[];
}>();

const getFXIcon = (type: string) => {
    switch (type) {
        case 'fire': return Fire;
        case 'snow': return Snowflake;
        case 'cash': return Financing;
        case 'confetti': return Trophy;
        case 'balloons': return Sunrise;
        case 'glitch': return Flashlamp;
        case 'hearts': return Like;
        case 'anim_rocket':
        case 'rocket': return Rocket;
        case 'anim_coffee':
        case 'coffee': return Drink;
        case 'anim_rose':
        case 'rose': return Lotus;
        default: return Like;
    }
};

const getParticleStyle = (i: number) => {
    const angle = (i / 12) * Math.PI * 2;
    const velocity = 50 + Math.random() * 50;
    return {
        '--dx': `${Math.cos(angle) * velocity}px`,
        '--dy': `${Math.sin(angle) * velocity}px`,
        'animation-delay': `${Math.random() * 0.2}s`
    };
};

const studioStore = useStudioStore();
const uiStore = useUIStore();
const appSlug = computed(() => uiStore.appName.toLowerCase().replace(/\s+/g, '-'));
const guestDndType = computed(() => `application/${appSlug.value}-guest`);
const activeRegion = ref<string | null>(null);

const isDragging = ref(false);

const onDragOver = (event: DragEvent) => {
    // Simply allow drop
    isDragging.value = true;
};

const onDragLeave = (event: DragEvent) => {
    // Check if leaving the main stage, not just entering a child
    if (event.relatedTarget && (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
        return;
    }
    isDragging.value = false;
};

const onDrop = (event: DragEvent) => {
    isDragging.value = false;
    const guestId = event.dataTransfer?.getData('application/antflow-guest');
    
    console.log('[StudioStage] Drop detected:', { guestId, clientX: event.clientX, clientY: event.clientY });
    console.log('[StudioStage] Store State:', { 
        live: studioStore.liveGuests.map(g => ({ uuid: g.uuid, name: g.name })),
        waiting: studioStore.waitingGuests.map(g => ({ uuid: g.uuid, name: g.name }))
    });

    if (!guestId) return;

    // Calculate slot based on drop position relative to stage
    // For now, simpler: map to regions based on rects if multiple slots
    // Or just assign to first available slot if generic drop on stage

    // Advanced: Calculate which region was dropped on
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log('[StudioStage] Drop Coords (%):', { x, y });

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
    
    console.log('[StudioStage] Best Region:', bestRegion);

    if (bestRegion) {
        if (bestRegion.source === 'host') {
            studioStore.swapWithHost(guestId);
        } else if (bestRegion.source.startsWith('guest')) {
            const slotIdx = parseInt(bestRegion.source.replace('guest', '')) - 1;
			// const slotIdx = parseInt(bestRegion.source.replace('guest', ''));
            console.log('[StudioStage] Assigning ' + guestId + ' to slot:', slotIdx);
            studioStore.assignGuestToSlot(guestId, slotIdx);
        }
    } else {
        // Fallback or generic slot 1
        console.log('[StudioStage] Fallback assign to slot 0');
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

    .floating-fx {
        position: absolute;
        bottom: 20px;
        transition: all 0.5s;

        &.hearts { color: #ff4d4f; filter: drop-shadow(0 0 10px rgba(255, 77, 79, 0.5)); }
        &.fire { color: #ff7810; filter: drop-shadow(0 0 15px #ff4d00); }
        &.snow { color: #ffffff; filter: drop-shadow(0 0 8px #b1e0ff); }
        &.cash { color: #52c41a; filter: drop-shadow(0 0 10px #237804); }
        &.confetti { color: #fadb14; filter: drop-shadow(0 0 10px #d48806); }
        &.balloons { color: #eb2f96; filter: drop-shadow(0 0 10px #722ed1); }
        &.glitch { color: #08f7fe; filter: drop-shadow(0 0 10px #fe019a); animation: glitch-anim 0.2s infinite; }
    }

    .explosion-container {
        position: absolute;
        pointer-events: none;
        z-index: 100;
        
        .particle {
            position: absolute;
            animation: particle-explode 1s ease-out forwards;
            
            &.confetti { color: #fadb14; }
            &.cash { color: #52c41a; }
        }
    }
}

@keyframes glitch-anim {
    0% { transform: translate(0); }
    20% { transform: translate(-2px, 2px); }
    40% { transform: translate(-2px, -2px); }
    60% { transform: translate(2px, 2px); }
    80% { transform: translate(2px, -2px); }
    100% { transform: translate(0); }
}

@keyframes particle-explode {
    0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
    }
    100% {
        transform: translate(var(--dx), var(--dy)) scale(0);
        opacity: 0;
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
