<template>
  <header class="project-editor-header">
    <div class="header-left">
      <GButton circle size="small" class="back-btn" @click="goBack">
        <arrow-left theme="outline" size="18" />
      </GButton>
      
      <div class="logo-divider" />
      
      <div class="project-title-container">
        <template v-if="!isEditingTitle">
          <h1 class="project-title" @click="startEditing">
            {{ project?.title || t('projects.editor.header.untitled') }}
            <edit theme="outline" size="14" class="edit-icon" />
          </h1>
        </template>
        <GInput
          v-else
          ref="titleInput"
          v-model="editTitle"
          size="small"
          class="title-input"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
        />
      </div>
    </div>

    <div class="header-right">
      <div class="credit-wrapper" v-if="user">
       <GPopover trigger="hover" placement="bottom" :width="300">
          <template #reference>
            <div class="credit-balance glass-premium">
              <div class="credit-item">
                <ticket theme="filled" size="14" class="text-blue-200" />
                <span class="count">{{ totalCredits }}</span>
                <span class="label">{{ t('projects.editor.header.credits') }}</span>
              </div>
            </div>
          </template>
          
          <div class="credit-popover-content">
            <div class="user-info">
              <span class="user-name-pop">{{ user.name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>

            <GButton 
              v-if="isFree" 
              type="primary" 
              class="upgrade-btn-pop" 
              @click="showUpgradeDialog"
            >
              <diamond theme="outline" size="14" />
              {{ t('dashboard.upgrade') }}
            </GButton>

            <div class="credit-section">
              <div class="section-title">{{ t('account.credits.membership') }}</div>
              <div class="credit-items">
                <div class="credit-item-row">
                  <span>{{ t('subscription.membership') }}</span>
                  <span class="credit-value">{{ user.credits?.membership || 0 }}</span>
                </div>
                <div class="credit-item-row">
                  <span>{{ t('subscription.bonus') }}</span>
                  <span class="credit-value">{{ user.credits?.bonus || 0 }}</span>
                </div>
              </div>
            </div>

            <div class="credit-section">
              <div class="section-title">{{ t('subscription.weekly') }}</div>
              <div class="credit-item-row">
                <span class="reset-info">Resets every Monday at 00:00</span>
                <span class="credit-value">{{ user.credits?.weekly || 0 }}</span>
              </div>
            </div>
          </div>
        </GPopover>
      </div>

      <div class="action-divider" />

      <GButton type="primary" :icon="ApplicationOne" class="premium-button" @click="handleEditorMode('studio')">
        <span>{{ t('projects.editor.header.studio') }}</span>
      </GButton>

      <GDropdown @command="handleUserCommand" placement="bottom">
        <div class="user-profile">
          <img v-if="user?.avatar" :src="getFileUrl(user.avatar)" class="user-avatar" />
          <div v-else class="avatar-placeholder">{{ user?.name?.charAt(0) || 'U' }}</div>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <user-icon theme="outline" size="14" /> {{ t('common.profile') }}
            </el-dropdown-item>
            <el-dropdown-item command="upgrade">
              <diamond theme="outline" size="14" /> {{ t('dashboard.upgrade') }}
            </el-dropdown-item>
            <el-dropdown-item command="password">
              <key-icon theme="outline" size="14" /> {{ t('common.password') }}
            </el-dropdown-item>
            <el-dropdown-item divider />
            <el-dropdown-item command="logout" class="logout-item">
              <logout-icon theme="outline" size="14" /> {{ t('common.logout') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </GDropdown>

      <GButton 
        circle 
        size="small" 
        :type="rightVisible ? 'primary' : 'default'"
        class="toggle-btn right-toggle" 
        @click="$emit('toggle-right')"
      >
        <Robot v-if="rightVisible" theme="outline" size="18" />
        <RobotOne v-else theme="outline" size="18" />
      </GButton>
    </div>
  </header>
  <SubscriptionPlansDialog
    v-model="subscriptionDialogVisible"
    @select="handlePlanSelection"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, computed, nextTick } from 'vue'
import { 
  ArrowLeft, Edit, Ticket, Upload, Down, Movie, ApplicationOne, 
  ApplicationOne as AdobePremiere, Zip, User as UserIcon, Diamond, Key as KeyIcon, 
  Logout as LogoutIcon, Robot, RobotOne, 
} from '@icon-park/vue-next'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

import GPopover from '@/components/ui/GPopover.vue'
import SubscriptionPlansDialog from '@/components/subscription/SubscriptionPlansDialog.vue'
import { getFileUrl } from '@/utils/api'

const router = useRouter()
const { t } = useTranslations()

const props = defineProps<{
  leftVisible: boolean
  rightVisible: boolean
}>()

const emits = defineEmits(['toggle-left', 'toggle-right', 'export', 'view-mode'])

const projectStore = useProjectStore()
const userStore = useUserStore()
const project = computed(() => projectStore.currentProject)
const user = computed(() => userStore.user)

// Title Editing
const isEditingTitle = ref(false)
const editTitle = ref('')
const titleInput = ref<any>(null)
const editorMode = computed({
  get: () => projectStore.editorMode,
  set: (val) => projectStore.editorMode = val as any
})

const startEditing = () => {
  editTitle.value = project.value?.title || ''
  isEditingTitle.value = true
  nextTick(() => {
    titleInput.value?.$el.querySelector('input')?.focus()
  })
}

const saveTitle = async () => {
  if (!isEditingTitle.value) return
  isEditingTitle.value = false
  if (editTitle.value && editTitle.value !== project.value?.title) {
    try {
      await projectStore.updateProject({ title: editTitle.value })
      toast.success(t('projects.editor.header.renamed'))
    } catch (error) {
      toast.error(t('projects.editor.header.renameFailed'))
    }
  }
}

// Credits
const totalCredits = computed(() => {
  if (!user.value?.credits) return 0
  const c = user.value.credits
  return (c.balance || 0)
})

const isFree = computed(() => {
  return !user.value?.subscription?.plan || user.value.subscription.plan === 'free'
})

const subscriptionDialogVisible = ref(false)

const showUpgradeDialog = () => {
  subscriptionDialogVisible.value = true
}

const handlePlanSelection = (data: any) => {
  console.log('Selected plan:', data)
  subscriptionDialogVisible.value = false
}

// Navigation & Actions
const goBack = () => router.push('/projects')



const handleExport = (command: string) => {
  emits('export', command)
}

const handleEditorMode = (command: string) => {
  emits('view-mode', command)
}

const handleUserCommand = (command: string) => {
  if (command === 'logout') {
    userStore.clearAuth()
    window.location.href = '/login'
  } else if (command === 'upgrade') {
    window.open('/#pricing', '_blank')
  } else {
    // Other commands can be handled via event if needed, but for now we follow AppNavbar
    toast.info(t('projects.editor.header.comingSoon'))
  }
}
</script>

<style lang="scss" scoped>
.project-editor-header {
  height: 64px;
  background: rgba(10, 10, 12, 0.7);
  backdrop-filter: blur(40px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  font-family: 'Outfit', sans-serif;

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

.logo-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.project-title-container {
  min-width: 100px;
  max-width: 400px;

  .project-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.3s ease;
    letter-spacing: -0.01em;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      .edit-icon { 
        opacity: 1; 
        transform: scale(1.1);
      }
    }

    .edit-icon {
      opacity: 0;
      color: rgba(255, 255, 255, 0.4);
      transition: all 0.3s ease;
    }
  }

  .title-input {
    width: 260px;
  }
}

.credit-balance {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 99px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.25);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .credit-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;

    .count {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.5px;
    }

    .label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
    }
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.action-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.premium-button {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%) !important;
  border: none !important;
  border-radius: 10px !important;
  padding: 10px 20px !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2) !important;
  transition: all 0.3s ease !important;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4) !important;
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
  }
}

.user-profile {
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.08);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .user-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #fff;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 14px;
  }
}

.logout-item {
  color: #ff5252 !important;
}

.credit-popover-content {
  min-width: 260px;
  padding: 12px;

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    .user-name-pop {
      font-weight: 700;
      font-size: 15px;
      color: #fff;
    }

    .user-email {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .upgrade-btn-pop {
    width: 100%;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    border: none;
    font-weight: 700;
  }

  .credit-section {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .credit-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  .credit-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);

    .credit-value {
      font-weight: 700;
      color: #fff;
    }
    
    .reset-info {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.3);
      font-style: italic;
    }
  }
}


</style>
