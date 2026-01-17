<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="brand-section" v-if="!collapsed">
        <NuxtLink to="/" class="brand">AntFlow</NuxtLink>
      </div>
      <button class="toggle-btn" @click="collapsed = !collapsed">
        <menu-unfold v-if="collapsed" theme="outline" size="20" />
        <menu-fold v-else theme="outline" size="20" />
      </button>
    </div>

    <div class="sidebar-content">
      <nav class="nav-section">
        <NuxtLink to="/dashboard" class="nav-item" :class="{ active: route.path === '/dashboard' }">
          <dashboard-one theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.dashboard') }}</span>
        </NuxtLink>
        <NuxtLink to="/projects" class="nav-item" :class="{ active: route.path.startsWith('/projects') }">
          <folder-open theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.projects') }}</span>
        </NuxtLink>
        <NuxtLink to="/gallery" class="nav-item" :class="{ active: route.path === '/gallery' }">
          <video-two theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.gallery') }}</span>
        </NuxtLink>
        <NuxtLink to="/resources" class="nav-item" :class="{ active: route.path === '/resources' }">
          <book-one theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.resources') }}</span>
        </NuxtLink>
        
        <div class="nav-group" v-if="user?.role === 'admin'">
          <div 
            class="nav-item admin-item" 
            :class="{ 'active': route.path.startsWith('/admin') && !adminMenuOpen }"
            @click="toggleAdminMenu"
          >
            <setting theme="outline" size="20" />
            <span v-if="!collapsed" class="nav-text flex-1">{{ t('nav.admin') }}</span>
            <down v-if="!collapsed && adminMenuOpen" theme="outline" size="16" />
            <right v-if="!collapsed && !adminMenuOpen" theme="outline" size="16" />
          </div>

          <div v-show="!collapsed && adminMenuOpen" class="submenu">
            <NuxtLink 
              to="/admin" 
              class="nav-item sub-item" 
              :class="{ active: route.path === '/admin' }"
            >
              <dashboard-one theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.dashboard') }}</span>
            </NuxtLink>
            
            <NuxtLink 
              to="/admin/users" 
              class="nav-item sub-item" 
              :class="{ active: route.path.startsWith('/admin/users') }"
            >
              <user-icon theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.users') }}</span>
            </NuxtLink>
            
            <NuxtLink 
              to="/admin/settings" 
              class="nav-item sub-item" 
              :class="{ active: route.path.startsWith('/admin/settings') }"
            >
              <setting theme="outline" size="18" />
              <span class="nav-text">{{ t('nav.settings') }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <!-- Language Switcher -->
        <!-- <GDropdown placement="right">
          <div class="footer-item glass-dark clickable">
            <ClientOnly>
              <vue-flag :code="currentFlag" width="18" />
            </ClientOnly>
            <span v-if="!collapsed" class="nav-text">{{ currentLocale.toUpperCase() }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="lang in languages"
                :key="lang.code"
                :disabled="lang.code === currentLocale"
                @click="handleLanguageChange(lang.code)"
              >
                <ClientOnly>
                  <vue-flag :code="lang.flag" width="16" />
                </ClientOnly> {{ lang.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </GDropdown> -->

        <div class="footer-item glass-dark clickable" @click="handleCommand('profile')">
          <el-avatar :src="getFileUrl(user?.avatar)" :size="20">
            <user-icon theme="outline" size="20" />
          </el-avatar>
          <span v-if="!collapsed" class="nav-text text-truncate">{{ user?.name || t('common.profile') }}</span>
        </div>

        <!-- <NuxtLink to="/subscription" class="footer-item glass-dark">
          <vip theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('nav.subscription') }}</span>
        </NuxtLink> -->

        <div class="footer-item glass-dark clickable logout-item" @click="handleLogout">
          <logout-icon theme="outline" size="20" />
          <span v-if="!collapsed" class="nav-text">{{ t('common.logout') }}</span>
        </div>
      </div>
    </div>

    <!-- Account Dialog -->
    <AccountDialog
      v-model="accountDialogVisible"
      :user="user"
      @update-user="user = $event"
      @logout="handleLogout"
      fullscreen
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
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
  Right
} from '@icon-park/vue-next'
import { useTranslations, type Locale } from '~/composables/useTranslations'
import { toast } from 'vue-sonner'
import GDropdown from '~/components/ui/GDropdown.vue'
import AccountDialog from '~/components/AccountDialog.vue'

const props = defineProps<{}>()

const route = useRoute()
const { t, setLocale, currentLocale } = useTranslations()

// Shared state
const collapsed = useState('sidebar-collapsed', () => false)
const adminMenuOpen = ref(false)

const user = ref<any>(null)

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

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/s3/${path}`
}

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

const handleLanguageChange = (code: string) => {
  setLocale(code as Locale)
  if (user.value) {
    handleLocaleUpdateOnServer(code)
  }
}

const handleLocaleUpdateOnServer = async (code: string) => {
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch('/api/auth/profile', {
      method: 'PUT',
      body: { preferredLanguage: code },
      headers: { Authorization: `Bearer ${token}` }
    })
    if (user.value) {
      user.value.preferredLanguage = code
    }
  } catch (error) {
    console.error('Failed to sync language preference')
  }
}

const accountDialogVisible = ref(false)

const fetchUser = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    if (!token) return
    
    const { data } = await $fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = (data as any).user
    
    if (user.value.preferredLanguage) {
      setLocale(user.value.preferredLanguage)
    }
  } catch (error) {
    console.error('Failed to fetch user')
  }
}

const handleCommand = (command: string) => {
  if (command === 'profile') {
    accountDialogVisible.value = true
  }
}

const handleLogout = () => {
  localStorage.removeItem('auth-token')
  window.location.href = '/login'
}

onMounted(fetchUser)
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

  &:hover, &.active {
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
  
  &:hover, &.active {
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

.large-avatar, .avatar-placeholder.large {
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
  
  & > * {
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
