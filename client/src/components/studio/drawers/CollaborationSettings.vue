<template>
    <div class="collaboration-settings flex flex-col gap-6 animate-in">
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">Team Session</h4>
                <button class="text-[10px] text-blue-500 font-bold hover:text-blue-400"
                    @click="$emit('invite-cohost')">+ Invite</button>
            </div>
            <div class="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10 mb-6">
                <p class="text-[10px] opacity-40 leading-relaxed mb-6">Invite others to edit layers and manage the
                    stream in real-time. Changes are synced across all hosts.</p>

                <div v-if="teamList.length" class="collaborators-list space-y-3">
                    <div v-for="c in teamList" :key="c.id"
                        class="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 group hover:border-blue-500/30 transition-all">
                        <div
                            class="w-8 h-8 rounded-full bg-blue-400/20 border border-blue-400/30 flex items-center justify-center overflow-hidden">
                            <img v-if="c.avatar" :src="c.avatar" class="w-full h-full object-cover" />
                            <span v-else class="text-[10px] font-black">{{ (c.name || '?').charAt(0) }}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-[10px] font-bold">{{ c.name }} <span v-if="c.id === currentUserId"
                                    class="opacity-30 ml-1">(You)</span></p>
                            <div class="flex items-center gap-1">
                                <div class="w-1.5 h-1.5 rounded-full" :class="c.online ? 'bg-green-400 animate-pulse' : 'bg-white/20'"></div>
                                <span class="text-[8px] opacity-30 uppercase font-black">{{ c.online ? 'Connected' : 'Offline' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else class="text-center py-4 border border-dashed border-white/10 rounded-2xl">
                    <p class="text-[10px] opacity-20 italic">No team members assigned</p>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const props = defineProps<{
    currentUserId: string;
}>();

const studioStore = useStudioStore();

const teamList = computed(() => {
    return studioStore.projectTeam.map(member => ({
        ...member,
        online: studioStore.coHosts.some(h => h.id === member.id) || member.id === props.currentUserId
    }));
});

defineEmits(['invite-cohost']);
</script>
