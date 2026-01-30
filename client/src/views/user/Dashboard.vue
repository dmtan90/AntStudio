<template>
  <div class="dashboard-page">
    <div class="dashboard-container">
      <div class="dashboard-header">
        <transition name="fade-up" appear>
          <div class="header-inner">
            <h1 class="glow-title">{{ t('dashboard.title') }}</h1>
            <p class="subtitle">{{ t('dashboard.manage') }}</p>
          </div>
        </transition>
        <!-- <GButton type="primary" size="lg" @click="showCreationDialog = true">
          {{ t('dashboard.startProject') }}
        </GButton> -->
        <GButton id="tour-new-project" type="primary" size="lg" @click="showCreationDialog = true; onTourFinish()">
          {{ t('projects.newProject') }}
        </GButton>
      </div>

      <!-- Tour -->
      <AppTour v-model="showTour" :steps="oneStep" @finish="onTourFinish" />

      <!-- Stats Grid -->
      <div class="stats-grid">
        <GCard class="stat-card">
          <GStatistic :title="t('dashboard.creditsBalance')" :value="user?.credits?.balance || 0" prefix="⭐" />
          <div class="credit-breakdown">
            <span><small>{{ t('dashboard.membership') }}:</small> <strong>{{ user?.credits?.membership || 0
                }}</strong></span>
            <span><small>{{ t('dashboard.bonus') }}:</small> <strong>{{ user?.credits?.bonus || 0 }}</strong></span>
            <span><small>{{ t('dashboard.weekly') }}:</small> <strong>{{ user?.credits?.weekly || 0 }}</strong></span>
          </div>
        </GCard>
        <GCard class="stat-card">
          <GStatistic :title="t('dashboard.creditsConsumed')" :value="creditsConsumedThisMonth" prefix="💳" />
          <div class="stat-progress">
            <div class="progress-bar" :style="{ width: creditUsagePercent + '%' }"></div>
          </div>
        </GCard>
        <GCard class="stat-card plan-card">
          <GStatistic :title="t('dashboard.currentMembership')" :value="0">
            <template #prefix>⭐</template>
            <template #default>
              <span class="plan-name">{{ user?.subscription?.plan?.toUpperCase() || 'FREE' }}</span>
            </template>
          </GStatistic>
          <GButton link size="sm" @click="handleCommand('profile')" class="upgrade-btn">{{ t('dashboard.upgrade') }}
          </GButton>
        </GCard>
      </div>

      <div class="projects-section">
        <div class="section-header">
          <h2>{{ t('dashboard.recentProjects') }}</h2>
        </div>

        <div v-if="loadingProjects" class="loading-state">
          <GCard v-for="i in 3" :key="i" class="skeleton-card"></GCard>
        </div>

        <div v-else-if="projects.length > 0" class="projects-grid">
          <GCard v-for="project in projects" :key="project._id" class="project-card"
            @click="router.push(`/projects/${project._id}/editor`)" :bodyStyle="{ padding: '0px !important' }">
            <div class="project-preview">
              <div class="status-badge" :class="project.status">{{ project.status.toUpperCase() }}</div>
              <div class="play-overlay">
                <play-one theme="filled" size="32" fill="#fff" />
              </div>
              <GMedia class="project-image" :src="project.storyboard?.segments?.[0]?.sceneImage"
                alt="Project Thumbnail">
                <template #error>
                  <div class="image-placeholder">
                    <play-one theme="filled" size="32" fill="#fff" />
                  </div>
                </template>
              </GMedia>
            </div>
            <div class="project-info">
              <h3>{{ project.title }}</h3>
              <p class="project-date">{{ formatDate(project.createdAt) }}</p>
            </div>
          </GCard>
        </div>

        <div v-else class="empty-state">
          <GCard class="empty-card">
            <div class="empty-icon">🎞️</div>
            <h3>{{ t('dashboard.noProjects') }}</h3>
            <p>{{ t('dashboard.bringVision') }}</p>
            <GButton type="primary" @click="showCreationDialog = true">{{ t('dashboard.createProject') }}</GButton>
          </GCard>
        </div>
      </div>
    </div>

    <ProjectCreationDialog v-model="showCreationDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useProjectStore } from '@/stores/project'
import { storeToRefs } from 'pinia'
import { PlayOne, Star, Credit } from '@icon-park/vue-next'
import ProjectCreationDialog from '@/components/projects/ProjectCreationDialog.vue'
import { useTranslations } from '@/composables/useTranslations'
import AppTour from '@/components/ui/AppTour.vue'

const { t, setLocale } = useTranslations()
const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()
const showCreationDialog = ref(false)

const { user } = storeToRefs(userStore)
const { projects, loadingList: loadingProjects } = storeToRefs(projectStore)

const showTour = ref(false)
const oneStep = [
  {
    target: '#tour-new-project',
    title: 'Create Your Magic',
    description: 'Start here to create your first AI-powered video project. Choose from script-to-video, avatars, or recording mode.',
    placement: 'bottom'
  },
]

const onTourFinish = () => {
  localStorage.setItem('antflow_create_project_tour_completed', 'true');
  showTour.value = false;
}

const creditsConsumedThisMonth = computed(() => {
  if (!user.value?.creditLogs) return 0
  const now = new Date()
  const thisMonth = user.value.creditLogs.filter((log: any) => {
    const logDate = new Date(log.timestamp)
    return log.type === 'consumed' &&
      logDate.getMonth() === now.getMonth() &&
      logDate.getFullYear() === now.getFullYear()
  })
  return thisMonth.reduce((sum: number, log: any) => sum + log.amount, 0)
})

const creditUsagePercent = computed(() => {
  const total = user.value?.credits?.balance || 1
  const consumed = creditsConsumedThisMonth.value
  return Math.min((consumed / (total + consumed)) * 100, 100)
})

const handleCommand = (cmd: string) => {
  if (cmd === 'profile') {
    // Handled by sidebar
  }
}

const initializeData = async () => {
  try {
    // Check if tour should be shown
    if (!localStorage.getItem('antflow_create_project_tour_completed')) {
      setTimeout(() => {
        showTour.value = true
      }, 1000)
    }

    if (!user.value) {
      await userStore.fetchProfile()
    }

    if (user.value?.language) {
      setLocale(user.value.language)
    }
    await projectStore.fetchProjects(1, 20)
  } catch (error) {
    console.error('Failed to initialize dashboard:', error)
  }
}

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

onMounted(initializeData)

</script>

<style lang="scss" scoped>
.dashboard-page {
  min-height: 100vh;
  padding-bottom: 80px;
  position: relative;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 16px;

  :deep(.g-card__body) {
    padding: 24px;
  }
}

.stat-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.progress-bar {
  height: 100%;
  background: #fff;
  border-radius: 2px;
}

.plan-card {
  position: relative;
}

.upgrade-btn {
  margin-top: auto;
  align-self: flex-start;
}

.credit-breakdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  span {
    display: flex;
    justify-content: space-between;
    align-items: center;

    small {
      opacity: 0.7;
    }

    strong {
      color: #fff;
      font-weight: 600;
    }
  }
}

.plan-name {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
}

.projects-section {
  margin-top: 60px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 30px;
  }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  overflow: hidden;
  cursor: pointer;

  :deep(.g-card__body) {
    padding: 0;
  }

  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-8px);

    .play-overlay {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
}

.project-preview {
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  position: relative;

  .project-image {
    width: 100%;
    height: 100%;
    z-index: 1;

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    }
  }
}

.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 2;

  &.completed {
    color: #4ade80;
  }

  &.draft {
    color: rgba(255, 255, 255, 0.5);
  }

  &.generating {
    color: #fbbf24;
  }
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.1);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  z-index: 2;
}

.project-info {
  padding: 20px;

  h3 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
    color: #fff;
  }
}

.project-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 32px;
  }
}

/* Animations */
.fade-up-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.skeleton-card {
  height: 280px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
  }

  50% {
    opacity: 0.8;
  }

  100% {
    opacity: 0.5;
  }
}
</style>
