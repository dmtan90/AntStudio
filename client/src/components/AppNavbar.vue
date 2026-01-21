<template>
  <nav class="app-navbar glass">
    <div class="navbar-container">
      <div class="navbar-left">
        <router-link to="/" class="brand">AntFlow</router-link>     
        <div v-if="user" class="nav-links">
          <template v-if="isHomePage">
            <a v-for="link in landingLinks" :key="link.id" :href="link.to" class="nav-link" :class="{ active: activeSection === link.id }" @click.prevent="scrollToSection(link.id)">
              {{ t(`nav.${link.id}`) }}
            </a>
          </template>
          <template v-else>
            <router-link to="/dashboard" class="nav-link">{{ t('nav.dashboard') }}</router-link>
            <router-link to="/projects" class="nav-link">{{ t('nav.projects') }}</router-link>
            <router-link to="/gallery" class="nav-link">{{ t('nav.gallery') }}</router-link>
          </template>
        </div>
        <div v-else class="nav-links">
          <a v-if="isHomePage" v-for="link in landingLinks" :key="link.id" :href="link.to" class="nav-link" :class="{ active: activeSection === link.id }" @click.prevent="scrollToSection(link.id)">
            {{ t(`nav.${link.id}`) }}
          </a>
          <router-link v-else to="/" class="nav-link">{{ t('nav.home') }}</router-link>
        </div>
      </div>

      <div class="navbar-right">
        <!-- Language Switcher -->
        <GDropdown trigger="hover" @command="handleLanguageChange" popper-class="lang-dropdown">
          <div class="lang-switcher glass-dark">
            <vue-flag :code="currentFlag" width="18" />
            <span class="lang-code">{{ currentLocale.toUpperCase() }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="lang in languages" :key="lang.code" :command="lang.code">
                <vue-flag :code="lang.flag" width="16" /> {{ lang.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </GDropdown>

        <template v-if="user">
          <!-- Credit Display with Popover -->
          <GPopover trigger="hover" placement="bottom" :width="300">
            <template #reference>
              <div class="credit-badge glass-dark">
                <ticket theme="outline" size="16" />
                <span class="credit-count">{{ totalCredits }}</span>
                <span class="credit-label">{{ user.subscription?.plan?.toUpperCase() || 'FREE' }}</span>
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
                  <span class="credit-value">{{ user.credits?.weekly || 500 }}</span>
                </div>
              </div>
            </div>
          </GPopover>

          <GDropdown trigger="click" @command="handleCommand">
            <div class="user-badge glass-dark">
              <span class="user-name">{{ user.name }}</span>
              <GMedia v-if="user.avatar" :src="user.avatar" class="user-avatar" />
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
          <router-link to="/login" class="login-btn">{{ t('nav.signIn') }}</router-link>
          <router-link to="/register" class="login-btn">{{ t('nav.signUp') }}</router-link>
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
            <GMedia v-if="profileForm.avatar" :src="profileForm.avatar" class="large-avatar" />
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
              v-model="profileForm.language" 
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
              <GButton link size="sm" @click="goPricing">{{ t('profile.upgrade') }}</GButton>
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

    <!-- Subscription Plans Dialog -->
    <SubscriptionPlansDialog
      v-model="subscriptionDialogVisible"
      @select="handlePlanSelection"
    />

    <Toaster position="top-right" theme="dark" />
  </nav>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, computed, reactive, watch, onUnmounted } from 'vue'
import { User as UserIcon, Key as KeyIcon, Logout as LogoutIcon, Camera, Ticket, Diamond } from '@icon-park/vue-next'
import { useTranslations, type Locale } from '@/composables/useTranslations'
import { Toaster, toast } from 'vue-sonner'
import 'vue-sonner/style.css'
import api, { getFileUrl } from '@/utils/api.js'
import GDropdown from '@/components/ui/GDropdown.vue' 
import GPopover from '@/components/ui/GPopover.vue'
import GDialog from '@/components/ui/GDialog.vue'
import GInput from '@/components/ui/GInput.vue'
import GSelect from '@/components/ui/GSelect.vue'
import GButton from '@/components/ui/GButton.vue'
import GMedia from '@/components/ui/GMedia.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import SubscriptionPlansDialog from '@/components/subscription/SubscriptionPlansDialog.vue'

const router = useRouter()
const route = useRoute()
const { t, setLocale, currentLocale } = useTranslations()    
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const fileInput = ref<HTMLElement | null>(null)



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

// Credit Popover
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
  // TODO: Handle checkout
  subscriptionDialogVisible.value = false
}

// Profile Dialog
const profileDialogVisible = ref(false)
const updating = ref(false)
const profileForm = reactive({
  name: '',
  email: '',
  avatar: '',
  language: 'en' as Locale
})

// Password Dialog
const passwordDialogVisible = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

const handleCommand = (command: string) => {
  if (!user.value) return
  
  if (command === 'profile') {
    Object.assign(profileForm, {
      name: user.value.name,
      email: user.value.email,
      avatar: user.value.avatar,
      language: user.value.language || 'en'
    })
    profileDialogVisible.value = true
  } else if (command === 'password') {
    passwordForm.value = { current: '', new: '', confirm: '' }
    passwordDialogVisible.value = true
  } else if (command === 'logout') {
    userStore.logout()
  }
}

const updateProfile = async () => {
  updating.value = true
  try {
    await userStore.updateProfile({
      name: profileForm.name,
      avatar: profileForm.avatar,
      language: profileForm.language
    })
    
    setLocale(profileForm.language)
    toast.success(t('common.updateSuccess'))
    profileDialogVisible.value = false
  } catch (error: any) {
    toast.error(error.response?.data?.message || t('common.failed'))
  } finally {
    updating.value = false
  }
}

const handleAvatarUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('purpose', 'avatar')

    const response = await api.post('/media/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      }
    })

    profileForm.avatar = response.data.url
    toast.success('Avatar uploaded')
  } catch (error) {
    toast.error('Failed to upload avatar')
  }
}

const goPricing = () => {
  profileDialogVisible.value = false
  router.push('/#pricing')
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
    await userStore.changePassword({
        current: passwordForm.value.current,
        new: passwordForm.value.new
    })
    toast.success('Password changed successfully')
    passwordDialogVisible.value = false
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to change password')
  } finally {
    changingPassword.value = false
  }
}

const isHomePage = computed(() => route.path === '/')
const activeSection = ref('overview')
let observer: IntersectionObserver | null = null

const scrollToSection = (id: string) => {
  if (!isHomePage.value) {
    router.push({ path: '/', hash: `#${id}` })
    return
  }

  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    activeSection.value = id
  }
}

const setupScrollSpy = () => {
  if (observer) observer.disconnect()
  
  const observerOptions = {
    root: null,
    rootMargin: '-50% 0px -50% 0px',
    threshold: 0
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    })
  }, observerOptions)

  document.querySelectorAll('section[id]').forEach((section) => {
    observer?.observe(section)
  })
}

const cleanupScrollSpy = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

const landingLinks = [
  { id: 'overview', to: '#overview' },
  { id: 'capabilities', to: '#capabilities' },
  { id: 'partners', to: '#partners' },
  { id: 'gallery', to: '#gallery' },
  { id: 'pricing', to: '#pricing' }
]

watch(isHomePage, (newVal) => {
  if (newVal) {
    // Small delay to ensure DOM is ready if navigating back
    setTimeout(setupScrollSpy, 100)
  } else {
    cleanupScrollSpy()
  }
}, { immediate: true })

onMounted(() => {
  userStore.fetchProfile()
  const savedLang = localStorage.getItem('preferred-language')
  if (savedLang) setLocale(savedLang as Locale)
})

onUnmounted(() => {
  cleanupScrollSpy()
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

  &:hover, &.router-link-active, &.active {
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

// Credit Badge & Popover
.credit-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 40px;
  background: linear-gradient(135deg, #ffab00 0%, #ff6d00 100%);
  border: none;
  cursor: pointer;
  transition: $transition-base;
  box-shadow: 0 4px 12px rgba(255, 171, 0, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 171, 0, 0.3);
  }

  .credit-count {
    font-weight: 800;
    font-size: 14px;
    color: #000;
  }

  .credit-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    opacity: 0.8;
    color: #000;
  }
}

.credit-popover-content {
  min-width: 260px;

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .user-name-pop {
      font-weight: 700;
      font-size: 15px;
      color: #fff;
    }

    .user-email {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .upgrade-btn-pop {
    width: 100%;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .credit-section {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .credit-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .credit-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);

      .credit-value {
        font-weight: 700;
        color: #fff;
      }

      .reset-info {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
    }
  }
}
</style>
