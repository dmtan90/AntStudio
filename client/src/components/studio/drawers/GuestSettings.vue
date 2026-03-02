<template>
    <div class="guest-settings flex flex-col gap-8 animate-in">
        <!-- Fast Action Grid -->
        <div class="grid grid-cols-2 gap-3">
            <button
                class="p-4 inline-flex items-center rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-center transition-all group"
                @click="$emit('invite-guest')">
                <user theme="outline" class="opacity-50 group-hover:opacity-100 mx-auto" />
                <span class="text-[8px] font-black uppercase">{{ $t('studio.drawers.guest.inviteGuest') }}</span>
            </button>
            <button
                class="p-4 inline-flex items-center rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-center transition-all group"
                @click="$emit('add-mobile-cam')">
                <iphone theme="outline" class="opacity-50 group-hover:opacity-100 mx-auto" />
                <span class="text-[8px] font-black uppercase">{{ $t('studio.drawers.guest.addMobileCam') }}</span>
            </button>
        </div>

        <!-- Active Remote Guests -->
        <section v-if="remoteGuests.length > 0">
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.guest.activeGuests') }}</h4>
            <div class="guest-list grid grid-cols-2 gap-3">
                <div v-for="g in remoteGuests" :key="g.uuid"
                    class="guest-item glass-selectable flex flex-col justify-between items-center bg-white/5 rounded-xl border border-white/10 group/item relative overflow-hidden"
                    draggable="true" @dragstart="onDragStart($event, g.uuid)">

                    <!-- Improved Visual Preview Background -->
                    <div
                        class="absolute inset-0 opacity-40 pointer-events-none transition-opacity group-hover/item:opacity-60 bg-black/60">
                        <GuestVideoPreview :guest-id="g.uuid" :video-elements="guestVideoElements" />
                    </div>
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none">
                    </div>

                    <div class="flex flex-col items-center justify-end gap-1 relative z-10 h-[100px] w-full pb-2">
                        <div class="flex flex-col text-center px-2">
                            <span
                                class="text-[10px] font-black uppercase tracking-tight text-white drop-shadow-md pr-1">{{
                                    g.name }}</span>
                            <span class="text-[8px] opacity-60 font-mono text-blue-400 drop-shadow-md">
                                {{ g.slotIndex !== undefined ? $t('studio.drawers.guest.slot', { n: g.slotIndex + 1 }) : $t('studio.drawers.guest.waitingStatus') }}
                            </span>
                        </div>
                    </div>


                    <div class="flex items-center gap-1 relative z-10 bg-black/50 p-2">
                        <button class="icon-btn xs hover:text-blue-400" :title="$t('studio.drawers.guest.swapTitle')"
                            @click="studioStore.swapWithHost(g.uuid)">
                            <full-selection theme="outline" size="12" />
                        </button>

                        <div class="w-px h-3 bg-white/10 mx-1"></div>
                        <button class="icon-btn xs"
                            :class="{ 'text-blue-500': g.audioEnabled, 'opacity-30': !g.audioEnabled }"
                            @click="$emit('toggle-mute', g.uuid, !g.audioEnabled)">
                            <microphone v-if="g.audioEnabled" theme="filled" size="12" />
                            <microphone-m v-else theme="outline" size="12" />
                        </button>
                        <button class="icon-btn xs"
                            :class="{ 'text-blue-500': g.videoEnabled, 'opacity-30': !g.videoEnabled }"
                            @click="$emit('toggle-camera', g.uuid, !g.videoEnabled)">
                            <camera v-if="g.videoEnabled" theme="filled" size="12" />
                            <camera-five v-else theme="outline" size="12" />
                        </button>
                        <button class="icon-btn xs delete text-red-500 hover:bg-red-500/20"
                            @click="$emit('remove-guest', g.uuid)">
                            <close theme="outline" size="12" />
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Synthetic Personas -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.guest.personaGallery') }}</h4>
            <div class="grid grid-cols-1 gap-3">
                <div v-for="g in guestPersonas" :key="g.uuid"
                    class="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('summon-guest', g)">
                    <div class="flex items-center gap-4">
                        <el-avatar :src="g.avatarUrl" :size="32" class="border border-white/10" />
                        <div>
                            <p class="text-[10px] font-bold">{{ g.name }}</p>
                            <p class="text-[8px] opacity-40 max-w-[70px]">
                                <el-text truncated class="text-[8px]">
                                    {{ (g.modelType || '3D').toUpperCase() }} • {{ g.uuid.slice(0, 8).toUpperCase() }}
                                </el-text>
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Role Toggle -->
                        <button 
                            @click.stop="$emit('toggle-role', g.uuid)"
                            class="px-2 py-1 rounded-md text-[8px] font-black tracking-widest transition-all border border-white/5"
                            :class="g.isMaster ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-white/40 hover:text-white'"
                        >
                            {{ g.isMaster ? $t('studio.drawers.guest.roles.master') : $t('studio.drawers.guest.roles.agent') }}
                        </button>
                        <el-switch v-slot="{ value }" :model-value="g.active" @change="$emit('toggle-guest', g)" />
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { User, Iphone, Microphone, VoiceOff as MicrophoneM, Close, Camera, CameraFive, FullSelection } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { useUIStore } from '@/stores/ui';

const studioStore = useStudioStore();
const uiStore = useUIStore();
const appSlug = computed(() => uiStore.appName.toLowerCase().replace(/\s+/g, '-'));
const guestDndType = computed(() => `application/${appSlug.value}-guest`);

const props = defineProps<{
    guestPersonas: any[];
    remoteGuests: any[];
    guestVideoElements: Map<string, HTMLVideoElement>;
}>();


const emit = defineEmits([
    'invite-guest', 'add-mobile-cam', 'summon-guest',
    'toggle-guest', 'toggle-mute', 'toggle-camera', 'remove-guest', 'assign-slot', 'toggle-role'
]);

const onDragStart = (event: DragEvent, guestId: string) => {
    if (event.dataTransfer) {
        console.log('[GuestSettings] Drag Start:', guestId);
        event.dataTransfer.setData('application/antstudio-guest', guestId);
        event.dataTransfer.effectAllowed = 'move';

        // Custom drag image if needed
        // const dragIcon = document.createElement('div');
        // dragIcon.className = 'w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white';
        // dragIcon.innerHTML = 'G';
        // document.body.appendChild(dragIcon);
        // event.dataTransfer.setDragImage(dragIcon, 20, 20);
        // setTimeout(() => document.body.removeChild(dragIcon), 0);
    }
};
</script>

<style scoped lang="scss">
.guest-item {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(59, 130, 246, 0.3);
        transform: translateX(4px);
    }

    &[draggable="true"] {
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }
}

.guest-avatar-wrapper {
    position: relative;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.icon-btn.xs {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: rgba(255, 255, 255, 0.4);

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
}
</style>
