<template>
  <nav class="app-navbar glass">
    <div class="navbar-container">
      <div class="navbar-left">
        <NuxtLink to="/" class="brand">AntFlow</NuxtLink>     
        <div v-if="user" class="nav-links">
          <NuxtLink to="/dashboard" class="nav-link">{{ t('nav.dashboard') }}</NuxtLink>
          <NuxtLink to="/projects" class="nav-link">{{ t('nav.projects') }}</NuxtLink>
          <NuxtLink to="/gallery" class="nav-link">{{ t('nav.gallery') }}</NuxtLink>
        </div>
        <div v-else>
          <NuxtLink to="/" class="nav-link">{{ t('nav.home') }}</NuxtLink>
        </div>
      </div>

      <div class="navbar-right">
        <!-- Language Switcher -->
        <GDropdown trigger="click" @command="handleLanguageChange" popper-class="lang-dropdown">
          <div class="lang-switcher glass-dark">
            <ClientOnly>
              <vue-flag :code="currentFlag" :width="18" />
            </ClientOnly>
            <span class="lang-code">{{ currentLocale.toUpperCase() }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="lang in languages" :key="lang.code" :command="lang.code">
                <ClientOnly>
                  <vue-flag :code="lang.flag" :width="16" />
                </ClientOnly> {{ lang.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </GDropdown>

        <template v-if="user">
          <GDropdown trigger="click" @command="handleCommand">
            <div class="user-badge glass-dark">
              <span class="user-name">{{ user.name }}</span>
              <img v-if="user.avatar" :src="getFileUrl(user.avatar)" class="user-avatar" />
              <div v-else class="avatar-placeholder">{{ user.name.charAt(0) }}</div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <user-icon theme="outline" size="14" /> {{ t('common.profile') }}
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <key-icon theme="outline" size="14" /> {{ t('common.password') }}
                </el-dropdown-item>
                <el-dropdown-item command="logout" class="logout-item">
                  <logout-icon theme="outline" size="14" /> {{ t('common.logout') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </GDropdown>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="login-btn">{{ t('nav.signIn') }}</NuxtLink>
          <NuxtLink to="/register" class="login-btn">{{ t('nav.signUp') }}</NuxtLink>
        </template>
      </div>
    </div>

    <!-- Profile Dialog -->
    <GDialog
      v-model="profileDialogVisible"
      :title="t('profile.title')"
      width="460px"
    >
      <div class="profile-dialog-body">
        <div class="avatar-section">
          <div class="avatar-container" @click="fileInput?.click()">
            <img v-if="profileForm.avatar" :src="getFileUrl(profileForm.avatar)" class="large-avatar" />
            <div v-else class="avatar-placeholder large">{{ profileForm.name.charAt(0) }}</div>
            <input type="file" ref="fileInput" hidden accept="image/*" @change="handleAvatarUpload" />
            <div class="avatar-overlay">
              <camera theme="outline" size="20" />
            </div>
          </div>
          <p class="upload-hint">{{ t('profile.upload') }}</p>
        </div>

        <div class="g-form">
          <div class="g-form-item">
            <label>{{ t('profile.name') }}</label>
            <GInput v-model="profileForm.name" :placeholder="t('profile.name')" />
          </div>
          <div class="g-form-item">
            <label>{{ t('profile.email') }}</label>
            <GInput v-model="profileForm.email" disabled />
          </div>
          <div class="g-form-item">
            <label>{{ t('profile.language') }}</label>
            <GSelect 
              v-model="profileForm.preferredLanguage" 
              :options="languages.map(l => ({ label: l.name, value: l.code }))"
            />
          </div>
          <div class="g-form-item">
            <label>{{ t('profile.plan') }}</label>
            <div class="plan-display glass-dark">
              <span class="plan-name">
                {{ user?.subscription?.plan?.toUpperCase() || 'FREE' }}
                <span class="plan-sep">-</span>
              </span>
              <GButton type="text" size="sm" @click="goPricing">{{ t('profile.upgrade') }}</GButton>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <GButton size="lg" @click="profileDialogVisible = false">{{ t('profile.cancel') }}</GButton>
          <GButton type="primary" size="lg" @click="updateProfile" :loading="updating">
            {{ t('profile.save') }}
          </GButton>
        </div>
      </template>
    </GDialog>

    <!-- Change Password Dialog -->
    <GDialog
      v-model="passwordDialogVisible"
      :title="t('common.password')"
      width="420px"
    >
      <div class="g-form">
        <div class="g-form-item">
          <label>Current Password</label>
          <GInput v-model="passwordForm.current" type="password" placeholder="••••••••" />
        </div>
        <div class="g-form-item">
          <label>New Password</label>
          <GInput v-model="passwordForm.new" type="password" placeholder="••••••••" />
        </div>
        <div class="g-form-item">
          <label>Confirm New Password</label>
          <GInput v-model="passwordForm.confirm" type="password" placeholder="••••••••" />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <GButton size="lg" @click="passwordDialogVisible = false">{{ t('profile.cancel') }}</GButton>
          <GButton type="primary" size="lg" @click="changePassword" :loading="changingPassword">
            {{ t('common.password') }}
          </GButton>
        </div>
      </template>
    </GDialog>

    <Toaster position="top-right" theme="dark" />
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { User as UserIcon, Key as KeyIcon, Logout as LogoutIcon, Camera } from '@icon-park/vue-next'
import { useTranslations, type Locale } from '~/composables/useTranslations'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import GDropdown from '~/components/ui/GDropdown.vue' // Import GDropdown
import GDialog from '~/components/ui/GDialog.vue'
import GInput from '~/components/ui/GInput.vue'
import GSelect from '~/components/ui/GSelect.vue'
import GButton from '~/components/ui/GButton.vue'

const route = useRoute()
const { t, setLocale, currentLocale } = useTranslations()    

const fileInput = ref<HTMLElement | null>(null)

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/s3/${path}`
}

const user = ref<any>(null)
const isDashboard = computed(() => route.path.startsWith('/dashboard'))

// Languages
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
    updateLocaleOnServer(code)
  }
}

const updateLocaleOnServer = async (code: string) => {
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch('/api/auth/profile', {
      method: 'PUT',
      body: { preferredLanguage: code },
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    console.error('Failed to sync language preference')
  }
}

// Profile Dialog
const profileDialogVisible = ref(false)
const updating = ref(false)
const profileForm = reactive({
  name: '',
  email: '',
  avatar: '',
  preferredLanguage: 'en' as Locale
})

// Password Dialog
const passwordDialogVisible = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

const fetchUser = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    if (!token) return
    
    const { data } = await $fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = (data as any).user
    
    // Auto set language from user preference
    if (user.value.preferredLanguage) {
      setLocale(user.value.preferredLanguage)
    }
  } catch (error) {
    console.error('Failed to fetch user')
  }
}

const handleCommand = (command: string) => {
  if (command === 'profile') {
    Object.assign(profileForm, {
      name: user.value.name,
      email: user.value.email,
      avatar: user.value.avatar,
      preferredLanguage: user.value.preferredLanguage || 'en'
    })
    profileDialogVisible.value = true
  } else if (command === 'password') {
    passwordForm.value = { current: '', new: '', confirm: '' }
    passwordDialogVisible.value = true
  } else if (command === 'logout') {
    handleLogout()
  }
}

const handleLogout = () => {
  localStorage.removeItem('auth-token')
  window.location.href = '/login'
}

const updateProfile = async () => {
  updating.value = true
  try {
    const token = localStorage.getItem('auth-token')
    const { data } = await $fetch('/api/auth/profile', {
      method: 'PUT',
      body: {
        name: profileForm.name,
        avatar: profileForm.avatar,
        preferredLanguage: profileForm.preferredLanguage
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    
    user.value = (data as any).user
    setLocale(profileForm.preferredLanguage)
    toast.success(t('common.updateSuccess'))
    profileDialogVisible.value = false
  } catch (error: any) {
    toast.error(error.data?.message || t('common.failed'))
  } finally {
    updating.value = false
  }
}

const handleAvatarUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const token = localStorage.getItem('auth-token')
    // Unified upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('purpose', 'avatar')

    const { data } = await $fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` }
    }) as any

    profileForm.avatar = data.url
    toast.success('Avatar uploaded')
  } catch (error) {
    toast.error('Failed to upload avatar')
  }
}

const goPricing = () => {
  profileDialogVisible.value = false
  navigateTo('/#pricing')
}

const changePassword = async () => {
  if (!passwordForm.value.current || !passwordForm.value.new) {
    toast.error('Please fill in all fields')
    return
  }
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    toast.error('Passwords do not match')
    return
  }

  changingPassword.value = true
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: passwordForm.value,
      headers: { Authorization: `Bearer ${token}` }
    })
    toast.success('Password changed successfully')
    passwordDialogVisible.value = false
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to change password')
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  fetchUser()
  const savedLang = localStorage.getItem('preferred-language')
  if (savedLang) setLocale(savedLang as Locale)
})
</script>

<style lang="scss" scoped>
.app-navbar {
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border-glass;
  background: rgba(0, 0, 0, 0.8);
  @include glass-card;
  border-radius: 0;
  backdrop-filter: blur(20px);
}

.navbar-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 $spacing-lg;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 50px;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -1px;
  text-decoration: none;
  color: #fff;
}

.nav-links {
  display: flex;
  gap: $spacing-lg;
}

.nav-link {
  text-decoration: none;
  color: $text-secondary;
  font-weight: 500;
  font-size: 14px;
  transition: $transition-base;

  &:hover, &.router-link-active {
    color: #fff;
  }
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.lang-switcher, .user-badge {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 8px $spacing-md;
  border-radius: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $border-glass;
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.user-badge {
  padding: 6px 6px 6px 16px;
}

.lang-code, .user-name {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
}

.user-avatar, .avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  background: #fff;
  color: #000;
  @include flex-center;
  font-weight: 700;
  font-size: 12px;

  &.large {
    font-size: 40px;
  }
}

.login-btn {
  text-decoration: none;
  color: #000;
  background: #fff;
  padding: 10px 24px;
  border-radius: 40px;
  font-weight: 700;
  font-size: 14px;
  transition: $transition-base;

  &:hover {
    transform: scale(1.05);
  }
}

/* Profile Dialog specific */
.profile-dialog-body {
  padding: 10px 0;
}

.avatar-section {
  text-align: center;
  margin-bottom: 30px;
}

.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 12px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;

  &:hover .avatar-overlay {
    opacity: 1;
  }
}

.large-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-weight: 500;
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

.plan-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: $radius-md;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.plan-name {
  font-weight: 800;
  font-size: 14px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-sep {
  opacity: 0.3;
  font-weight: 400;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  width: 100%;
  
  & > * {
    flex: 1;
  }
}
</style>
