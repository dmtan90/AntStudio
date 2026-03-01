<template>
  <div class="subscription-page min-h-screen bg-[#0a0a0c] text-white font-outfit">
    <!-- Header Section -->
    <header class="relative py-16 px-8 overflow-hidden border-b border-white/5">
      <div class="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-transparent pointer-events-none"></div>
      
      <!-- Ambient Glows -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-green-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div class="absolute top-1/2 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] animate-pulse" style="animation-delay: 1s"></div>

      <div class="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <h1 class="text-6xl font-black mb-4 tracking-tighter leading-[0.9]">
            {{ t('subscription.manage') }} <br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500">
              {{ t('subscription.title') }}
            </span>
          </h1>
          <p class="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
             {{ t('subscription.subtitle') }}
          </p>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-12 px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <!-- Current Plan -->
        <div class="bg-black rounded-3xl p-1 relative group overflow-hidden border border-white/5 transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-green-900/10">
           <div class="bg-[#0f0f12] rounded-[20px] p-8 h-full flex flex-col relative z-10">
              <div class="flex justify-between items-start mb-8">
                 <div>
                    <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('subscription.currentPlan') }}</div>
                    <div class="text-5xl font-black text-white uppercase tracking-tight">{{ t('subscription.plans.' + (user?.subscription?.plan?.toLowerCase() || 'free')) }}</div>
                 </div>
                 <div class="px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest"
                    :class="user?.subscription?.status === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
                    {{ t('subscription.' + (user?.subscription?.status || 'active')) }}
                 </div>
              </div>

              <div class="flex-1">
                 <div v-if="user?.subscription?.endDate" class="mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{{ t('subscription.renewalDate') }}</div>
                    <div class="text-lg font-bold text-white">{{ formatDate(user.subscription.endDate) }}</div>
                 </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mt-auto">
                 <button 
                    @click="showUpgradeDialog" 
                    class="py-4 bg-white text-black rounded-xl font-black uppercase text-xs hover:bg-gray-100 transition-colors shadow-lg shadow-white/5"
                 >
                    {{ t('subscription.upgrade') }}
                 </button>
                 <button 
                    v-if="user?.subscription?.plan && user.subscription.plan !== 'free'"
                    class="py-4 bg-white/5 text-white rounded-xl font-black uppercase text-xs hover:bg-white/10 hover:text-red-400 transition-colors border border-white/5"
                 >
                    {{ t('subscription.cancel') }}
                 </button>
              </div>
           </div>
        </div>

        <!-- Credits Overview -->
        <div class="bg-black rounded-3xl p-1 relative group overflow-hidden border border-white/5 transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-blue-900/10">
           <div class="bg-[#0f0f12] rounded-[20px] p-8 h-full flex flex-col relative z-10">
              <div class="flex justify-between items-center mb-8">
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('subscription.creditsBalance') }}</div>
                 <button 
                    @click="showBuyCreditsDialog"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20"
                 >
                    {{ t('subscription.topUp') }}
                 </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div>
                    <div class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-2">{{ user?.credits?.balance || 0 }}</div>
                    <div class="text-xs font-bold text-gray-500 uppercase tracking-wide">{{ t('subscription.available') }}</div>
                 </div>
                 <div class="flex flex-col justify-end">
                    <div class="text-2xl font-black text-white mb-2">{{ creditsConsumedThisMonth }}</div>
                    <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{{ t('subscription.usedThisMonth') }}</div>
                    <div class="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div class="h-full bg-blue-500 rounded-full transition-all duration-1000" :style="{ width: `${creditUsagePercent}%` }"></div>
                    </div>
                 </div>
              </div>

              <div class="grid grid-cols-3 gap-4 mt-auto pt-8 border-t border-white/5">
                 <div class="text-center">
                    <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{{ t('subscription.planLimit') }}</div>
                    <div class="text-lg font-black text-white">{{ user?.credits?.membership || 0 }}</div>
                 </div>
                 <div class="text-center border-l border-white/5">
                    <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{{ t('subscription.bonus') }}</div>
                    <div class="text-lg font-black text-white">{{ user?.credits?.bonus || 0 }}</div>
                 </div>
                 <div class="text-center border-l border-white/5">
                    <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{{ t('subscription.weekly') }}</div>
                    <div class="text-lg font-black text-white">{{ user?.credits?.weekly || 0 }}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Billing History -->
      <div>
         <h2 class="text-2xl font-black mb-8 flex items-center gap-3">
            <span class="w-1.5 h-8 bg-blue-500 rounded-full"></span>
            {{ t('subscription.billingHistory') }}
         </h2>

         <div class="bg-white/5 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-sm">
            <div class="overflow-x-auto">
               <table class="w-full text-left">
                  <thead>
                     <tr class="border-b border-white/5">
                        <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('subscription.date') }}</th>
                        <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('subscription.plan') }}</th>
                        <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('subscription.amount') }}</th>
                        <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">{{ t('subscription.status') }}</th>
                     </tr>
                  </thead>
                  <tbody v-if="payments.length">
                     <tr v-for="payment in payments" :key="payment.id" class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td class="px-8 py-6 font-bold text-sm text-gray-300">{{ formatDate(payment.createdAt) }}</td>
                        <td class="px-8 py-6 font-bold text-white uppercase">{{ payment.plan }}</td>
                        <td class="px-8 py-6 font-mono font-bold text-gray-300">${{ payment.amount }} {{ payment.currency?.toUpperCase() }}</td>
                        <td class="px-8 py-6 text-right">
                           <span class="inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border"
                              :class="payment.status === 'completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
                              {{ t('common.' + (payment.status || 'completed')) }}
                           </span>
                        </td>
                     </tr>
                  </tbody>
                  <tbody v-else>
                     <tr>
                        <td colspan="4" class="px-8 py-16 text-center text-gray-500 font-medium">{{ t('subscription.noHistory') }}</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </main>

    <!-- Dialogs -->
    <SubscriptionPlansDialog v-model="subscriptionDialogVisible" @select="handlePlanSelection" />
    <BuyCreditsDialog v-model="buyCreditsDialogVisible" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import SubscriptionPlansDialog from '@/components/subscription/SubscriptionPlansDialog.vue';
import BuyCreditsDialog from '@/components/subscription/BuyCreditsDialog.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const payments = ref<any[]>([]);
const subscriptionDialogVisible = ref(false);
const buyCreditsDialogVisible = ref(false);

const fetchData = async () => {
  try {
    await userStore.fetchProfile();
    payments.value = await userStore.fetchPaymentHistory();
  } catch (error: any) {
    toast.error(error.response?.data?.message || t('subscription.toasts.loadFailed'));
  }
};

const formatDate = (d: any) => new Date(d).toLocaleDateString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US')

const creditsConsumedThisMonth = computed(() => {
  if (!user.value?.creditLogs) return 0;
  const now = new Date();
  const thisMonth = user.value.creditLogs.filter((log: any) => {
    const logDate = new Date(log.timestamp);
    return log.type === 'consumed' &&
      logDate.getMonth() === now.getMonth() &&
      logDate.getFullYear() === now.getFullYear();
  });
  return thisMonth.reduce((sum: number, log: any) => sum + log.amount, 0);
});

const creditUsagePercent = computed(() => {
  const total = (user.value?.credits?.balance || 0) + (creditsConsumedThisMonth.value || 0);
  if (total === 0) return 0;
  return Math.min((creditsConsumedThisMonth.value / total) * 100, 100);
});

const showUpgradeDialog = () => subscriptionDialogVisible.value = true;
const showBuyCreditsDialog = () => buyCreditsDialogVisible.value = true;

const handlePlanSelection = (data: any) => {
  subscriptionDialogVisible.value = false;
  fetchData();
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
