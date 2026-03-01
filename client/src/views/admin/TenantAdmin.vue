<template>
  <div class="tenant-admin p-6 animate-in">
    <header class="page-header flex justify-between items-start mb-8">
       <div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-2">{{ t('admin.tenant.title') }}</h1>
          <p class="text-gray-400">{{ t('admin.tenant.subtitle') }}</p>
       </div>
       <div v-if="tenant" class="license-badge px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
          <span class="text-[10px] font-black uppercase text-blue-400">{{ t('admin.tenant.licenseBadge', { type: tenant.license.type }) }}</span>
       </div>
    </header>

    <div v-if="tenant" class="grid grid-cols-12 gap-6">
       <!-- Left Rail: Configuration -->
       <div class="col-span-8 space-y-6">
          
          <!-- Section: Branding -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <magic theme="outline" /> {{ t('admin.tenant.branding.title') }}
             </h3>
             <div class="grid grid-cols-2 gap-8">
                <div class="space-y-4">
                   <div class="form-group">
                      <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.branding.companyName') }}</label>
                      <el-input v-model="tenant.branding.companyName" :placeholder="t('admin.tenant.branding.placeholderCompanyName')" class="glass-input" />
                   </div>
                   <div class="form-group">
                      <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.branding.primaryColor') }}</label>
                      <div class="flex gap-3">
                         <el-color-picker v-model="tenant.branding.primaryColor" />
                         <el-input v-model="tenant.branding.primaryColor" size="small" class="w-32" />
                      </div>
                   </div>
                </div>
                <div class="logo-preview-box bg-black/40 rounded-xl p-8 border border-dashed border-white/10 text-center">
                   <img v-if="tenant.branding.logo" :src="tenant.branding.logo" class="max-h-16 mx-auto mb-4" />
                   <div v-else class="w-16 h-16 bg-white/5 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <camera-five size="24" class="opacity-20" />
                   </div>
                   <p class="text-[10px] opacity-40 mb-4">{{ t('admin.tenant.branding.logoHint') }}</p>
                   <button class="action-btn px-4 py-2 text-[10px] font-black">{{ t('admin.tenant.branding.uploadLogo') }}</button>
                </div>
             </div>
          </section>

          <!-- Section: Deployment Mode -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <setting-two theme="outline" /> {{ t('admin.tenant.deployment.title') }}
                </h3>
                <el-radio-group v-model="tenant.deployment.mode" size="small">
                   <el-radio-button value="internal">{{ t('admin.tenant.deployment.internal') }}</el-radio-button>
                   <el-radio-button value="public">{{ t('admin.tenant.deployment.public') }}</el-radio-button>
                </el-radio-group>
             </div>
             
             <div v-if="tenant.deployment.mode === 'internal'" class="mode-desc p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                <p class="text-xs text-blue-200">
                   <strong>{{ t('admin.tenant.deployment.internalModeActive') }}</strong> 
                   {{ t('admin.tenant.deployment.internalModeDesc') }}
                </p>
             </div>
             <div v-else class="mode-desc p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                <p class="text-xs text-purple-200">
                   <strong>{{ t('admin.tenant.deployment.publicModeActive') }}</strong> 
                   {{ t('admin.tenant.deployment.publicModeDesc') }}
                </p>
             </div>
          </section>

          <!-- Section: Credit Refresh Logic (Visible if Reseller or configured) -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <chart-histogram theme="outline" /> {{ t('admin.tenant.credits.title') }}
             </h3>
             <div class="grid grid-cols-3 gap-4">
                <div v-for="tier in ['free', 'pro', 'enterprise']" :key="tier" class="p-4 bg-white/5 rounded-xl border border-white/5">
                   <p class="text-[10px] font-black uppercase opacity-40 mb-3 text-center">{{ t('admin.tenant.credits.tierLabel', { tier: tier.toUpperCase() }) }}</p>
                   <div class="flex items-center gap-2 justify-center">
                      <el-input-number v-model="tenant.resaleConfig.credits[tier]" size="small" class="w-full" />
                   </div>
                   <p class="text-[8px] opacity-30 text-center mt-2">{{ t('admin.tenant.credits.perMonth') }}</p>
                </div>
             </div>
             <div class="mt-6 flex items-center gap-4 border-t border-white/5 pt-6">
                <div class="flex-1">
                   <h4 class="text-xs font-bold mb-1">{{ t('admin.tenant.credits.autoRefreshTitle') }}</h4>
                   <p class="text-[10px] opacity-40">{{ t('admin.tenant.credits.autoRefreshDesc', { day: tenant.resaleConfig.refreshDay }) }}</p>
                </div>
                <el-input-number v-model="tenant.resaleConfig.refreshDay" :min="1" :max="28" size="small" />
             </div>
          </section>
       </div>

       <!-- Right Rail: License & Stats -->
       <div class="col-span-4 space-y-6">
          <section class="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent">
             <h3 class="text-xs font-black mb-4 opacity-50">{{ t('admin.tenant.contract.title') }}</h3>
             <div class="space-y-4">
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">{{ t('admin.tenant.contract.status') }}</span>
                   <span class="text-[10px] font-bold text-green-400">{{ t('admin.tenant.contract.active') }}</span>
                </div>
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">{{ t('admin.tenant.contract.renewsOn') }}</span>
                   <span class="text-[10px] font-bold">{{ t('admin.tenant.contract.renewsOnDate') }}</span>
                </div>
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">{{ t('admin.tenant.contract.seatCapacity') }}</span>
                   <span class="text-[10px] font-bold">{{ tenant.usage.totalUsers }} / {{ tenant.license.maxSeats }}</span>
                </div>
                <el-progress :percentage="(tenant.usage.totalUsers / tenant.license.maxSeats) * 100" :show-text="false" class="mb-6" />
                <div class="flex flex-col gap-2">
                   <button class="secondary-btn w-full text-[10px] py-2">{{ t('admin.tenant.contract.manageSeats') }}</button>
                   <button v-if="tenant.license.type !== 'perpetual'" class="action-btn w-full text-[10px] py-3 bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30" @click="upgradePerpetual">
                      <Diamond size="12" class="inline mr-1" /> {{ t('admin.tenant.contract.upgradePerpetual') }}
                   </button>
                </div>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-green-600/10 to-transparent">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">{{ t('admin.tenant.support.title') }}</h3>
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><phone-one size="20" /></div>
                <div>
                   <p class="text-[10px] font-bold">{{ t('admin.tenant.support.vipLineActive') }}</p>
                   <p class="text-[8px] opacity-40">{{ t('admin.tenant.support.managerConnected') }}</p>
                </div>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50">{{ t('admin.tenant.payment.title') }}</h3>
             <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><share-two size="20" /></div>
                <div class="flex-1">
                   <p class="text-xs font-bold">{{ t('admin.tenant.payment.stripeConnect') }}</p>
                   <p class="text-[8px] opacity-40">{{ t('admin.tenant.payment.connectedTo', { appName: uiStore.appName }) }}</p>
                </div>
                <check-one class="text-green-500" />
             </div>
             <button class="action-btn w-full text-[10px] py-2">{{ t('admin.tenant.payment.configureCustom') }}</button>
          </section>
          <!-- Section: Multi-Tier B2B (Conditional) -->
          
          <!-- Case A: Master Enterprise (Managed Clients) -->
          <section v-if="tenant.tenantType === 'master'" class="glass-card p-6 rounded-2xl border border-white/5">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <peoples size="18" /> {{ t('admin.tenant.managedSubs.title') }}
                </h3>
                <button class="action-btn px-4 py-2 text-[10px] font-black" @click="showAddSub = true">{{ t('admin.tenant.managedSubs.onboard') }}</button>
             </div>
             <div class="space-y-3">
                <div v-for="sub in managedSubs" :key="sub.id" class="sub-tenant-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                   <div>
                      <p class="text-xs font-bold">{{ sub.name }}</p>
                      <p class="text-[8px] opacity-40 uppercase">{{ sub.subdomain }}.antstudio.ai • {{ t('admin.tenant.managedSubs.verifiedSubdomain') }}</p>
                   </div>
                   <div class="flex items-center gap-6">
                      <div class="text-right">
                         <p class="text-[10px] font-bold">{{ sub.pool.used }} / {{ sub.pool.total }}</p>
                         <p class="text-[8px] opacity-40 uppercase">{{ t('admin.tenant.managedSubs.creditsConsumed') }}</p>
                      </div>
                      <button class="secondary-btn p-2 rounded-lg"><setting-one size="14" /></button>
                   </div>
                </div>
             </div>
          </section>

          <!-- Case B: Sub-Enterprise (Team Management & Org Pool) -->
          <section v-if="tenant.tenantType === 'sub'" class="glass-card p-6 rounded-2xl border border-white/5">
             <header class="mb-8 border-b border-white/5 pb-6">
                <h3 class="text-xs font-black uppercase tracking-widest mb-4 opacity-50">{{ t('admin.tenant.orgPool.title') }}</h3>
                <div class="org-pool-hud grid grid-cols-2 gap-6">
                   <div class="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                      <p class="text-[10px] font-black text-blue-400 mb-2 uppercase">{{ t('admin.tenant.orgPool.remainingCredits') }}</p>
                      <p class="text-2xl font-black">{{ tenant.organizationPool.total - tenant.organizationPool.used }}</p>
                   </div>
                   <div class="p-6 bg-white/5 rounded-2xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2 uppercase">{{ t('admin.tenant.orgPool.nextRefill') }}</p>
                      <p class="text-2xl font-black">5,000 <span class="text-xs opacity-30">{{ t('admin.tenant.orgPool.credits') }}</span></p>
                   </div>
                </div>
             </header>

             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <peoples size="18" /> {{ t('admin.tenant.team.title') }}
                </h3>
                <button class="action-btn px-4 py-2 text-[10px] font-black">{{ t('admin.tenant.team.invite') }}</button>
             </div>
             
             <div class="space-y-2">
                <div v-for="user in teamMembers" :key="user.id" class="user-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                   <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400">{{ user.name.charAt(0) }}</div>
                      <div>
                         <p class="text-xs font-bold">{{ user.name }}</p>
                         <p class="text-[8px] opacity-40">{{ user.email }} • {{ user.role }}</p>
                      </div>
                   </div>
                   <span class="text-[10px] font-bold opacity-30">{{ t('admin.tenant.team.minUsed', { n: user.usage }) }}</span>
                </div>
             </div>
          </section>
       </div>
    </div>

    <!-- Provisioning Dialog -->
    <el-dialog v-model="showProvision" :title="t('admin.tenant.provision.title')" width="400px" custom-class="glass-dialog">
       <div class="space-y-4">
          <div class="form-group">
             <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.provision.workEmail') }}</label>
             <el-input v-model="provisionForm.email" :placeholder="t('admin.tenant.provision.placeholderEmail')" class="glass-input" />
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div class="form-group">
                <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.provision.firstName') }}</label>
                <el-input v-model="provisionForm.firstName" class="glass-input" />
             </div>
             <div class="form-group">
                <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.provision.lastName') }}</label>
                <el-input v-model="provisionForm.lastName" class="glass-input" />
             </div>
          </div>
          <div class="form-group">
             <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">{{ t('admin.tenant.provision.accessLevel') }}</label>
             <el-select v-model="provisionForm.role" class="w-full">
                <el-option :label="t('admin.tenant.provision.roles.admin')" value="admin" />
                <el-option :label="t('admin.tenant.provision.roles.editor')" value="editor" />
                <el-option :label="t('admin.tenant.provision.roles.viewer')" value="viewer" />
             </el-select>
          </div>
       </div>
       <template #footer>
          <div class="flex justify-end gap-3 px-4 pb-4">
             <button class="secondary-btn text-[10px] px-4 py-2" @click="showProvision = false">{{ t('admin.tenant.provision.cancel') }}</button>
             <button class="primary-btn text-[10px] px-6 py-2" @click="confirmProvision">{{ t('admin.tenant.provision.confirm') }}</button>
          </div>
       </template>
    </el-dialog>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">{{ t('admin.tenant.consumption.title') }}</h3>
             <div class="space-y-4">
                <div v-for="svc in [t('admin.tenant.consumption.services.streaming'), t('admin.tenant.consumption.services.audio'), t('admin.tenant.consumption.services.visuals')]" :key="svc" class="usage-item">
                   <div class="flex justify-between text-[10px] mb-2">
                      <span class="opacity-50">{{ svc }}</span>
                      <span>{{ t('admin.tenant.consumption.quota', { n: Math.floor(Math.random() * 80) }) }}</span>
                   </div>
                   <el-progress :percentage="Math.floor(Math.random() * 80)" :show-text="false" :stroke-width="4" />
                </div>
             </div>
          </section>
     
     <footer class="mt-8 flex justify-end gap-3">
       <button class="secondary-btn px-6 py-2 text-xs">{{ t('admin.tenant.footer.cancel') }}</button>
       <button class="primary-btn px-8 py-2 text-xs" @click="saveConfig">{{ t('admin.tenant.footer.save') }}</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui';
import { 
  BuildingTwo, SettingTwo, Lightning, Tool, 
  Switch, Close, Save, Edit, CameraFive,
  Shield, Key, LinkOne, ChartHistogram, ShareTwo, CheckOne, Diamond, PhoneOne, Peoples, SettingOne, Magic
} from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n()
const uiStore = useUIStore();

// Mock Tenant Data
const tenant = ref<any>({
  name: uiStore.appName,
  tenantType: 'master', // 'master' or 'sub'
  branding: { companyName: uiStore.appName, primaryColor: '#3b82f6', logo: '' },
  deployment: { mode: 'public' },
  license: { type: 'enterprise', maxSeats: 500, features: ['all'] },
  usage: { totalUsers: 142 },
  resaleConfig: {
    refreshDay: 1,
    credits: { free: 10, pro: 100, enterprise: 1000 }
  },
  organizationPool: { total: 50000, used: 12400, monthlyAllocation: 50000 }
});

// Mock Specialized Data
const managedSubs = ref([
  { id: 1, name: 'Acme India', subdomain: 'acme-in', pool: { total: 5000, used: 1200 } },
  { id: 2, name: 'Cloud Seven', subdomain: 'cloud7', pool: { total: 10000, used: 8400 } }
]);

const teamMembers = ref([
  { id: 1, name: 'Sarah Connor', email: 'sarah@future.io', role: 'Marketing Lead', usage: 124 },
  { id: 2, name: 'John Doe', email: 'john@future.io', role: 'Stream Op', usage: 45 }
]);

const showProvision = ref(false);
const provisionForm = ref({ email: '', firstName: '', lastName: '', role: 'editor' });

const showAddSub = ref(false);
const addSubForm = ref({ name: '', subdomain: '', adminEmail: '', initialCredits: 5000 });

const confirmAddSub = () => {
    toast.success(t('admin.tenant.toasts.onboardingInitiated', { name: addSubForm.value.name }));
    showAddSub.value = false;
    // In real app, call POST /api/sub-tenant/create
};

const confirmProvision = () => {
    toast.success(t('admin.tenant.toasts.accountProvisioned', { email: provisionForm.value.email }));
    showProvision.value = false;
    // In real app, call POST /api/sub-tenant/team/provision
};

const saveConfig = () => {
    toast.success(t('admin.tenant.toasts.configUpdated'));
};

const upgradePerpetual = () => {
    toast.info(t('admin.tenant.toasts.perpetualCheckout'));
    // Logic to call POST /api/payment/create-checkout with licenseType: 'perpetual'
    window.open('https://checkout.stripe.com/demo', '_blank');
};
</script>

<style lang="scss" scoped>
.glass-input {
  :deep(.el-input__wrapper) {
    background: rgba(255,255,255,0.03) !important;
    box-shadow: none !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
  }
}
</style>
