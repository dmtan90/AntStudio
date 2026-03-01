<template>
  <el-dialog 
    :model-value="modelValue" 
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="t('studio.tabs.platforms')" 
    width="450px" 
    class="glass-dialog"
  >
    <div class="platform-list">
      <div v-for="acc in availableAccounts" :key="acc._id" class="p-row glass-selectable"
           :class="{ selected: selectedPlatforms.includes(acc._id) }" @click="togglePlatform(acc._id)">
        <div class="p-info">
          <youtube v-if="acc.platform === 'youtube'" theme="filled" class="youtube text-red-500" />
          <facebook v-else-if="acc.platform === 'facebook'" theme="filled" class="facebook text-blue-500" />
          <tiktok v-else-if="acc.platform === 'tiktok'" theme="filled" class="tiktok text-white" />
          <broadcast v-else theme="filled" class="ams text-blue-400" />
          <span class="font-bold opacity-80">{{ acc.accountName }}</span>
        </div>
        <div v-if="selectedPlatforms.includes(acc._id)" class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]"></div>
      </div>
    </div>
    <template #footer>
      <button class="primary-btn w-full" @click="$emit('update:modelValue', false)">
        {{ t('common.save') }}
      </button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Youtube, Facebook, Tiktok, Broadcast } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean;
  availableAccounts: any[];
  selectedPlatforms: string[];
}>();

const emit = defineEmits(['update:modelValue', 'toggle-platform']);

const togglePlatform = (id: string) => {
  emit('toggle-platform', id);
};
</script>

<style lang="postcss" scoped>
.platform-list {
  @apply space-y-2;
}
.p-row {
  @apply flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer transition-all hover:bg-white/10;
}
.p-row.selected {
  @apply border-blue-500/50 bg-blue-500/10;
}
.p-info {
  @apply flex items-center gap-3 text-sm;
}
</style>
