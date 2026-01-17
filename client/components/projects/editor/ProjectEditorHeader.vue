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
            {{ project?.title || 'Untitled Project' }}
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

      <!-- <div class="sidebar-toggles">
        <GButton 
          circle 
          size="small" 
          :type="leftVisible ? 'primary' : 'default'"
          class="toggle-btn" 
          @click="$emit('toggle-left')"
        >
          <menu-unfold v-if="!leftVisible" theme="outline" size="18" />
          <menu-fold v-else theme="outline" size="18" />
        </GButton>
      </div> -->
    </div>

    <div class="header-right">
      <div class="credit-balance glass-dark" v-if="user">
        <div class="credit-item">
          <ticket theme="outline" size="14" />
          <span class="count">{{ totalCredits }}</span>
          <span class="label">Credits</span>
        </div>
      </div>

      <div class="action-divider" />

      <GDropdown @command="handleExport" placement="bottom">
        <GButton type="primary" class="export-btn">
          <export theme="outline" size="16" />
          <span>Export</span>
          <down theme="outline" size="12" />
        </GButton>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="video">
              <movie theme="outline" size="14" /> Full Video (.mp4)
            </el-dropdown-item>
            <el-dropdown-item command="capcut">
              <application-one theme="outline" size="14" /> CapCut Project
            </el-dropdown-item>
            <el-dropdown-item command="premiere">
              <adobe-premiere theme="outline" size="14" /> Premiere Project
            </el-dropdown-item>
            <el-dropdown-item command="zip">
              <zip theme="outline" size="14" /> Assets ZIP (Images, Voice, Music)
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </GDropdown>

      <GDropdown @command="handleUserCommand" placement="bottom">
        <div class="user-profile">
          <img v-if="user?.avatar" :src="getFileUrl(user.avatar)" class="user-avatar" />
          <div v-else class="avatar-placeholder">{{ user?.name?.charAt(0) || 'U' }}</div>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <user-icon theme="outline" size="14" /> Profile Updates
            </el-dropdown-item>
            <el-dropdown-item command="upgrade">
              <diamond theme="outline" size="14" /> Upgrade Plan
            </el-dropdown-item>
            <el-dropdown-item command="password">
              <key-icon theme="outline" size="14" /> Change Password
            </el-dropdown-item>
            <el-dropdown-item divider />
            <el-dropdown-item command="logout" class="logout-item">
              <logout-icon theme="outline" size="14" /> Logout
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
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { 
  ArrowLeft, Edit, Ticket, Export, Down, Movie, ApplicationOne, 
  ApplicationOne as AdobePremiere, Zip, User as UserIcon, Diamond, Key as KeyIcon, 
  Logout as LogoutIcon, Robot, RobotOne
} from '@icon-park/vue-next'
import { useProjectStore } from '~/stores/project'
import { useUserStore } from '~/stores/user'
import { toast } from 'vue-sonner'

const props = defineProps<{
  leftVisible: boolean
  rightVisible: boolean
}>()

const emits = defineEmits(['toggle-left', 'toggle-right', 'export'])

const projectStore = useProjectStore()
const userStore = useUserStore()
const project = computed(() => projectStore.currentProject)
const user = computed(() => userStore.user)

// Title Editing
const isEditingTitle = ref(false)
const editTitle = ref('')
const titleInput = ref<any>(null)

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
      toast.success('Project renamed')
    } catch (error) {
      toast.error('Failed to rename project')
    }
  }
}

// Credits
const totalCredits = computed(() => {
  if (!user.value?.credits) return 0
  const c = user.value.credits
  return (c.balance || 0) + (c.membership || 0) + (c.bonus || 0)
})

// Navigation & Actions
const goBack = () => navigateTo('/projects')

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/s3/${path}`
}

const handleExport = (command: string) => {
  emits('export', command)
}

const handleUserCommand = (command: string) => {
  if (command === 'logout') {
    userStore.clearAuth()
    window.location.href = '/login'
  } else if (command === 'upgrade') {
    window.open('/#pricing', '_blank')
  } else {
    // Other commands can be handled via event if needed, but for now we follow AppNavbar
    toast.info('Feature coming soon in editor view')
  }
}
</script>

<style lang="scss" scoped>
.project-editor-header {
  height: 64px;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.logo-divider {
  width: 1px;
  height: 24px;
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
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      .edit-icon { opacity: 1; }
    }

    .edit-icon {
      opacity: 0;
      color: rgba(255, 255, 255, 0.4);
      transition: opacity 0.2s;
    }
  }

  .title-input {
    width: 260px;
  }
}

.sidebar-toggles {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.credit-balance {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);

  .credit-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ffab00;

    .count {
      font-weight: 800;
      font-size: 14px;
      color: #fff;
    }

    .label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.5;
      color: #fff;
    }
  }
}

.action-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.export-btn {
  padding: 8px 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  gap: 8px !important;
}

.user-profile {
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
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
    @include flex-center;
    font-weight: 800;
    font-size: 14px;
  }
}

.toggle-btn {
  &.right-toggle {
    margin-left: 8px;
  }
}

.logout-item {
  color: #ff5252 !important;
}
</style>
