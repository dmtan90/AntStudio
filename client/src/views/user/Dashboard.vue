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

    <ProjectCreationDialog v-model="showCreationDialog" />
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
import ProjectCreationDialog from '@/components/projects/ProjectCreationDialog.vue';
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

const { user } = storeToRefs(userStore);
const { projects, loadingList: loadingProjects, pagination } = storeToRefs(projectStore);
const { accounts: platformAccounts } = storeToRefs(platformStore);
const { commerceStats } = storeToRefs(marketplaceStore);

const showCreationDialog = ref(false);
const showTour = ref(false);

const tourSteps = [
  {
    target: '#tour-welcome',
    title: 'Welcome to your Dashboard',
    description: 'This is your central hub for managing projects and assets.',
    placement: 'bottom'
  },
  {
    target: '#tour-stats',
    title: 'Your Performance',
    description: 'Get a quick overview of your credits, active projects, and commerce stats.',
    placement: 'bottom'
  },
  {
    target: '#tour-actions',
    title: 'Quick Actions',
    description: 'Launch the Project Wizard or Go Live instantly with our Studio.',
    placement: 'bottom'
  },
  {
    target: '#tour-recent',
    title: 'Recent Creations',
    description: 'Quickly access and manage your most recently edited projects.',
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
