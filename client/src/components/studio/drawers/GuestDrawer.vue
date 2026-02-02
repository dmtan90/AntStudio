<template>
  <el-dialog v-model="isVisible" :show-close="false" :align-center="true" :width="500"
    class="guest-drawer-modal glass-dark">
    <template #header>
      <div class="flex justify-between items-center p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <share-two theme="outline" size="20" class="text-blue-400" />
          </div>
          <div>
            <h2 class="text-lg font-black text-white uppercase tracking-tighter">Invite Guests</h2>
            <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Connect with your audience</p>
          </div>
        </div>
        <button @click="$emit('update:modelValue', false)" class="close-btn">
          <close theme="outline" size="20" />
        </button>
      </div>
    </template>

    <div class="p-8 space-y-10">
      <!-- Section: Join Link -->
      <section class="space-y-4">
        <div class="flex justify-between items-end">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Join Link</h4>
          <span class="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">SECURE LINK</span>
        </div>
        <div class="relative group">
          <input type="text" readonly :value="guestLink"
            class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-32 text-sm font-mono text-white group-hover:border-blue-500/30 transition-all outline-none" />
          <button @click="copyLink"
            class="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </section>

      <div class="grid grid-cols-2 gap-8">
        <!-- Section: QR Code (Mock) -->
        <section class="space-y-4">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Scan to Join</h4>
          <div
            class="aspect-square bg-white rounded-3xl p-4 flex items-center justify-center shadow-2xl shadow-blue-500/10 group cursor-pointer border-4 border-white group-hover:scale-105 transition-all">
            <!-- Mock QR with icon -->
            <div class="relative">
              <div class="absolute inset-0 bg-blue-500/5 blur-xl"></div>
              <qrcode theme="outline" size="120" class="text-black relative" />
            </div>
          </div>
          <p class="text-[9px] text-center text-white/30 font-bold">Fastest for mobile guests</p>
        </section>

        <!-- Section: Settings -->
        <section class="space-y-4">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Permissions</h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">Auto-Approve</span>
              <el-switch size="small" v-model="autoApprove" />
            </div>
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">Mic Enabled</span>
              <el-switch size="small" v-model="micEnabled" />
            </div>
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">Cam Enabled</span>
              <el-switch size="small" v-model="camEnabled" />
            </div>
          </div>
        </section>
      </div>

      <!-- Section: Waiting Room -->
      <section v-if="waitingGuests.length > 0" class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Waiting Room ({{ waitingGuests.length
        }})
        </h4>
        <div class="space-y-3">
          <div v-for="guest in waitingGuests" :key="guest.id"
            class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div class="flex items-center gap-4">
              <el-avatar :src="guest.avatar" :size="32">
                <user theme="outline" />
              </el-avatar>
              <div>
                <p class="text-xs font-black text-white">{{ guest.name }}</p>
                <p class="text-[9px] font-bold text-blue-400 uppercase">Knocking...</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="approveGuest(guest.id)"
                class="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-400 transition-all">Approve</button>
              <button @click="rejectGuest(guest.id)"
                class="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition-all">Reject</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="text-center">
        <p class="text-[10px] text-white/20 font-bold">Max 4 guests per session • Link expires in 24 hours</p>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ShareTwo, Close, PayCodeOne as Qrcode, User } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { toast } from 'vue-sonner';

const props = defineProps<{
  modelValue: boolean;
}>();

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const emit = defineEmits(['update:modelValue']);

const studioStore = useStudioStore();
const copied = ref(false);
const autoApprove = ref(false);
const micEnabled = ref(true);
const camEnabled = ref(true);
const { guestJoinLink } = storeToRefs(studioStore);

const guestLink = computed(() => guestJoinLink.value || 'https://localhost:3000/join/init...');
const waitingGuests = computed(() => studioStore.waitingGuests);

const copyLink = () => {
  if (guestLink.value) {
    navigator.clipboard.writeText(guestLink.value);
    copied.value = true;
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => (copied.value = false), 2000);
  }
};

const approveGuest = (id: string) => {
  studioStore.approveGuest(id);
  studioStore.broadcastCurrentState();
  toast.success('Guest approved and added to live stream');
};

const rejectGuest = (id: string) => {
  studioStore.rejectGuest(id);
  toast.info('Guest invitation rejected');
};

onMounted(() => {
  if (studioStore.currentSessionId) {
    studioStore.generateInvite(studioStore.currentSessionId);
  } else if (!guestJoinLink.value) {
    studioStore.generateGuestLink();
  }
});

watch(() => studioStore.currentSessionId, (newId) => {
  if (newId) {
    studioStore.generateInvite(newId);
  }
});
</script>

<style scoped lang="scss">
.guest-drawer-modal {
  :deep(.el-dialog) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    margin: 0;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: rotate(90deg);
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
