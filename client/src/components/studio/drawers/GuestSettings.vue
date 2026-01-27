<template>
    <div class="guest-settings flex flex-col gap-8 animate-in">
        <!-- Fast Action Grid -->
        <div class="grid grid-cols-2 gap-3">
            <button
                class="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-center transition-all group"
                @click="$emit('invite-guest')">
                <user theme="outline" class="mb-2 opacity-50 group-hover:opacity-100 mx-auto" />
                <p class="text-[8px] font-black uppercase">Invite Guest</p>
            </button>
            <button
                class="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-center transition-all group"
                @click="$emit('add-mobile-cam')">
                <iphone theme="outline" class="mb-2 opacity-50 group-hover:opacity-100 mx-auto" />
                <p class="text-[8px] font-black uppercase">Add Mobile Cam</p>
            </button>
        </div>

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
                    <el-switch v-model="g.active" @change="$emit('toggle-guest', g)" />
                </div>
            </div>
        </section>

        <!-- Active Remote Guests -->
        <section v-if="remoteGuests.length > 0">
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">Active Human Guests</h4>
            <div class="guest-list flex flex-col gap-3">
                <div v-for="g in remoteGuests" :key="g.id"
                    class="guest-item glass-selectable p-3 flex justify-between items-center bg-white/5 rounded-xl border border-white/10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex justify-center items-center">
                            <user theme="outline" />
                        </div>
                        <span class="text-xs font-bold">{{ g.name }}</span>
                    </div>
                    <div class="flex gap-2">
                        <button class="icon-btn xs" @click="$emit('mute-guest', g.id)">
                            <microphone theme="outline" size="12" />
                        </button>
                        <button class="icon-btn xs delete text-red-500" @click="$emit('remove-guest', g.id)">
                            <close theme="outline" size="12" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { User, Iphone, Microphone, Close } from '@icon-park/vue-next';

defineProps<{
    guestPersonas: any[];
    remoteGuests: any[];
}>();

defineEmits([
    'invite-guest', 'add-mobile-cam', 'summon-guest',
    'toggle-guest', 'mute-guest', 'remove-guest'
]);
</script>
