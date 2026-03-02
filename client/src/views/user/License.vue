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
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{{ t('license.columns.status') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.type') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.limits') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.created') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ t('license.columns.expires') }}</th>
                     <th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">{{ t('license.columns.actions') }}</th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="license in paginatedLicenses" :key="license._id" class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                     <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                           <div class="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center font-black text-xs text-gray-400 uppercase tracking-tighter">
                              {{ license.owner ? license.owner.charAt(0) : '?' }}
                           </div>
                           <div class="flex flex-col min-w-0">
                              <div class="font-bold text-white text-sm truncate max-w-[180px]">{{ license.owner }}</div>
                              <div class="text-[9px] font-mono text-gray-500 truncate max-w-[150px] tracking-tight uppercase flex items-center gap-1.5 pt-0.5">
                                 <key theme="outline" size="10" />
                                 {{ license.key.substring(0, 12) }}...
                              </div>
                           </div>
                        </div>
                     </td>
                     <td class="px-6 py-5 text-center">
                         <span class="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border"
                            :class="{
                               'bg-green-500/10 border-green-500/30 text-green-400': license.status === 'valid',
                               'bg-red-500/10 border-red-500/30 text-red-400': license.status === 'expired',
                               'bg-orange-500/10 border-orange-500/30 text-orange-400': license.status === 'blocked'
                            }"
                         >
                            {{ t('license.' + license.status) }}
                         </span>
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
                     <td class="px-6 py-5">
                        <div class="flex flex-col gap-1.5 min-w-[120px]">
                           <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1">
                              <div class="flex items-center gap-2 text-[10px] uppercase font-black tracking-tighter text-gray-500">
                                 <user theme="outline" size="12" />
                                 Users
                              </div>
                              <span class="text-xs font-bold" :class="license.maxUsersPerInstance === -1 ? 'text-yellow-400' : 'text-white'">
                                 {{ license.maxUsersPerInstance === -1 ? t('common.unlimited') : license.maxUsersPerInstance }}
                              </span>
                           </div>
                           <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1">
                              <div class="flex items-center gap-2 text-[10px] uppercase font-black tracking-tighter text-gray-500">
                                 <folder-close theme="outline" size="12" />
                                 Projects
                              </div>
                              <span class="text-xs font-bold" :class="license.maxProjectsPerInstance === -1 ? 'text-orange-400' : 'text-white'">
                                 {{ license.maxProjectsPerInstance === -1 ? t('common.unlimited') : license.maxProjectsPerInstance }}
                              </span>
                           </div>
                        </div>
                     </td>
                     <td class="px-6 py-5 text-xs font-medium text-gray-400">
                        {{ formatDate(license.createdAt) }}
                     </td>
                     <td class="px-6 py-5 text-xs font-medium text-gray-400">
                        {{ formatDate(license.endDate) }}
                     </td>
                     <td class="px-6 py-5 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                           <button 
                              @click="handlePreviewLicense(license)"
                              class="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors border border-blue-500/20"
                              title="Edit / Preview"
                           >
                              <edit theme="outline" size="14" />
                           </button>
                           <button 
                              @click="deleteLicense(license)"
                              class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors border border-red-500/20"
                              title="Delete"
                           >
                              <delete theme="outline" size="14" />
                           </button>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
         
         <!-- Pagination -->
         <div class="p-6 border-t border-white/5 flex items-center justify-between">
            <div class="text-xs text-gray-500 font-medium">
               Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredLicenses.length) }} of {{ filteredLicenses.length }}
            </div>
            <el-pagination
               v-model:current-page="currentPage"
               v-model:page-size="pageSize"
               :total="filteredLicenses.length"
               layout="prev, pager, next"
               class="glass-pagination"
            />
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
                  <el-input-number v-model="licenseForm.maxUsersPerInstance" :min="-1" class="glass-input w-full" controls-position="right" />
               </div>
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxProjects') }}</label>
                  <el-input-number v-model="licenseForm.maxProjectsPerInstance" :min="-1" class="glass-input w-full" controls-position="right" />
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
                  <el-input-number v-model="previewLicense.maxUsersPerInstance" :min="-1" class="glass-input w-full" controls-position="right" />
               </div>
               <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ t('license.dialog.maxProjects') }}</label>
                  <el-input-number v-model="previewLicense.maxProjectsPerInstance" :min="-1" class="glass-input w-full" controls-position="right" />
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

const currentPage = ref(1);
const pageSize = ref(10);

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
  
  if (currentLicenseType.value !== 'all') {
    filtered = filtered.filter(l => l.status === currentLicenseType.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(r => 
      r.owner?.toLowerCase().includes(query) || 
      r.key?.toLowerCase().includes(query)
    );
  }
  return filtered;
});

const paginatedLicenses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredLicenses.value.slice(start, end);
});

watch([searchQuery, currentLicenseType], () => {
  currentPage.value = 1;
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

:global(.glass-pagination) {
   --el-pagination-bg-color: transparent !important;
   --el-pagination-hover-color: #fbbf24 !important;
   --el-pagination-button-color: #9ca3af !important;
   --el-pagination-button-bg-color: transparent !important;
   --el-pagination-active-color: #000 !important;
   
   .el-pager li {
      background: transparent !important;
      color: #9ca3af !important;
      font-weight: 900 !important;
      border-radius: 8px !important;
      &.is-active {
         background: white !important;
         color: black !important;
      }
      &:hover {
         color: white !important;
      }
   }
   
   button:disabled {
      background: transparent !important;
      opacity: 0.3;
   }
   
   button {
      background: transparent !important;
      color: #9ca3af !important;
      &:hover {
         color: white !important;
      }
   }
}
</style>
