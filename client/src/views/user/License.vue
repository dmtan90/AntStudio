<template>
  <div class="license-page min-h-screen bg-[#0a0a0c] text-white font-outfit">
    <!-- Header Section -->
    <header class="relative py-16 px-8 overflow-hidden border-b border-white/5">
      <div class="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-orange-900/10 to-transparent pointer-events-none"></div>
      
      <!-- Ambient Glows -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div class="absolute top-1/2 -left-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] animate-pulse" style="animation-delay: 1s"></div>

      <div class="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <h1 class="text-6xl font-black mb-4 tracking-tighter leading-[0.9]">
            {{ t('license.title') }} <br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
              {{ t('license.subtitle') }}
            </span>
          </h1>
          <p class="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
             {{ t('license.subtitle') }}
          </p>
        </div>
        <button 
           @click="showLicenseIssueDialog = true" 
           class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden"
        >
           <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
           <plus theme="outline" size="20" />
           {{ t('license.issue') }}
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-12 px-8">
      <!-- Filters -->
      <div class="flex flex-col md:flex-row items-center gap-6 mb-12">
         <div class="relative group flex-1 w-full md:w-auto md:max-w-md">
             <search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors" size="18" />
             <input 
                v-model="searchQuery" 
                :placeholder="t('license.search')" 
                class="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-yellow-500/50 focus:bg-white/10 transition-all"
             />
         </div>

         <div class="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
            <button v-for="type in licenseTypeFilters" :key="type.value"
               @click="currentLicenseType = type.value"
               class="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap"
               :class="currentLicenseType === type.value ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-gray-500 hover:text-white'"
            >
               {{ type.label }}
            </button>
         </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
         <div v-for="i in 5" :key="i" class="h-20 bg-white/5 rounded-2xl animate-pulse"></div>
      </div>

      <!-- Table Section -->
      <div v-else-if="filteredLicenses.length > 0" class="bg-white/5 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-sm">
         <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
               <thead>
                  <tr class="border-b border-white/5">
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.owner') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.type') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{{ t('license.columns.limits') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.created') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">{{ t('license.columns.actions') }}</th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="license in filteredLicenses" :key="license._id" class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                     <td class="px-6 py-5">
                        <div class="font-bold text-white mb-1">{{ license.owner }}</div>
                        <div class="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">{{ license.key }}</div>
                     </td>
                     <td class="px-6 py-5">
                        <span class="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border"
                           :class="{
                              'bg-purple-500/10 border-purple-500/30 text-purple-400': license.tier === 'enterprise',
                              'bg-blue-500/10 border-blue-500/30 text-blue-400': license.tier === 'pro',
                              'bg-gray-500/10 border-gray-500/30 text-gray-400': license.tier === 'trial' || license.tier === 'basic'
                           }"
                        >
                           {{ license.tier }}
                        </span>
                     </td>
                     <td class="px-6 py-5 text-center">
                        <div class="flex items-center justify-center gap-4 text-xs font-medium text-gray-400">
                           <span title="Max Users"><user theme="outline" size="14" class="inline mr-1" /> {{ license.maxUsersPerInstance }}</span>
                           <span title="Max Projects"><folder-close theme="outline" size="14" class="inline mr-1" /> {{ license.maxProjectsPerInstance }}</span>
                        </div>
                     </td>
                     <td class="px-6 py-5 text-xs font-medium text-gray-400">
                        {{ formatDate(license.createdAt) }}
                     </td>
                     <td class="px-6 py-5 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                              @click="handlePreviewLicense(license)"
                              class="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors"
                              title="Edit / Preview"
                           >
                              <edit theme="outline" size="16" />
                           </button>
                           <button 
                              @click="deleteLicense(license)"
                              class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors"
                              title="Delete"
                           >
                              <delete theme="outline" size="16" />
                           </button>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
         <div class="text-6xl mb-4 grayscale opacity-20">📜</div>
         <h3 class="text-xl font-bold text-white mb-2">{{ t('license.empty.title') }}</h3>
         <button 
            @click="showLicenseIssueDialog = true"
            class="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors"
         >
            {{ t('license.issue') }}
         </button>
      </div>
    </main>

    <!-- Issue Dialog -->
    <el-dialog v-model="showLicenseIssueDialog" width="500px" class="glass-dialog" :show-close="false" destroy-on-close align-center>
        <template #header>
            <div class="text-lg font-black text-white uppercase tracking-wide">{{ t('license.dialog.issueTitle') }}</div>
        </template>
        <div class="space-y-4" v-loading="isUploading">
            <div>
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.ownerLabel') }}</label>
               <el-input v-model="licenseForm.owner" :placeholder="t('license.dialog.ownerPlaceholder')" class="glass-input" />
            </div>
            <div>
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.tierLabel') }}</label>
               <el-select v-model="licenseForm.tier" class="glass-select w-full" popper-class="glass-dropdown">
                  <el-option v-for="item in licenseTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
               </el-select>
            </div>
            <div class="grid grid-cols-2 gap-4">
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxUsers') }}</label>
                  <el-input-number v-model="licenseForm.maxUsersPerInstance" :min="1" class="glass-input w-full" controls-position="right" />
               </div>
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxProjects') }}</label>
                  <el-input-number v-model="licenseForm.maxProjectsPerInstance" :min="1" class="glass-input w-full" controls-position="right" />
               </div>
            </div>
            <div>
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.duration') }}</label>
               <el-input-number v-model="licenseForm.durationDays" :min="1" class="glass-input w-full" controls-position="right" />
            </div>
        </div>
        <template #footer>
           <div class="flex gap-4">
              <button class="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors" @click="showLicenseIssueDialog = false">{{ t('license.dialog.cancel') }}</button>
              <button class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-yellow-500/20" @click="handleAddLicense">{{ t('license.dialog.issue') }}</button>
           </div>
        </template>
    </el-dialog>

    <!-- Preview/Edit Dialog -->
    <el-dialog v-model="showPreviewDialog" width="500px" class="glass-dialog" :show-close="false" destroy-on-close align-center>
        <template #header>
            <div class="text-lg font-black text-white uppercase tracking-wide">{{ t('license.dialog.editTitle') }}</div>
        </template>
        <div class="space-y-4" v-loading="isUploading">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
               <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{{ t('license.dialog.keyLabel') }}</div>
               <div class="font-mono text-xs text-yellow-400 break-all select-all">{{ previewLicense.key }}</div>
            </div>

            <div>
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.ownerLabel') }}</label>
               <el-input v-model="previewLicense.owner" class="glass-input" />
            </div>
            <div>
               <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.tierLabel') }}</label>
               <el-select v-model="previewLicense.tier" class="glass-select w-full" popper-class="glass-dropdown">
                  <el-option v-for="item in licenseTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
               </el-select>
            </div>
            <div class="grid grid-cols-2 gap-4">
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxUsers') }}</label>
                  <el-input-number v-model="previewLicense.maxUsersPerInstance" :min="1" class="glass-input w-full" controls-position="right" />
               </div>
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxProjects') }}</label>
                  <el-input-number v-model="previewLicense.maxProjectsPerInstance" :min="1" class="glass-input w-full" controls-position="right" />
               </div>
            </div>
             <div class="grid grid-cols-2 gap-4">
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.startDate') }}</label>
                  <el-date-picker v-model="previewLicense.startDate" type="date" class="glass-date w-full" />
               </div>
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.endDate') }}</label>
                  <el-date-picker v-model="previewLicense.endDate" type="date" class="glass-date w-full" />
               </div>
            </div>
        </div>
        <template #footer>
           <div class="flex gap-4">
              <button class="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors" @click="showPreviewDialog = false">{{ t('license.dialog.cancel') }}</button>
              <button class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-blue-600/20" @click="handleUpdateLicense">{{ t('license.dialog.update') }}</button>
           </div>
        </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Search, Delete, PlayOne, Plus, User, FolderClose, Edit
} from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { ref, computed, watch, onMounted } from 'vue';
import { useLicenseStore } from '@/stores/license';
import { storeToRefs } from 'pinia';

const { t } = useI18n()
const licenseStore = useLicenseStore();
const { licenses, loading } = storeToRefs(licenseStore);

const searchQuery = ref('');
const currentLicenseType = ref('all');
const showLicenseIssueDialog = ref(false);
const showPreviewDialog = ref(false);
const isUploading = ref(false);

const previewLicense = ref<any>({
  owner: '',
  tier: 'trial',
  maxUsersPerInstance: 5,
  maxProjectsPerInstance: 10,
  durationDays: 30,
  startDate: new Date(),
  endDate: new Date()
});

const licenseForm = ref({
  owner: '',
  tier: 'trial',
  maxUsersPerInstance: 5,
  maxProjectsPerInstance: 10,
  durationDays: 30
});

const licenseTypeFilters = computed(() => [
  { value: 'all', label: t('license.filterAll') },
  { value: 'valid', label: t('license.filterValid') },
  { value: 'expired', label: t('license.filterExpired') },
  { value: 'blocked', label: t('license.filterBlocked') }
]);

const licenseTypeOptions = computed(() => [
  { value: 'trial', label: t('license.typeTrial') },
  { value: 'basic', label: t('license.typeBasic') },
  { value: 'pro', label: t('license.typePro') },
  { value: 'enterprise', label: t('license.typeEnterprise') }
]);

const filteredLicenses = computed(() => {
  let filtered = licenses.value || [];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(r => r.owner?.toLowerCase().includes(query) || r.key?.toLowerCase().includes(query));
  }
  return filtered;
});

const fetchLicenses = () => {
  licenseStore.fetchLicenses(currentLicenseType.value !== 'all' ? currentLicenseType.value : undefined);
};

const handleAddLicense = async () => {
  if (!licenseForm.value?.owner) return toast.error(t('license.ownerRequired'));
  try {
    isUploading.value = true;
    await licenseStore.addLicense(licenseForm.value);
    licenseForm.value = { owner: '', tier: 'trial', maxUsersPerInstance: 5, maxProjectsPerInstance: 10, durationDays: 30 };
    showLicenseIssueDialog.value = false;
  } catch (error) {
    toast.error(t('common.failed'));
  } finally {
    isUploading.value = false;
  }
};

const handleUpdateLicense = async () => {
  if (!previewLicense.value?.owner) return toast.error(t('license.ownerRequired'));
  try {
    isUploading.value = true;
    await licenseStore.updateLicense(previewLicense.value._id, previewLicense.value);
    showPreviewDialog.value = false;
  } catch (error) {
    toast.error(t('common.failed'));
  } finally {
    isUploading.value = false;
  }
};

const handlePreviewLicense = (license: any) => {
  previewLicense.value = JSON.parse(JSON.stringify(license)); // Deep copy
  showPreviewDialog.value = true;
};

const deleteLicense = async (license: any) => {
  if (!confirm(t('license.confirmDelete'))) return;
  try {
    await licenseStore.deleteLicense(license._id);
    toast.success('Deleted successfully');
  } catch (error: any) {
    toast.error('Failed to delete');
  }
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();

watch(currentLicenseType, () => fetchLicenses());
onMounted(() => fetchLicenses());
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* Glass Overrides */
:global(.glass-dialog) {
    background: rgba(20, 20, 25, 0.95) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 24px !important;
    .el-dialog__header { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 24px; }
    .el-dialog__body { padding: 24px; }
    .el-dialog__footer { padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.05); }
}

:global(.glass-input .el-input__wrapper),
:global(.glass-select .el-input__wrapper),
:global(.glass-date .el-input__wrapper) {
   background: rgba(255, 255, 255, 0.05) !important;
   box-shadow: none !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 12px;
   padding: 4px 12px;
}
:global(.glass-input .el-input__inner) { color: white !important; font-weight: 600; }
</style>
