<template>
  <div class="tenant-admin p-6 animate-in">
    <header class="page-header flex justify-between items-start mb-8">
       <div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-2">Tenant Administration</h1>
          <p class="text-gray-400">Manage your white-label platform configuration and licensing.</p>
       </div>
       <div v-if="tenant" class="license-badge px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
          <span class="text-[10px] font-black uppercase text-blue-400">{{ tenant.license.type }} LICENSE</span>
       </div>
    </header>

    <div v-if="tenant" class="grid grid-cols-12 gap-6">
       <!-- Left Rail: Configuration -->
       <div class="col-span-8 space-y-6">
          
          <!-- Section: Branding -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <magic theme="outline" /> White-Label Branding
             </h3>
             <div class="grid grid-cols-2 gap-8">
                <div class="space-y-4">
                   <div class="form-group">
                      <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">Company Name</label>
                      <el-input v-model="tenant.branding.companyName" placeholder="e.g. Acme Media" class="glass-input" />
                   </div>
                   <div class="form-group">
                      <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">Primary Identity Color</label>
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
                   <p class="text-[10px] opacity-40 mb-4">Recommended: PNG 512x512</p>
                   <button class="action-btn px-4 py-2 text-[10px] font-black">UPLOAD LOGO</button>
                </div>
             </div>
          </section>

          <!-- Section: Deployment Mode -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <setting-two theme="outline" /> Deployment Strategy
                </h3>
                <el-radio-group v-model="tenant.deployment.mode" size="small">
                   <el-radio-button value="internal">Internal Only</el-radio-button>
                   <el-radio-button value="public">Public Reseller</el-radio-button>
                </el-radio-group>
             </div>
             
             <div v-if="tenant.deployment.mode === 'internal'" class="mode-desc p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                <p class="text-xs text-blue-200">
                   <strong>Internal Mode Active:</strong> Only users with specific email domains can join. 
                   All users will bypass billing and share the organization's enterprise features.
                </p>
             </div>
             <div v-else class="mode-desc p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                <p class="text-xs text-purple-200">
                   <strong>Public Reseller Mode Active:</strong> Open registration is allowed. 
                   End-users must subscribe to your tiers and will consume monthly credits.
                </p>
             </div>
          </section>

          <!-- Section: Credit Refresh Logic (Visible if Reseller or configured) -->
          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <chart-histogram theme="outline" /> Monthly Credit Refresh
             </h3>
             <div class="grid grid-cols-3 gap-4">
                <div v-for="tier in ['free', 'pro', 'enterprise']" :key="tier" class="p-4 bg-white/5 rounded-xl border border-white/5">
                   <p class="text-[10px] font-black uppercase opacity-40 mb-3 text-center">{{ tier }} Tier</p>
                   <div class="flex items-center gap-2 justify-center">
                      <el-input-number v-model="tenant.resaleConfig.credits[tier]" size="small" class="w-full" />
                   </div>
                   <p class="text-[8px] opacity-30 text-center mt-2">Credits / Month</p>
                </div>
             </div>
             <div class="mt-6 flex items-center gap-4 border-t border-white/5 pt-6">
                <div class="flex-1">
                   <h4 class="text-xs font-bold mb-1">Auto-Refresh Schedule</h4>
                   <p class="text-[10px] opacity-40">Credits will reset to these values on Day {{ tenant.resaleConfig.refreshDay }} of every month.</p>
                </div>
                <el-input-number v-model="tenant.resaleConfig.refreshDay" :min="1" :max="28" size="small" />
             </div>
          </section>
       </div>

       <!-- Right Rail: License & Stats -->
       <div class="col-span-4 space-y-6">
          <section class="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent">
             <h3 class="text-xs font-black mb-4 opacity-50">CONTRACT SUMMARY</h3>
             <div class="space-y-4">
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">License Status</span>
                   <span class="text-[10px] font-bold text-green-400">ACTIVE</span>
                </div>
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">Renews On</span>
                   <span class="text-[10px] font-bold">12 Mar 2026</span>
                </div>
                <div class="flex justify-between">
                   <span class="text-[10px] opacity-40">Seat Capacity</span>
                   <span class="text-[10px] font-bold">{{ tenant.usage.totalUsers }} / {{ tenant.license.maxSeats }}</span>
                </div>
                <el-progress :percentage="(tenant.usage.totalUsers / tenant.license.maxSeats) * 100" :show-text="false" class="mb-6" />
                <div class="flex flex-col gap-2">
                   <button class="secondary-btn w-full text-[10px] py-2">MANAGE SEATS</button>
                   <button v-if="tenant.license.type !== 'perpetual'" class="action-btn w-full text-[10px] py-3 bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30" @click="upgradePerpetual">
                      <Diamond size="12" class="inline mr-1" /> UPGRADE TO PERPETUAL
                   </button>
                </div>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-green-600/10 to-transparent">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">Enterprise Support</h3>
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><phone-one size="20" /></div>
                <div>
                   <p class="text-[10px] font-bold">24/7 VIP Line Active</p>
                   <p class="text-[8px] opacity-40">Connected to dedicated manager</p>
                </div>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50">PAYMENT INTEGRATION</h3>
             <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><share-two size="20" /></div>
                <div class="flex-1">
                   <p class="text-xs font-bold">Stripe Connect</p>
                   <p class="text-[8px] opacity-40">Connected to {{ uiStore.appName }} Shared Gateway</p>
                </div>
                <check-one class="text-green-500" />
             </div>
             <button class="action-btn w-full text-[10px] py-2">CONFIGURE CUSTOM GATEWAY</button>
          </section>
          <!-- Section: Multi-Tier B2B (Conditional) -->
          
          <!-- Case A: Master Enterprise (Managed Clients) -->
          <section v-if="tenant.tenantType === 'master'" class="glass-card p-6 rounded-2xl border border-white/5">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <peoples size="18" /> Managed Sub-Enterprises
                </h3>
                <button class="action-btn px-4 py-2 text-[10px] font-black" @click="showAddSub = true">+ ONBOARD NEW CLIENT</button>
             </div>
             <div class="space-y-3">
                <div v-for="sub in managedSubs" :key="sub.id" class="sub-tenant-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                   <div>
                      <p class="text-xs font-bold">{{ sub.name }}</p>
                      <p class="text-[8px] opacity-40 uppercase">{{ sub.subdomain }}.antstudio.ai</p>
                   </div>
                   <div class="flex items-center gap-6">
                      <div class="text-right">
                         <p class="text-[10px] font-bold">{{ sub.pool.used }} / {{ sub.pool.total }}</p>
                         <p class="text-[8px] opacity-40 uppercase">Credits Consumed</p>
                      </div>
                      <button class="secondary-btn p-2 rounded-lg"><setting-one size="14" /></button>
                   </div>
                </div>
             </div>
          </section>

          <!-- Case B: Sub-Enterprise (Team Management & Org Pool) -->
          <section v-if="tenant.tenantType === 'sub'" class="glass-card p-6 rounded-2xl border border-white/5">
             <header class="mb-8 border-b border-white/5 pb-6">
                <h3 class="text-xs font-black uppercase tracking-widest mb-4 opacity-50">Corporate Resource Pool</h3>
                <div class="org-pool-hud grid grid-cols-2 gap-6">
                   <div class="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                      <p class="text-[10px] font-black text-blue-400 mb-2 uppercase">Company Remaining Credits</p>
                      <p class="text-2xl font-black">{{ tenant.organizationPool.total - tenant.organizationPool.used }}</p>
                   </div>
                   <div class="p-6 bg-white/5 rounded-2xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2 uppercase">Next Monthly Refill</p>
                      <p class="text-2xl font-black">5,000 <span class="text-xs opacity-30">Credits</span></p>
                   </div>
                </div>
             </header>

             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <peoples size="18" /> Corporate Team
                </h3>
                <button class="action-btn px-4 py-2 text-[10px] font-black">+ INVITE EMPLOYEE</button>
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
                   <span class="text-[10px] font-bold opacity-30">{{ user.usage }} min used</span>
                </div>
             </div>
          </section>
       </div>
    </div>

    <!-- Provisioning Dialog -->
    <el-dialog v-model="showProvision" title="Onboard New Team Member" width="400px" custom-class="glass-dialog">
       <div class="space-y-4">
          <div class="form-group">
             <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">Work Email</label>
             <el-input v-model="provisionForm.email" placeholder="employee@company.com" class="glass-input" />
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div class="form-group">
                <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">First Name</label>
                <el-input v-model="provisionForm.firstName" class="glass-input" />
             </div>
             <div class="form-group">
                <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">Last Name</label>
                <el-input v-model="provisionForm.lastName" class="glass-input" />
             </div>
          </div>
          <div class="form-group">
             <label class="text-[10px] uppercase font-black opacity-40 mb-2 block">Access Level</label>
             <el-select v-model="provisionForm.role" class="w-full">
                <el-option label="Administrator" value="admin" />
                <el-option label="Content Creator" value="editor" />
                <el-option label="Data Viewer" value="viewer" />
             </el-select>
          </div>
       </div>
       <template #footer>
          <div class="flex justify-end gap-3 px-4 pb-4">
             <button class="secondary-btn text-[10px] px-4 py-2" @click="showProvision = false">CANCEL</button>
             <button class="primary-btn text-[10px] px-6 py-2" @click="confirmProvision">PROVISION ACCOUNT</button>
          </div>
       </template>
    </el-dialog>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">Credit Consumption</h3>
             <div class="space-y-4">
                <div v-for="svc in ['Streaming', 'AI Audio', 'AI Visuals']" :key="svc" class="usage-item">
                   <div class="flex justify-between text-[10px] mb-2">
                      <span class="opacity-50">{{ svc }}</span>
                      <span>{{ Math.floor(Math.random() * 80) }}% quota</span>
                   </div>
                   <el-progress :percentage="Math.floor(Math.random() * 80)" :show-text="false" :stroke-width="4" />
                </div>
             </div>
          </section>
     
     <footer class="mt-8 flex justify-end gap-3">
       <button class="secondary-btn px-6 py-2 text-xs">CANCEL CHANGES</button>
       <button class="primary-btn px-8 py-2 text-xs" @click="saveConfig">SAVE CONFIGURATION</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUIStore } from '@/stores/ui';
import { 
  BuildingTwo, SettingTwo, Lightning, Tool, 
  Switch, Close, Save, Edit, CameraFive,
  Shield, Key, LinkOne, ChartHistogram, ShareTwo, CheckOne, Diamond, PhoneOne, Peoples, SettingOne
} from '@icon-park/vue-next';

const uiStore = useUIStore();
import { toast } from 'vue-sonner';

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
    toast.success(`Sub-Enterprise ${addSubForm.value.name} onboarding initiated!`);
    showAddSub.value = false;
    // In real app, call POST /api/sub-tenant/create
};

const confirmProvision = () => {
    toast.success(`Account provisioned for ${provisionForm.value.email}!`);
    showProvision.value = false;
    // In real app, call POST /api/sub-tenant/team/provision
};

const saveConfig = () => {
    toast.success("Branding and Policy configuration updated!");
};

const upgradePerpetual = () => {
    toast.info("Initializing Secure Perpetual Checkout...");
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
