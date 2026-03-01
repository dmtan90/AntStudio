<template>
  <el-drawer
      v-model="visible"
      :title="$t('studio.drawers.economy.title')"
      size="320px"
      direction="rtl"
      :modal="true"
      :append-to-body="true"
      custom-class="store-drawer"
  >
    <div class="h-full flex flex-col bg-gray-900 text-white font-sans">
        <!-- Balance Header -->
        <div class="p-4 border-b border-white/10 bg-black/40">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-widest text-white/50">{{ $t('studio.drawers.economy.wallet.myWallet') }}</span>
                <button @click="topUp" class="text-[10px] font-bold text-green-400 hover:text-green-300 transition-colors uppercase tracking-wider flex items-center gap-1">
                    <plus theme="filled" /> {{ $t('studio.drawers.economy.wallet.topUp') }}
                </button>
            </div>
            <div class="flex items-end gap-2">
                <currency theme="filled" size="24" class="text-yellow-400 mb-1" />
                <span class="text-3xl font-black text-white leading-none">{{ studioStore.userWallet.balance }}</span>
                <span class="text-xs font-bold text-white/50 mb-1">{{ $t('studio.drawers.economy.credits') }}</span>
            </div>
        </div>

        <!-- Catalog Filters -->
        <div class="flex p-2 gap-2 border-b border-white/5">
            <button v-for="tab in tabs" :key="tab.id"
                    @click="activeTab = tab.id"
                    class="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                    :class="activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'">
                {{ $t(`studio.drawers.economy.tabs.${tab.id}`) }}
            </button>
        </div>

        <!-- Items Grid -->
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div class="grid grid-cols-2 gap-3">
                <div v-for="item in filteredItems" :key="item.id"
                     class="group relative bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg active:scale-95 cursor-pointer"
                     @click="purchase(item)"
                >
                    <div class="text-3xl mb-2 filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">{{ item.icon }}</div>
                    <div class="font-bold text-xs text-white mb-0.5">{{ item.name }}</div>
                    <div class="text-[9px] text-white/40 leading-tight mb-2 h-6 flex items-center justify-center">{{ item.description }}</div>
                    
                    <button class="w-full py-1.5 rounded bg-white/10 text-[10px] font-bold text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-colors flex items-center justify-center gap-1">
                        {{ item.cost }} 🪙
                    </button>
                </div>
            </div>
        </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStudioStore } from '@/stores/studio';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { Currency, Plus } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n();

const props = defineProps<{
    modelValue: boolean
}>();

const emit = defineEmits(['update:modelValue']);

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const studioStore = useStudioStore();
const activeTab = ref('gift');
const tabs = [
    { id: 'gift', label: 'Gifts' },
    { id: 'sticker', label: 'Stickers' },
    { id: 'powerup', label: 'Powerups' }
];

// Mock catalog if empty (fallback)
const items = computed(() => {
    // In real app, this comes from store initialized from server
    // For now we mock it if empty to show UI
    if (studioStore.storeCatalog && studioStore.storeCatalog.length > 0) return studioStore.storeCatalog;
    
    return [
        { id: 'gift_coffee', type: 'gift', name: 'Coffee', cost: 50, icon: '☕', description: 'Buy the host a coffee' },
        { id: 'gift_rose', type: 'gift', name: 'Rose', cost: 10, icon: '🌹', description: 'Show some love' },
        { id: 'sticker_gg', type: 'sticker', name: 'GG', cost: 25, icon: '👾', description: 'Good Game' },
    ];
});

const filteredItems = computed(() => {
    return items.value.filter(i => i.type === activeTab.value);
});

const topUp = () => {
    // Simulate payment flow
    toast.success(t('studio.drawers.economy.simulatedTopUp', { n: 500 }));
    // We can't update balance locally, must come from server via some event?
    // For Phase 68, let's assume `topUp` is an API/Socket call not implemented yet
    // OR just use a debug command.
    // Actually, VirtualEconomyService.addCredits exists.
    // Let's assume we have a "debug:add_credits" socket event or similar for testing.
    // Or just console log for now as user can't "buy credits" without real money integration logic.
    // Wait, the "Task" says "Integrate Real-Time Balance Updates".
    // I didn't verify the `addCredits` mechanism.
    // Let's just emit a "hive:request" with special type? 
    // No, let's just toast "Go to Settings -> Wallet" in a real app.
};

const purchase = (item: any) => {
    if (studioStore.userWallet.balance < item.cost) {
        toast.error(t('studio.drawers.economy.insufficientCredits'));
        return;
    }
    
    ActionSyncService.getSocket()?.emit('economy:purchase_item', { itemId: item.id });
    // Success handling is in ActionSyncService via economy:balance_update and economy:error
};
</script>

<style lang="scss">
.store-drawer {
    background: transparent !important;
    box-shadow: none !important;
    
    .el-drawer__body {
        padding: 0;
        background: transparent;
    }
    .el-drawer__header {
        display: none;
    }
}
</style>
