<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="brand-section" v-if="!collapsed">
        <router-link to="/" class="brand">
          <!-- <template v-if="uiStore.logo">
            <img :src="getFileUrl(uiStore.logo)" :alt="uiStore.appName" class="brand-logo" />
          </template>
          <el-icon v-else>
            <img src="@/assets/images/logo.png" alt="" />
          </el-icon> -->
          <el-image :src="getFileUrl(uiStore.logo)" :alt="uiStore.appName" class="brand-logo">
            <template #error>
              <el-icon>
                <img src="/logo.png" alt="" />
              </el-icon>
            </template>
          </el-image>
          <span>{{ uiStore.appName }}</span>
        </router-link>
      </div>
      <button class="toggle-btn" @click="collapsed = !collapsed">
        <menu-unfold v-if="collapsed" theme="outline" size="20" />
        <menu-fold v-else theme="outline" size="20" />
      </button>
    </div>

    <!-- Update Banner -->
    <div v-if="updateAvailable && !collapsed"
      class="mx-4 mt-4 p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg animate-pulse cursor-pointer">
      <div class="flex justify-between items-center">
        <span class="text-[10px] font-black uppercase">v{{ latestVersion }} Available</span>
        <download theme="outline" size="14" />
      </div>
    </div>

    <div class="sidebar-content">
      <nav class="nav-section">
        <router-link to="/dashboard" class="nav-item" :class="{ active: route.path === '/dashboard' }">
          <dashboard-one theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.dashboard') }}</span>
        </router-link>
        <router-link to="/projects" class="nav-item" :class="{ active: route.path.startsWith('/projects') }">
          <folder-open theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.projects') }}</span>
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: route.path === '/templates' }">
          <theme theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.templates') }}</span>
        </router-link>
        <!-- <router-link to="/organization" class="nav-item" :class="{ active: route.path === '/organization' }">
          <peoples theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.team') }}</span>
        </router-link> -->
        <router-link to="/vtubers" class="nav-item" :class="{ active: route.path === '/vtubers' }">
          <brain theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.avatars') }}</span>
        </router-link>
        <router-link to="/platforms" class="nav-item" :class="{ active: route.path === '/platforms' }">
          <connection theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.platforms') }}</span>
        </router-link>
        <router-link to="/viral" class="nav-item" :class="{ active: route.path === '/viral' }">
          <share-two theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.viral') }}</span>
        </router-link>
        <router-link to="/merchants" class="nav-item" :class="{ active: route.path === '/merchants' }">
          <shopping theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.merchant') }}</span>
        </router-link>
        <router-link to="/resources" class="nav-item" :class="{ active: route.path === '/resources' }">
          <book-one theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.resources') }}</span>
        </router-link>
        <router-link to="/billing" class="nav-item" :class="{ active: route.path === '/billing' }">
          <credit theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.subscription') }}</span>
        </router-link>

        <router-link v-if="userStore.systemMode === 'master'" to="/license-portal" class="nav-item"
          :class="{ active: route.path === '/license-portal' }">
          <key theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text text-amber-400">{{ t('nav.licenseHub') }}</span>
        </router-link>

        <router-link v-if="user?.role === 'sys-admin'" to="/license" class="nav-item"
          :class="{ active: route.path === '/license' }">
          <key theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.license') }}</span>
        </router-link>

        <div class="nav-group" v-if="user?.role === 'admin' || user?.role === 'sys-admin'">
          <div class="nav-item admin-item" :class="{ 'active': route.path.startsWith('/admin') && !adminMenuOpen }"
            @click="toggleAdminMenu">
            <setting theme="outline" size="20" />
            <span v-if="!collapsed" class="nav-text flex-1">{{ t('nav.admin') }}</span>
            <down v-if="!collapsed && adminMenuOpen" theme="outline" size="16" />
            <right v-if="!collapsed && !adminMenuOpen" theme="outline" size="16" />
          </div>

          <div v-show="!collapsed && adminMenuOpen" class="submenu">
            <router-link to="/admin" class="nav-item sub-item" :class="{ active: route.path === '/admin' }">
              <dashboard-one theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.dashboard') }}</span>
            </router-link>

            <router-link to="/admin/users" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/users') }">
              <user-icon theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.users') }}</span>
            </router-link>

            <router-link to="/admin/settings" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/settings') }">
              <setting theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.settings') }}</span>
            </router-link>
            <router-link to="/admin/ai-accounts" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/ai-accounts') }">
              <robot theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.aiAccounts') }}</span>
            </router-link>

            <router-link v-if="userStore.systemMode === 'master'" to="/admin/fleet" class="nav-item sub-item"
              :class="{ active: route.path === '/admin/fleet' }">
              <data-server theme="outline" size="18" />
              <span class="nav-text text-blue-400">{{ t('nav.fleetCommand') }}</span>
            </router-link>

            <router-link to="/admin/monitoring" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/monitoring') }">
              <terminal theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.monitoring') }}</span>
            </router-link>

            <router-link to="/admin/infra-health" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/infra-health') }">
              <database-network theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.infrastructure') }}</span>
            </router-link>

            <router-link to="/admin/network" class="nav-item sub-item"
              :class="{ active: route.path.startsWith('/admin/network') }">
              <earth theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.network') }}</span>
            </router-link>
            <router-link to="/developer" class="nav-item sub-item"
              :class="{ active: route.path === '/developer' }">
              <connection-point theme="outline" size="20" />
              <span v-if="!collapsed" class="nav-text">{{ t('nav.developer') }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-item glass-dark clickable" @click="handleCommand('profile')">
          <el-avatar :src="getFileUrl(user?.avatar)" :size="20">
            <user-icon theme="outline" size="20" />
          </el-avatar>
          <span v-if="!collapsed" class="nav-text text-truncate">{{ user?.name || t('common.profile') }}</span>
        </div>

        <div class="footer-item glass-dark clickable logout-item" @click="handleLogout">
          <logout-icon theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('common.logout') }}</span>
        </div>
      </div>
    </div>

    <!-- Account Dialog -->
    <AccountDialog v-model="accountDialogVisible" :user="user" @update-user="user = $event" @logout="handleLogout"
      fullscreen />
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  DashboardOne,
  FolderOpen,
  VideoTwo,
  BookOne,
  User as UserIcon,
  Logout as LogoutIcon,
  MenuFold,
  MenuUnfold,
  Vip,
  Setting,
  Down,
  Right,
  Key,
  Credit,
  Robot,
  Connection,
  ChartLine,
  VideoFile,
  Shopping,
  Earth,
  Peoples,
  Brain,
  Terminal,
  Download,
  ConnectionPoint,
  DataServer,
  DatabaseNetwork,
  ShareTwo,
  Theme
} from '@icon-park/vue-next'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { useTranslations, type Locale } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import AccountDialog from '@/components/AccountDialog.vue'
import { getFileUrl } from '@/utils/api'

const props = defineProps<{}>()

const route = useRoute()
const { t, setLocale, currentLocale } = useTranslations()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

// Shared state
const uiStore = useUIStore()
const { sidebarCollapsed: collapsed } = storeToRefs(uiStore)
const adminMenuOpen = ref(false)

const toggleAdminMenu = () => {
  if (collapsed.value) {
    collapsed.value = false
    adminMenuOpen.value = true
  } else {
    adminMenuOpen.value = !adminMenuOpen.value
  }
}

watch(() => route.path, (path) => {
  if (path.startsWith('/admin')) {
    adminMenuOpen.value = true
  }
}, { immediate: true })



const languages = [
  { code: 'en', name: 'English', flag: 'us' },
  { code: 'vi', name: 'Tiếng Việt', flag: 'vn' },
  { code: 'zh', name: '简体中文', flag: 'cn' },
  { code: 'ja', name: '日本語', flag: 'jp' },
  { code: 'es', name: 'Español', flag: 'es' }
]

const currentFlag = computed(() => {
  return languages.find(l => l.code === currentLocale.value)?.flag || 'us'
})

const handleLanguageChange = async (code: string) => {
  setLocale(code as Locale)
  if (user.value) {
    try {
      await userStore.updateProfile({ language: code })
    } catch (error) {
      console.error('Failed to sync language preference')
    }
  }
}

const accountDialogVisible = ref(false)

const handleCommand = (command: string) => {
  if (command === 'profile') {
    accountDialogVisible.value = true
  }
}

const handleLogout = () => {
  userStore.logout()
}

onMounted(() => {
  userStore.fetchProfile()
  uiStore.fetchAppConfig()
  checkForUpdates()
})

const updateAvailable = ref(false)
const latestVersion = ref('')

const checkForUpdates = async () => {
  try {
    // Only check if we are in Edge mode
    if (userStore.systemMode === 'master') return
    const data = await uiStore.checkForUpdates()
    if (data) {
      // Simple version compare logic 
      // In real app, use semver
      // Assuming locally we have a version in config or env, mocking '1.0.0' for now
      const currentVersion = '1.4.0'
      if (data.release.version !== currentVersion) {
        updateAvailable.value = true
        latestVersion.value = data.release.version
      }
    }
  } catch (e) { }
}
</script>

<style lang="scss" scoped>
.app-sidebar {
  width: 260px;
  height: 100vh;
  background: rgba($bg-dark, 0.95);
  backdrop-filter: blur($glass-blur);
  border-right: 1px solid $border-glass;
  display: flex;
  flex-direction: column;
  transition: $transition-base;
  z-index: 1;
  position: fixed;
  left: 0;
  top: 0;

  &.collapsed {
    width: 68px;
  }
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-md;
  border-bottom: 1px solid $border-glass;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  color: $text-primary;
  text-decoration: none;
  letter-spacing: -1px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: $text-secondary;
  cursor: pointer;
  padding: $spacing-sm;
  border-radius: $radius-sm;
  @include flex-center;
  transition: $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: $spacing-md $spacing-sm;
  overflow-y: auto;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: 10px $spacing-md;
  border-radius: $radius-md;
  color: $text-secondary;
  text-decoration: none;
  transition: $transition-fast;
  cursor: pointer;

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &.active {
    background: rgba(255, 255, 255, 0.1);
    font-weight: 600;
  }
}

.nav-text {
  font-size: 14px;
  white-space: nowrap;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding-top: $spacing-md;
  border-top: 1px solid $border-glass;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: 10px $spacing-md;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: $transition-fast;
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

.clickable {
  cursor: pointer;
}

.logout-item:hover {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flex-1 {
  flex: 1;
}

.submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: $radius-md;
  margin-top: 4px;
  padding: 4px;
  overflow: hidden;
}

.sub-item {
  padding-left: 20px !important;
  height: 40px;

  .nav-text {
    font-size: 13px;
  }

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.08);
  }
}

/* Profile Dialog Styles */
.profile-dialog-body {
  padding: 10px 0;
}

.avatar-section {
  text-align: center;
  margin-bottom: $spacing-lg;
}

.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto $spacing-sm;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid $border-glass;
  cursor: pointer;

  &:hover .avatar-overlay {
    opacity: 1;
  }
}

.large-avatar,
.avatar-placeholder.large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder.large {
  font-size: 40px;
  background: #333;
  @include flex-center;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  @include flex-center;
  opacity: 0;
  transition: all 0.2s;
}

.upload-hint {
  font-size: 13px;
  color: $text-muted;
}

.g-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.g-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  width: 100%;

  &>* {
    flex: 1;
  }
}

.admin-item {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;

  &:hover {
    background: rgba(255, 215, 0, 0.1);
    color: #ffd700;
  }

  &.active {
    background: rgba(255, 215, 0, 0.15);
    color: #ffd700;
  }
}

.nav-group {
  display: flex;
  flex-direction: column;
}
</style>
