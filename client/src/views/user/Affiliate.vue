<template>
  <div class="affiliate-dashboard p-6 animate-in">
    <header class="page-header flex justify-between items-start mb-8">
       <div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-2">{{ t('affiliate.title') }}</h1>
          <p class="text-gray-400">{{ t('affiliate.subtitle', { appName: uiStore.appName }) }}</p>
       </div>
       <div v-if="affiliate" class="status-badge px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <span class="text-[10px] font-black uppercase text-green-400">{{ t('affiliate.partnerBadge', { status: affiliate.status }) }}</span>
       </div>
    </header>

    <div v-if="!affiliate" class="onboarding-gate max-w-2xl mx-auto text-center py-20 bg-white/5 rounded-3xl border border-white/10">
       <div class="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
          <peoples size="40" />
       </div>
       <h2 class="text-2xl font-black mb-4">{{ t('affiliate.join.title', { appName: uiStore.appName }) }}</h2>
       <p class="text-gray-400 mb-8 px-12">{{ t('affiliate.join.desc') }}</p>
       <button class="primary-btn px-12 py-4 text-sm font-black" @click="joinProgram">{{ t('affiliate.join.button') }}</button>
    </div>

    <div v-else class="grid grid-cols-12 gap-6">
       <!-- Stat Row -->
       <div class="col-span-12 grid grid-cols-4 gap-6 mb-4">
          <div v-for="stat in statCards" :key="stat.key" class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
             <div class="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
             <p class="text-[10px] font-black uppercase opacity-40 mb-2">{{ t('affiliate.stats.' + stat.key) }}</p>
             <p class="text-2xl font-black text-white">{{ stat.value }}</p>
          </div>
       </div>

       <!-- Left: Referral Engine -->
       <div class="col-span-12 lg:col-span-8 space-y-6">
          <section class="glass-card p-8 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <share-two theme="outline" /> {{ t('affiliate.engine.title') }}
             </h3>
             <div class="space-y-6">
                <div class="link-box p-4 bg-black/40 border border-white/10 rounded-xl flex items-center gap-4">
                   <div class="flex-1">
                      <p class="text-[10px] opacity-40 font-black mb-1">{{ t('affiliate.engine.linkTitle') }}</p>
                      <code class="text-blue-400 font-mono text-sm">{{ referralLink }}</code>
                   </div>
                   <button class="action-btn px-6 py-2 text-[10px] font-black" @click="copyLink">{{ t('affiliate.engine.copy') }}</button>
                </div>
                <div class="grid grid-cols-2 gap-4">
                   <div class="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2">{{ t('affiliate.engine.rate') }}</p>
                      <p class="text-lg font-bold">{{ affiliate.commissionRate }}% <span class="text-[10px] opacity-50">{{ t('affiliate.engine.recurring') }}</span></p>
                   </div>
                   <div class="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2">{{ t('affiliate.engine.cookie') }}</p>
                      <p class="text-lg font-bold">{{ t('affiliate.engine.days', { count: '30' }) }}</p>
                   </div>
                </div>
             </div>
          </section>

           <section class="glass-card p-6 rounded-2xl border border-white/5">
              <div class="flex justify-between items-center mb-6">
                 <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <history theme="outline" /> {{ t('affiliate.commissions.title') }}
                 </h3>
                 <button class="text-[10px] font-bold opacity-40 hover:opacity-100">{{ t('affiliate.commissions.viewAll') }}</button>
              </div>
              <div v-if="recentCommissions.length === 0" class="text-center py-8 opacity-40">
                 <p class="text-xs">{{ t('affiliate.commissions.empty') }}</p>
              </div>
              <div v-else class="space-y-2">
                 <div v-for="commission in recentCommissions" :key="commission.id" class="commission-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                       <div class="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center text-green-400"><check-one /></div>
                       <div>
                          <p class="text-xs font-bold">{{ commission.status === 'paid' ? t('affiliate.commissions.paid') : t('affiliate.commissions.approved') }}</p>
                          <p class="text-[10px] opacity-40">{{ t('affiliate.commissions.user') }}: {{ commission.referredUser }} • {{ formatDate(commission.convertedAt) }}</p>
                       </div>
                    </div>
                    <div class="text-right">
                       <p class="text-sm font-black text-green-400">+${{ commission.commission.toFixed(2) }}</p>
                       <p class="text-[8px] uppercase font-black opacity-30">{{ commission.status.toUpperCase() }}</p>
                    </div>
                 </div>
              </div>
           </section>
       </div>

       <!-- Right: Financials -->
       <div class="col-span-12 lg:col-span-4 space-y-6">
          <section class="glass-card p-8 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-transparent">
             <h3 class="text-[10px] font-black uppercase opacity-60 mb-6 tracking-widest text-center">{{ t('affiliate.wallet.title') }}</h3>
             <div class="text-center mb-8">
                <p class="text-4xl font-black text-white mb-2">{{ formatCurrency(affiliate.balance.unpaid) }}</p>
                <p class="text-[10px] font-black text-blue-400">{{ t('affiliate.wallet.available') }}</p>
             </div>
              <button class="primary-btn w-full py-4 text-xs font-black mb-4" @click="requestPayout" :disabled="!affiliate || affiliate.balance.unpaid <= 0">{{ t('affiliate.wallet.request') }}</button>
             <div class="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                <p class="text-[8px] opacity-40 font-black mb-1">{{ t('affiliate.wallet.lifetime') }}</p>
                <p class="text-lg font-black">{{ formatCurrency(affiliate.balance.totalEarned) }}</p>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">{{ t('affiliate.tips.title') }}</h3>
             <ul class="space-y-4">
                <li class="flex gap-3 items-start">
                   <div class="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0"><lightning size="12" /></div>
                   <p class="text-[10px] leading-relaxed opacity-60">{{ t('affiliate.tips.tip1') }}</p>
                </li>
                <li class="flex gap-3 items-start">
                   <div class="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0"><video-two size="12" /></div>
                   <p class="text-[10px] leading-relaxed opacity-60">{{ t('affiliate.tips.tip2', { appName: uiStore.appName }) }}</p>
                </li>
             </ul>
          </section>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useAffiliateStore } from '@/stores/affiliate';
import { Peoples, ShareTwo, History, CheckOne, Lightning, VideoTwo } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const uiStore = useUIStore();
const affiliateStore = useAffiliateStore();
const { affiliate, recentCommissions, loading } = storeToRefs(affiliateStore);

const referralLink = computed(() => `${uiStore.domain}/?ref=${affiliate.value?.referralCode}`);

const statCards = computed(() => [
  { key: 'traffic', value: formatLargeNumber(affiliate.value?.metrics.totalClicks || 0) },
  { key: 'conversions', value: formatLargeNumber(affiliate.value?.metrics.conversions || 0) },
  { key: 'revenue', value: formatCurrency(affiliate.value?.metrics.totalRevenueGenerated || 0) },
  { key: 'rate', value: affiliate.value?.metrics.totalClicks > 0 
    ? `${((affiliate.value?.metrics.conversions / affiliate.value?.metrics.totalClicks) * 100).toFixed(1)}%`
    : '0%' }
]);

const formatLargeNumber = (num: number) => {
    return new Intl.NumberFormat(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US');
};

const fetchAffiliateData = async () => {
    await affiliateStore.fetchDashboard();
};

const joinProgram = async () => {
    await affiliateStore.joinProgram();
};

const copyLink = () => {
    navigator.clipboard.writeText(referralLink.value);
    toast.success(t('affiliate.toasts.copySuccess'));
};

const requestPayout = async () => {
    if (!affiliate.value || affiliate.value.balance.unpaid <= 0) {
        toast.error(t('affiliate.toasts.noBalance'));
        return;
    }
    
    await affiliateStore.requestPayout(affiliate.value.balance.unpaid);
};

onMounted(() => {
    fetchAffiliateData();
});
</script>

<style lang="scss" scoped>
.glass-card {
    backdrop-filter: blur(20px);
}
</style>
