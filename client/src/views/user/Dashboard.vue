<template>
  <div class="dashboard-page min-h-screen bg-[#0a0a0c] text-white font-outfit">
    
    <DashboardHeader 
      :user="user" 
      @create="showCreationDialog = true" 
    />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-12 px-8">
      
      <StatsOverview 
        :user="user"
        :pagination="pagination"
        :platform-accounts="platformAccounts"
        :commerce-stats="commerceStats"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         <RecentProjects 
            :projects="projects" 
            :loading="loadingProjects" 
            @create="showCreationDialog = true"
         />

         <!-- Sidebar (Right Column) -->
         <div class="space-y-8">
            <ConnectedAccounts :accounts="platformAccounts" />
            <SystemStatus />
         </div>
      </div>
    </main>

    <ProjectCreationDialog v-model="showCreationDialog" @create-ad="adDialogVisible = true; showCreationDialog = false" />
    <ProductAdDialog v-model="adDialogVisible" />

    <AppTour v-model="showTour" :steps="tourSteps" @finish="onTourFinish" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useUserStore } from '@/stores/user';
import { useProjectStore } from '@/stores/project';
import { usePlatformStore } from '@/stores/platform';
import { useMarketplaceStore } from '@/stores/marketplace';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import ProjectCreationDialog from '@/components/projects/ProjectCreationDialog.vue';
import ProductAdDialog from '@/components/merchant/dialogs/ProductAdDialog.vue'
import AppTour from '@/components/ui/AppTour.vue';

// Dashboard Components
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue';
import StatsOverview from '@/components/dashboard/StatsOverview.vue';
import RecentProjects from '@/components/dashboard/RecentProjects.vue';
import ConnectedAccounts from '@/components/dashboard/ConnectedAccounts.vue';
import SystemStatus from '@/components/dashboard/SystemStatus.vue';

const userStore = useUserStore();
const projectStore = useProjectStore();
const platformStore = usePlatformStore();
const marketplaceStore = useMarketplaceStore();
const uiStore = useUIStore();
const { t } = useI18n()

const { user } = storeToRefs(userStore);
const { projects, loadingList: loadingProjects, pagination } = storeToRefs(projectStore);
const { accounts: platformAccounts } = storeToRefs(platformStore);
const { commerceStats } = storeToRefs(marketplaceStore);

const showCreationDialog = ref(false);
const showTour = ref(false);
const adDialogVisible = ref(false);

const tourSteps = [
  {
    target: '#tour-welcome',
    title: t('dashboard.tour.welcome.title'),
    description: t('dashboard.tour.welcome.desc'),
    placement: 'bottom'
  },
  {
    target: '#tour-stats',
    title: t('dashboard.tour.stats.title'),
    description: t('dashboard.tour.stats.desc'),
    placement: 'bottom'
  },
  {
    target: '#tour-actions',
    title: t('dashboard.tour.actions.title'),
    description: t('dashboard.tour.actions.desc'),
    placement: 'bottom'
  },
  {
    target: '#tour-recent',
    title: t('dashboard.tour.recent.title'),
    description: t('dashboard.tour.recent.desc'),
    placement: 'top'
  }
];

const initializeData = async () => {
  try {
    if (!user.value) await userStore.fetchProfile();
    
    // Check tour
    const tourKey = `${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_dashboard_tour_completed`;
    if (!localStorage.getItem(tourKey)) {
       setTimeout(() => showTour.value = true, 1000);
    }

    // Parallel fetch
    await Promise.all([
       projectStore.fetchProjects({ limit: 4 }),
       platformStore.fetchAccounts(),
       marketplaceStore.fetchCommerceStats()
    ]);
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
  }
};

const onTourFinish = () => {
    const tourKey = `${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_dashboard_tour_completed`;
    localStorage.setItem(tourKey, 'true');
    showTour.value = false;
};

onMounted(initializeData);
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
