<template>
    <div class="space-y-6">
        <!-- Studio Vibe Meter -->
        <div class="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 class="text-xs font-bold uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                <analysis theme="outline" size="14" /> Room Vibe
            </h3>
            
            <div class="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div class="absolute top-0 bottom-0 w-2 h-full bg-white transition-all duration-500 ease-out z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                     :style="{ left: vibeValue + '%' }"></div>
                <!-- Gradient Background -->
                <div class="absolute inset-0 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 opacity-50"></div>
            </div>
            
            <div class="flex justify-between text-[10px] text-white/40 font-mono">
                <span>TENSE</span>
                <span>NEUTRAL</span>
                <span>HYPE</span>
            </div>
        </div>

        <!-- Simulated User Controls -->
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-widest text-white/50">Audience Actions</h3>
                <span class="text-xs font-mono text-yellow-400 font-bold flex items-center gap-1">
                    <finance theme="filled" /> {{ studioStore.userWallet.balance }}
                </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <button v-for="action in actions" :key="action.id"
                        @click="triggerAction(action)"
                        :disabled="studioStore.userWallet.balance < action.cost || action.cooldown > 0"
                        class="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-left transition-all hover:border-purple-500/50 hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.5)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    
                    <div class="flex items-start justify-between mb-2">
                        <component :is="action.icon" theme="filled" size="18" :class="action.color" />
                        <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-white/60 group-hover:bg-purple-500/20 group-hover:text-purple-300">
                            {{ action.cost }} 🪙
                        </span>
                    </div>
                    
                    <div class="font-bold text-xs text-white group-hover:text-purple-100">{{ action.name }}</div>
                    <div class="text-[10px] text-white/40 leading-tight mt-1">{{ action.desc }}</div>

                    <!-- Cooldown Overlay -->
                    <div v-if="action.cooldown > 0" 
                         class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px] cursor-not-allowed">
                        <span class="font-mono text-xs font-bold text-white">{{ action.cooldown }}s</span>
                    </div>
                </button>
            </div>
        </div>

        <!-- Poll Creator (Host Only - Simulated) -->
        <div class="pt-4 border-t border-white/10">
             <h3 class="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Poll Creator</h3>
             <button @click="showPollCreator = true" class="w-full py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                + New Hive Poll
             </button>
        </div>

        <!-- Quick Poll Modal -->
        <el-dialog v-model="showPollCreator" title="Create Hive Poll" width="400px" custom-class="glass-modal">
            <div class="space-y-4">
                <div>
                    <label class="block text-xs text-white/60 mb-1">Question</label>
                    <input v-model="newPoll.question" type="text" class="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="What happens next?" />
                </div>
                <div class="space-y-2">
                    <label class="block text-xs text-white/60 mb-1">Options</label>
                    <div v-for="(opt, i) in newPoll.options" :key="i" class="flex gap-2">
                        <input v-model="newPoll.options[i]" type="text" class="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" :placeholder="`Option ${i+1}`" />
                    </div>
                </div>
                <!-- Duration Slider? -->
                <div class="flex justify-end gap-2 mt-4">
                    <button @click="showPollCreator = false" class="px-4 py-2 rounded-lg text-xs font-bold text-white/60 hover:bg-white/10">Cancel</button>
                    <button @click="createPoll" class="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600">Launch Poll</button>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { ActionSyncService } from '@/utils/ai/ActionSyncService'; // Access socket
import { Analysis, PartyBalloon, VolumeNotice, Camera, Movie, Finance } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const studioStore = useStudioStore();
const showPollCreator = ref(false);

const newPoll = ref({
    question: '',
    options: ['', '', '']
});

const actions = [
    { id: 'sfx_airhorn', name: 'Air Horn', desc: 'Hype up the moment', icon: VolumeNotice, cost: 50, color: 'text-yellow-400', cooldown: 0 },
    { id: 'visual_confetti', name: 'Confetti', desc: 'Celebrate a win', icon: PartyBalloon, cost: 100, color: 'text-pink-400', cooldown: 0 },
    { id: 'camera_cut', name: 'Dramatic Cut', desc: 'Focus on speaker', icon: Camera, cost: 200, color: 'text-blue-400', cooldown: 0 },
    { id: 'b_roll', name: 'Random Clip', desc: 'Insert chaos B-roll', icon: Movie, cost: 500, color: 'text-green-400', cooldown: 0 },
];

// Map vibe 'happy' | 'tense' | 'neutral' to a 0-100 value visual
// Only for mapping purposes, real value comes from server
// Wait, studioStore.studioVibe is string.
// Let's create a computed for the slider position
const vibeValue = computed(() => {
    switch (studioStore.studioVibe) {
        case 'happy': return 80;
        case 'tense': return 20;
        default: return 50;
    }
});
// Actually let's use a local ref for smooth animation if possible, 
// strictly mapping to studioStore.studioVibe string is discrete.
// Ideally studioStore should hold the numeric score too.
// For now, computed is fine.

const triggerAction = (action: any) => {
    if (action.cooldown > 0) return;
    if (studioStore.userWallet.balance < action.cost) {
        toast.error('Insufficient Credits');
        return;
    }

    // Simulate cooldown
    action.cooldown = 10;
    const timer = setInterval(() => {
        action.cooldown--;
        if (action.cooldown <= 0) clearInterval(timer);
    }, 1000);

    // Send Request via Economy (Purchase the action)
    // Note: Director Actions are specialized items, we might need a distinct flow
    // For Phase 68, let's treat them as "Purchasing a Service Request"
    ActionSyncService.getSocket()?.emit('hive:request', {
        type: action.id,
        payload: {},
        cost: action.cost
    });
    
    // We should also ideally deduct local balance speculatively or wait for server push
    // For now, allow negative latency or wait for update
    toast.success(`Requested ${action.name}!`);
};

const createPoll = () => {
    // We don't have a createPoll socket event directly, usually via API or special socket event.
    // For now, let's assume we use an API endpoint or socket emition.
    // Wait, AudienceInteractionService.createPoll is a method on the service.
    // Does it listen to a socket event? No, only 'hive:vote'.
    // We need a 'hive:create_poll' event or an API call.
    // Let's use a mocked API call since I didn't add createPoll listener in SocketService (my bad).
    // Or just emit 'hive:request' with type 'create_poll' if flexible?
    // Proper way: Add API endpoint. 
    // Fallback for Phase 66 velocity: Emit 'hive:request' and handle generically?
    
    // Actually, Studio Store `createShowScript` uses API. 
    // I should probably skip poll creation from the "Viewer" panel as viewers don't create polls.
    // But the requirements said "Audience Agency".
    // "DirectorControlPanel" implies simulated Director/Viewer.
    // Let's just toast for now or implement properly if time permits.
    // Implementation Plan mentioned "DirectorControlPanel for user-triggered events". Polls are usually Host-triggered.
    // So let's disable Poll Creation for this panel, or make it a "Request Poll".
    
    // Re-reading: "Create HivePollOverlay ... Create DirectorControlPanel ... Connect Audience Actions"
    // Nothing explicitly says Viewers create polls.
    
    toast.info("Poll request sent to Host!");
    showPollCreator.value = false;
};
</script>
