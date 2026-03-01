<template>
  <el-dialog v-model="isVisible" :show-close="false" :align-center="true" :width="540"
    class="guest-drawer-modal glass-dark" :destroy-on-close="true">
    <template #header>
      <div class="flex justify-between items-center p-6 border-b border-white/5">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <iphone v-if="mode === 'mobile'" theme="outline" size="24" class="text-blue-400" />
            <share-two v-else theme="outline" size="24" class="text-blue-400" />
          </div>
          <div>
            <h2 class="text-xl font-black text-white uppercase tracking-tighter">
              {{ mode === 'mobile' ? $t('studio.drawers.guest.addMobileCam') : $t('studio.drawers.guest.inviteGuests') }}
            </h2>
            <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              {{ mode === 'mobile' ? $t('studio.drawers.guest.linkSecondaryDevice') : $t('studio.drawers.guest.connectAudience') }}
            </p>
          </div>
        </div>
        <button @click="isVisible = false" class="close-btn">
          <close theme="outline" size="20" />
        </button>
      </div>
    </template>

    <div class="p-8 space-y-10">
      <!-- Section: Join Link -->
      <section class="space-y-4">
        <div class="flex justify-between items-end">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">{{ $t('studio.drawers.guest.joinLink') }}</h4>
          <span class="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{{ $t('studio.drawers.guest.secureLink') }}</span>
        </div>
        <div class="relative group">
          <input type="text" readonly :value="activeLink"
            class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-32 text-sm font-mono text-white group-hover:border-blue-500/30 transition-all outline-none" />
          <button @click="copyLink"
            class="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            {{ copied ? $t('studio.common.copied') : $t('studio.common.copy') }}
          </button>
        </div>
      </section>

      <div class="grid grid-cols-2 gap-8">
        <!-- Section: QR Code -->
        <section class="space-y-4">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">{{ $t('studio.drawers.guest.scanToJoin') }}</h4>
          <div
            class="aspect-square bg-white rounded-3xl p-4 flex items-center justify-center shadow-2xl shadow-blue-500/10 group cursor-pointer border-4 border-white group-hover:scale-105 transition-all">
            <img :src="qrCodeUrl" class="w-full h-full object-contain" alt="Join QR Code" />
          </div>
          <p class="text-[9px] text-center text-white/30 font-bold">{{ $t('studio.drawers.guest.fastestForMobile') }}</p>
        </section>

        <!-- Section: Settings -->
        <section class="space-y-4">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">{{ $t('studio.drawers.guest.permissions') }}</h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">{{ $t('studio.drawers.guest.autoApprove') }}</span>
              <el-switch size="small" v-model="studioStore.guestPermissions.autoApprove" />
            </div>
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">{{ $t('studio.drawers.guest.micEnabled') }}</span>
              <el-switch size="small" v-model="studioStore.guestPermissions.micEnabled" />
            </div>
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-white/60">{{ $t('studio.drawers.guest.camEnabled') }}</span>
              <el-switch size="small" v-model="studioStore.guestPermissions.camEnabled" />
            </div>
          </div>
        </section>
      </div>

      <!-- Section: Waiting Room -->
      <section v-if="waitingGuests.length > 0" class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">{{ $t('studio.drawers.guest.waitingRoom', { n: waitingGuests.length }) }}
        </h4>
        <div class="space-y-3">
          <div v-for="guest in waitingGuests" :key="guest.uuid"
            class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div class="flex items-center gap-4">
              <el-avatar :src="guest.avatar" :size="32">
                <user theme="outline" />
              </el-avatar>
              <div>
                <p class="text-xs font-black text-white">{{ guest.name }}</p>
                <p class="text-[9px] font-bold text-blue-400 uppercase">{{ $t('studio.drawers.guest.knocking') }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="approveGuest(guest.uuid)"
                class="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-400 transition-all">{{ $t('studio.common.approve') }}</button>
              <button @click="rejectGuest(guest.uuid)"
                class="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition-all">{{ $t('studio.common.reject') }}</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="text-center pb-6">
        <p class="text-[10px] text-white/20 font-bold">{{ $t('studio.drawers.guest.guestLimitInfo') }}</p>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ShareTwo, Close, User, Iphone } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  modelValue: boolean;
  mode?: 'invite' | 'mobile';
  customLink?: string | null;
}>(), {
  mode: 'invite',
  customLink: null
});

const emit = defineEmits(['update:modelValue']);

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const studioStore = useStudioStore();
const copied = ref(false);
const { guestJoinLink } = storeToRefs(studioStore);

const activeLink = computed(() => props.customLink || guestJoinLink.value || t('studio.drawers.guest.generatingUrl'));
const waitingGuests = computed(() => studioStore.waitingGuests);

const qrCodeUrl = computed(() => {
  if (!activeLink.value || activeLink.value === t('studio.drawers.guest.generatingUrl')){
    studioStore.generateInvite(studioStore.currentSessionId);
    return '';
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeLink.value)}`;
});

const copyLink = () => {
  if (activeLink.value) {
    navigator.clipboard.writeText(activeLink.value);
    copied.value = true;
    toast.success(t('studio.drawers.guest.linkCopied'));
    setTimeout(() => (copied.value = false), 2000);
  }
};

const approveGuest = (id: string) => {
  studioStore.approveGuest(id);
  studioStore.broadcastCurrentState();
  toast.success(t('studio.drawers.guest.guestApproved'));
};

const rejectGuest = (id: string) => {
  studioStore.rejectGuest(id);
  toast.info(t('studio.drawers.guest.invitationRejected'));
};

onMounted(() => {
  console.log("onMounted", props.mode);
  if (props.mode === 'invite' && !guestJoinLink.value && studioStore.currentSessionId) {
    studioStore.generateInvite(studioStore.currentSessionId);
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
