<template>
    <div class="guest-settings flex flex-col gap-8 animate-in">
        <!-- Fast Action Grid -->
        <div class="grid grid-cols-2 gap-3">
            <button
                class="p-4 inline-flex items-center rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-center transition-all group"
                @click="$emit('invite-guest')">
                <user theme="outline" class="opacity-50 group-hover:opacity-100 mx-auto" />
                <span class="text-[8px] font-black uppercase">Invite Guest</span>
            </button>
            <button
                class="p-4 inline-flex items-center rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-center transition-all group"
                @click="$emit('add-mobile-cam')">
                <iphone theme="outline" class="opacity-50 group-hover:opacity-100 mx-auto" />
                <span class="text-[8px] font-black uppercase">Add Mobile Cam</span>
            </button>
        </div>

        <!-- Active Remote Guests -->
        <section v-if="remoteGuests.length > 0">
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Active Guests</h4>
            <div class="guest-list grid grid-cols-2 gap-3">
                <div v-for="g in remoteGuests" :key="g.id"
                    class="guest-item glass-selectable flex flex-col justify-between items-center bg-white/5 rounded-xl border border-white/10 group/item relative overflow-hidden"
                    draggable="true" @dragstart="onDragStart($event, g.id)">

                    <!-- Improved Visual Preview Background -->
                    <div
                        class="absolute inset-0 opacity-40 pointer-events-none transition-opacity group-hover/item:opacity-60 bg-black/60">
                        <GuestVideoPreview :guest-id="g.id" :video-elements="guestVideoElements" />
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
                                {{ g.slotIndex !== undefined ? `SLOT S${g.slotIndex + 1}` : 'WAITING' }}
                            </span>
                        </div>
                    </div>


                    <div class="flex items-center gap-1 relative z-10 bg-black/50 p-2">
                        <button class="icon-btn xs hover:text-blue-400" title="Solo / Swap with Host"
                            @click="studioStore.swapWithHost(g.id)">
                            <full-selection theme="outline" size="12" />
                        </button>

                        <div class="w-px h-3 bg-white/10 mx-1"></div>
                        <button class="icon-btn xs"
                            :class="{ 'text-blue-500': g.audioEnabled, 'opacity-30': !g.audioEnabled }"
                            @click="$emit('toggle-mute', g.id, !g.audioEnabled)">
                            <microphone v-if="g.audioEnabled" theme="filled" size="12" />
                            <microphone-m v-else theme="outline" size="12" />
                        </button>
                        <button class="icon-btn xs"
                            :class="{ 'text-blue-500': g.videoEnabled, 'opacity-30': !g.videoEnabled }"
                            @click="$emit('toggle-camera', g.id, !g.videoEnabled)">
                            <camera v-if="g.videoEnabled" theme="filled" size="12" />
                            <camera-five v-else theme="outline" size="12" />
                        </button>
                        <button class="icon-btn xs delete text-red-500 hover:bg-red-500/20"
                            @click="$emit('remove-guest', g.id)">
                            <close theme="outline" size="12" />
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Synthetic Personas -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Synthetic Persona Gallery</h4>
            <div class="grid grid-cols-1 gap-3">
                <div v-for="g in guestPersonas" :key="g.id"
                    class="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('summon-guest', g)">
                    <div class="flex items-center gap-4">
                        <el-avatar :src="g.avatarUrl" :size="32" class="border border-white/10" />
                        <div>
                            <p class="text-[10px] font-bold">{{ g.name }}</p>
                            <p class="text-[8px] opacity-40">{{ g.id.toUpperCase() }}</p>
                        </div>
                    </div>
                    <el-switch v-slot="{ value }" :model-value="g.active" @change="$emit('toggle-guest', g)" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { User, Iphone, Microphone, VoiceOff as MicrophoneM, Close, Camera, CameraFive, FullSelection } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import GuestVideoPreview from './GuestVideoPreview.vue';

const studioStore = useStudioStore();

const props = defineProps<{
    guestPersonas: any[];
    remoteGuests: any[];
    guestVideoElements: Map<string, HTMLVideoElement>;
}>();


const emit = defineEmits([
    'invite-guest', 'add-mobile-cam', 'summon-guest',
    'toggle-guest', 'toggle-mute', 'toggle-camera', 'remove-guest', 'assign-slot'
]);

const onDragStart = (event: DragEvent, guestId: string) => {
    if (event.dataTransfer) {
        event.dataTransfer.setData('application/antflow-guest', guestId);
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
