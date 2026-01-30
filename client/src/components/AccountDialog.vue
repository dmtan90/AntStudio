<template>
  <GDialog v-model="visible" :title="t('account.title')" width="1000px" class="account-dialog">
    <div class="account-container">
      <!-- Sidebar Navigation -->
      <div class="account-sidebar">
        <div class="user-info-brief">
          <div class="avatar-wrapper">
            <img v-if="user?.avatar" :src="getFileUrl(user.avatar)" class="user-avatar" />
            <div v-else class="avatar-placeholder">{{ user?.name?.charAt(0) }}</div>
          </div>
          <div class="user-meta">
            <h4>{{ user?.name }}</h4>
            <p>{{ user?.email }}</p>
          </div>
        </div>

        <nav class="account-nav">
          <div v-for="item in menuItems" :key="item.id" class="nav-item"
            :class="{ active: currentTab === item.id, 'signout': item.id === 'signout' }"
            @click="handleMenuClick(item.id)">
            <component :is="item.icon" theme="outline" size="18" />
            <span>{{ t(`account.menu.${item.id}`) }}</span>
          </div>
        </nav>
      </div>

      <!-- Main Content Area -->
      <div class="account-content">
        <!-- Edit Profile Section -->
        <div v-if="currentTab === 'profile'" class="content-section">
          <h3>{{ t('account.menu.profile') }}</h3>
          <div class="profile-edit-body">
            <div class="avatar-upload-section">
              <div class="avatar-container" @click="fileInputRef?.click()">
                <img v-if="profileForm.avatar" :src="getFileUrl(profileForm.avatar)" class="large-avatar" />
                <div v-else class="avatar-placeholder large">{{ profileForm.name.charAt(0) }}</div>
                <input type="file" ref="fileInputRef" hidden accept="image/*" @change="handleAvatarUpload" />
                <div class="avatar-overlay">
                  <camera theme="outline" size="20" />
                </div>
              </div>
              <p class="upload-hint">{{ t('profile.upload') }}</p>
            </div>

            <div class="g-form ml-auto mr-auto">
              <div class="g-form-item">
                <label>{{ t('profile.name') }}</label>
                <GInput v-model="profileForm.name" />
              </div>
              <div class="g-form-item">
                <label>{{ t('profile.email') }}</label>
                <GInput v-model="profileForm.email" disabled />
              </div>
              <div class="g-form-item">
                <label>{{ t('profile.language') }}</label>
                <GSelect v-model="profileForm.language"
                  :options="languages.map(l => ({ label: l.name, value: l.code }))" :teleported="false">
                  <template #label="{ label, value }">
                    <vue-flag :code="languages.find(l => l.code === value)?.flag || 'us'" width="16" />
                    <span class="ml-1">{{ label }}</span>
                  </template>
                  <template #option="{ label, value }">
                    <vue-flag :code="languages.find(l => l.code === value)?.flag || 'us'" width="16" />
                    <span class="ml-1">{{ label }}</span>
                  </template>
                </GSelect>
              </div>
              <div class="g-form-item">
                <label>{{ t('common.password') }}</label>
                <GButton @click="showPasswordDialog = true">{{ t('common.password') }}</GButton>
              </div>
            </div>

            <div class="section-actions text-center">
              <GButton type="primary" size="lg" @click="updateProfile" :loading="updating">
                {{ t('profile.save') }}
              </GButton>
            </div>
          </div>
        </div>

        <!-- Credits Details Section -->
        <div v-if="currentTab === 'credits'" class="content-section">
          <h3>{{ t('account.credits.title') }}</h3>

          <!-- Credit Balance Equation Dashboard -->
          <div class="credits-dashboard glass-dark">
            <div class="credit-box main">
              <span class="label">{{ t('account.credits.balance') }}</span>
              <span class="value">{{ user?.credits?.balance || 0 }}</span>
            </div>
            <div class="equation-operator">=</div>
            <div class="credit-box">
              <span class="label">{{ t('account.credits.membership') }}
                <info theme="outline" size="12" />
              </span>
              <span class="value">{{ user?.credits?.membership || 0 }}</span>
            </div>
            <div class="equation-operator">+</div>
            <div class="credit-box">
              <span class="label">{{ t('account.credits.bonus') }}
                <info theme="outline" size="12" />
              </span>
              <span class="value">{{ user?.credits?.bonus || 0 }}</span>
            </div>
            <div class="equation-operator">+</div>
            <div class="credit-box">
              <span class="label">{{ t('account.credits.weekly') }}
                <info theme="outline" size="12" />
              </span>
              <span class="value">{{ user?.credits?.weekly || 0 }}</span>
            </div>
          </div>

          <!-- Transaction List -->
          <div class="credits-history">
            <div class="history-tabs">
              <GSegmented v-model="historyFilter" :options="[
                { label: t('account.credits.all'), value: 'all' },
                { label: t('account.credits.consumed'), value: 'consumed' },
                { label: t('account.credits.obtained'), value: 'obtained' }
              ]" />
            </div>

            <div class="history-list">
              <el-empty v-if="loadingHistory" class="history-loading" :v-loading="loadingHistory"
                description="No transactions found" />
              <template v-else>
                <div v-for="(log, idx) in filteredLogs" :key="idx" class="history-item">
                  <div class="item-info">
                    <p class="desc">{{ log.description }}</p>
                    <p class="date">{{ formatDate(log.timestamp) }}</p>
                  </div>
                  <div class="item-amount" :class="log.type">
                    {{ log.type === 'obtained' ? '+' : '-' }} {{ log.amount }}
                  </div>
                </div>
                <div v-if="filteredLogs.length === 0" class="empty-state">
                  No transactions found
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Price Details Section -->
        <div v-if="currentTab === 'price'" class="content-section">
          <div class="price-header text-center">
            <h3>Model Pricing Table</h3>
            <p class="text-muted">Dynamic model costs based on current platform settings.</p>
          </div>

          <div class="pricing-table-container">
            <div v-if="loadingConfig" class="p-10 text-center">
              <el-empty :v-loading="true" description="Loading pricing..." />
            </div>
            <table v-else class="pricing-table">
              <thead>
                <tr>
                  <th>Classification</th>
                  <th>Model</th>
                  <th>Price</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(typeLabel, typeKey) in taskTypes" :key="typeKey">
                  <tr v-if="getModelsByType(typeKey)" class="category-row">
                    <td :rowspan="getModelsByType(typeKey).length">
                      {{ typeLabel }}
                      <div v-if="typeKey === 'text'"><small>(Agent Dialogue & Script Creation)</small></div>
                    </td>
                    <td>{{ getModelsByType(typeKey).modelId }}</td>
                    <td>{{ getModelsByType(typeKey).creditCost }} Credits / {{ getUnit(typeKey) }}</td>
                    <td :rowspan="getModelsByType(typeKey).length">
                      <ul>
                        <li v-if="typeKey === 'image' || typeKey === 'text'">Beta Free (Limited) for subscribers</li>
                        <li>Free quota varies by subscription plan</li>
                        <li v-if="typeKey === 'video'">High quality generation</li>
                      </ul>
                    </td>
                  </tr>
                  <!-- <tr v-for="model in getModelsByType(typeKey)" :key="model.id">
                    <td>{{ model.modelId }}</td>
                    <td>{{ model.creditCost }} Credits / {{ getUnit(typeKey) }}</td>
                  </tr> -->
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Integrations Section -->
        <div v-if="currentTab === 'integrations'" class="content-section">
          <h3>{{ t('account.menu.integrations') }}</h3>

          <div class="integrations-grid">
            <!-- YouTube Integration -->
            <div class="integration-card glass-dark">
              <div class="integration-header">
                <div class="integration-icon youtube">
                  <youtube theme="filled" size="32" />
                </div>
                <div class="integration-info">
                  <h4>YouTube</h4>
                  <p v-if="user?.socialAccounts?.youtube?.channelId" class="connected">
                    <check-one theme="filled" size="16" fill="#52c41a" />
                    Connected
                  </p>
                  <p v-else class="disconnected">Not connected</p>
                </div>
              </div>
              <div class="integration-actions">
                <GButton v-if="!user?.socialAccounts?.youtube?.channelId" type="primary"
                  @click="connectSocial('youtube')" :loading="connectingYoutube">
                  Connect YouTube
                </GButton>
                <GButton v-else @click="disconnectSocial('youtube')" :loading="disconnectingYoutube">
                  Disconnect
                </GButton>
              </div>
            </div>

            <!-- Facebook Integration -->
            <div class="integration-card glass-dark">
              <div class="integration-header">
                <div class="integration-icon facebook">
                  <facebook theme="filled" size="32" />
                </div>
                <div class="integration-info">
                  <h4>Facebook</h4>
                  <p v-if="user?.socialAccounts?.facebook?.pageId" class="connected">
                    <check-one theme="filled" size="16" fill="#52c41a" />
                    Connected
                  </p>
                  <p v-else class="disconnected">Not connected</p>
                </div>
              </div>
              <div class="integration-actions">
                <GButton v-if="!user?.socialAccounts?.facebook?.pageId" type="primary"
                  @click="connectSocial('facebook')" :loading="connectingFacebook">
                  Connect Facebook
                </GButton>
                <GButton v-else @click="disconnectSocial('facebook')" :loading="disconnectingFacebook">
                  Disconnect
                </GButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Section -->
        <div v-if="currentTab === 'notification'" class="content-section">
          <h3>{{ t('account.menu.notification') }}</h3>
          <div class="notification-settings">
            <div class="setting-item glass-dark">
              <div class="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive emails about your account activity and updates.</p>
              </div>
              <GSwitch v-model="notifications.email" />
            </div>

            <div class="setting-item glass-dark">
              <div class="setting-info">
                <h4>Project Updates</h4>
                <p>Get notified when your video generation is complete.</p>
              </div>
              <GSwitch v-model="notifications.projectUpdates" />
            </div>

            <div class="setting-item glass-dark">
              <div class="setting-info">
                <h4>Marketing Emails</h4>
                <p>Receive updates about new features and promotions.</p>
              </div>
              <GSwitch v-model="notifications.marketing" />
            </div>

            <div class="setting-item glass-dark">
              <div class="setting-info">
                <h4>Security Alerts</h4>
                <p>Get notified about suspicious login attempts.</p>
              </div>
              <GSwitch v-model="notifications.security" />
            </div>
          </div>
        </div>

        <!-- Terms & Privacy -->
        <div v-if="currentTab === 'terms'" class="content-section legal-section">
          <Terms embedded />
        </div>

        <div v-if="currentTab === 'privacy'" class="content-section legal-section">
          <Privacy embedded />
        </div>

      </div>
    </div>

    <!-- Password Change Dialog -->
    <GDialog v-model="showPasswordDialog" :title="t('common.password')" width="460px">
      <div class="password-dialog-body">
        <div class="g-form">
          <div class="g-form-item">
            <label>{{ t('password.current') }}</label>
            <GInput v-model="passwordForm.currentPassword" type="password"
              :placeholder="t('password.currentPlaceholder')" />
          </div>
          <div class="g-form-item">
            <label>{{ t('password.new') }}</label>
            <GInput v-model="passwordForm.newPassword" type="password" :placeholder="t('password.newPlaceholder')" />
          </div>
          <div class="g-form-item">
            <label>{{ t('password.confirm') }}</label>
            <GInput v-model="passwordForm.confirmPassword" type="password"
              :placeholder="t('password.confirmPlaceholder')" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer flex flex-row justify-center gap-2">
          <GButton size="lg" @click="showPasswordDialog = false">{{ t('profile.cancel') }}</GButton>
          <GButton type="primary" size="lg" @click="updatePassword" :loading="updatingPassword">
            {{ t('password.update') }}
          </GButton>
        </div>
      </template>
    </GDialog>
  </GDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import {
  User as UserIcon,
  Message,
  Wallet,
  TableFile,
  DocDetail,
  Shield,
  Logout,
  Camera,
  Info,
  CheckOne,
  Connection,
  Youtube,
  Facebook
} from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import { getFileUrl } from '@/utils/api.js'
import GDialog from '@/components/ui/GDialog.vue'
import GInput from '@/components/ui/GInput.vue'
import GSelect from '@/components/ui/GSelect.vue'
import GButton from '@/components/ui/GButton.vue'
import GSwitch from '@/components/ui/GSwitch.vue'
import GSegmented from '@/components/ui/GSegmented.vue'
import Terms from '@/views/general/Terms.vue'
import Privacy from '@/views/general/Privacy.vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'logout'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { t, setLocale } = useTranslations()
const userStore = useUserStore()
const { user, creditLogs, loadingHistory } = storeToRefs(userStore)

const configStore = useConfigStore()
const { aiSettings, loading: loadingConfig } = storeToRefs(configStore)

const currentTab = ref('profile')
const historyFilter = ref('all')
const updating = ref(false)
const updatingPassword = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showPasswordDialog = ref(false)
const connectingYoutube = ref(false)
const connectingFacebook = ref(false)
const disconnectingYoutube = ref(false)
const disconnectingFacebook = ref(false)

const profileForm = reactive({
  name: '',
  email: '',
  avatar: '',
  language: 'en'
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const notifications = reactive({
  email: true,
  projectUpdates: true,
  marketing: false,
  security: true
})

const menuItems = [
  { id: 'profile', icon: UserIcon },
  { id: 'notification', icon: Message },
  { id: 'credits', icon: Wallet },
  { id: 'integrations', icon: Connection },
  { id: 'price', icon: TableFile },
  { id: 'terms', icon: DocDetail },
  { id: 'privacy', icon: Shield },
  { id: 'signout', icon: Logout }
]

const languages = [
  { code: 'en', name: 'English', flag: 'us' },
  { code: 'vi', name: 'Tiếng Việt', flag: 'vn' },
  { code: 'zh', name: '简体中文', flag: 'cn' },
  { code: 'ja', name: '日本語', flag: 'jp' },
  { code: 'es', name: 'Español', flag: 'es' }
]

watch(() => currentTab.value, (newTab) => {
  if (newTab === 'credits') {
    userStore.fetchCreditHistory()
  }
  if (newTab === 'price') {
    configStore.fetchPlans()
  }
})

watch(() => props.modelValue, (val) => {
  if (val && user.value) {
    if (currentTab.value === 'credits') {
      userStore.fetchCreditHistory()
    }
    if (currentTab.value === 'price') {
      configStore.fetchPlans()
    }
    Object.assign(profileForm, {
      name: user.value.name,
      email: user.value.email,
      avatar: user.value.avatar,
      language: user.value.language || 'en'
    })
  }
})

const handleMenuClick = (id: string) => {
  if (id === 'signout') {
    userStore.logout()
  } else {
    currentTab.value = id
  }
}



const formatDate = (date: any) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const filteredLogs = computed(() => {
  if (!creditLogs.value) return []
  let logs = [...creditLogs.value]
  if (historyFilter.value === 'consumed') {
    return logs.filter(l => l.type === 'consumed')
  }
  if (historyFilter.value === 'obtained') {
    return logs.filter(l => l.type === 'obtained')
  }
  return logs
})

const updateProfile = async () => {
  updating.value = true
  try {
    const response = await userStore.updateProfile({
      name: profileForm.name,
      avatar: profileForm.avatar,
      language: profileForm.language
    })

    setLocale(profileForm.language as any)
    toast.success(t('common.updateSuccess'))
  } catch (error: any) {
    toast.error(error.response?.data?.message || t('common.failed'))
  } finally {
    updating.value = false
  }
}

const billingCycle = ref<'monthly' | 'yearly'>('monthly')

const handleUpgrade = async (planId: string) => {
  try {
    toast.info(`Initiating upgrade to ${planId}...`)

    // Using userStore for checkout
    const data = await userStore.createCheckoutSession({ planId, billingCycle: billingCycle.value })

    // API returns { data: { url: ... } } or just { url: ... } depending on endpoint standard
    if (data?.data?.url || data?.url) {
      window.location.href = data.data?.url || data.url
    } else {
      toast.success(`Successfully upgraded to ${planId}! (Simulation)`)
      await userStore.fetchProfile(true)
    }
  } catch (error: any) {
    toast.error('Failed to initiate upgrade')
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

    const data = await userStore.uploadAvatar(formData)

    profileForm.avatar = data.url
    toast.success('Avatar uploaded')
  } catch (error) {
    toast.error('Failed to upload avatar')
  }
}

const updatePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.error(t('password.mismatch'))
    return
  }

  if (passwordForm.newPassword.length < 6) {
    toast.error(t('password.tooShort'))
    return
  }

  updatingPassword.value = true
  try {
    await userStore.changePassword({
      current: passwordForm.currentPassword,
      new: passwordForm.newPassword
    })

    toast.success(t('password.success'))
    showPasswordDialog.value = false

    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    toast.error(error.response?.data?.message || t('password.failed'))
  } finally {
    updatingPassword.value = false
  }
}

const connectSocial = async (provider: 'youtube' | 'facebook') => {
  if (provider === 'youtube') connectingYoutube.value = true
  else connectingFacebook.value = true

  try {
    const data = await userStore.connectSocial(provider)

    if (data?.url) {
      window.location.href = data.url
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || `Failed to connect ${provider}`)
    if (provider === 'youtube') connectingYoutube.value = false
    else connectingFacebook.value = false
  }
}

const disconnectSocial = async (provider: 'youtube' | 'facebook') => {
  if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return

  if (provider === 'youtube') disconnectingYoutube.value = true
  else disconnectingFacebook.value = true

  try {
    await userStore.disconnectSocial(provider)
    await userStore.fetchProfile()
    toast.success(`${provider} disconnected successfully`)
  } catch (error: any) {
    toast.error(error.response?.data?.message || `Failed to disconnect ${provider}`)
  } finally {
    if (provider === 'youtube') disconnectingYoutube.value = false
    else disconnectingFacebook.value = false
  }
}
const getModelsByType = (type: string) => {
  // if (!aiSettings.value?.defaults?.[type]) return []
  console.log(type, aiSettings.value?.defaults?.[type]);
  return aiSettings.value?.defaults?.[type]
}

const getUnit = (type: string) => {
  switch (type) {
    case 'video': return 'Video (8s)'
    case 'text': return 'Chat'
    case 'audio': return 'Generation'
    default: return 'Image'
  }
}

const taskTypes = {
  text: 'LLM',
  image: 'Image Generation',
  video: 'Video Generation',
  audio: 'Audio/Speech',
  music: 'Music Generation'
}
</script>

<style lang="scss" scoped>
@use "@/assets/scss/mixins" as *;

/* Plan Grid Styles */
.billing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
  margin-top: $spacing-md;

  span {
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: rgba($text-muted, 0.6);
    transition: all 0.2s;

    &.active {
      color: #fff;
    }
  }

  .discount {
    color: #52c41a;
    font-weight: 800;
  }
}

.toggle-switch {
  width: 48px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  position: relative;
  cursor: pointer;

  .switch-handle {
    position: absolute;
    top: 2px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.monthly {
      left: 2px;
    }

    &.yearly {
      left: 26px;
    }
  }
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
  margin-top: $spacing-lg;
}

.plan-card {
  padding: $spacing-lg $spacing-md;
  border-radius: $radius-lg;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.02);

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.04);
  }

  &.featured {
    border-color: rgba($brand-accent, 0.5);
    background: linear-gradient(180deg, rgba($brand-accent, 0.05) 0%, rgba(0, 0, 0, 0) 100%);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      border: 1px solid rgba($brand-accent, 0.3);
      pointer-events: none;
    }
  }

  &.current {
    &::before {
      content: 'CHOSEN';
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      color: #000;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 800;
    }
  }
}

.featured-badge {
  position: absolute;
  top: -12px;
  right: $spacing-md;
  background: $brand-accent;
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.plan-header {
  text-align: center;
  margin-bottom: $spacing-lg;

  .plan-name {
    font-size: 12px;
    font-weight: 800;
    color: rgba($text-muted, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .plan-price {
    margin: $spacing-sm 0;

    .currency {
      font-size: 18px;
      vertical-align: top;
      margin-top: 6px;
      display: inline-block;
    }

    .amount {
      font-size: 36px;
      font-weight: 800;
    }

    .period {
      font-size: 14px;
      color: $text-muted;
    }
  }

  .plan-credits {
    font-size: 13px;

    strong {
      font-size: 18px;
      color: #fff;
      margin-right: 4px;
    }

    .credit-icon {
      font-size: 12px;
    }
  }
}

.plan-features {
  margin-top: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    font-size: 12px;
    color: rgba($text-muted, 0.8);

    i {
      color: #52c41a;
      margin-top: 2px;
    }

    span {
      line-height: 1.4;
    }
  }
}

.plan-button-wrapper {
  margin-top: auto;
  padding-top: $spacing-lg;
}

.mt-xl {
  margin-top: $spacing-xl;
}

.account-container {
  display: flex;
  height: 650px;
  background: rgba($bg-dark, 0.4);
}

/* Sidebar Styling */
.account-sidebar {
  width: 250px;
  border-right: 1px solid $border-glass;
  padding: $spacing-lg 0;
  display: flex;
  flex-direction: column;
}

.user-info-brief {
  padding: 0 $spacing-lg $spacing-xl;
  display: flex;
  align-items: center;
  gap: $spacing-md;

  .avatar-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    background: #333;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      @include flex-center;
      font-size: 20px;
      font-weight: bold;
      color: #fff;
    }
  }

  .user-meta {
    overflow: hidden;

    h4 {
      margin: 0;
      font-size: 15px;
      color: #fff;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: rgba($text-muted, 0.7);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
}

.notification-settings {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  .setting-item {
    padding: $spacing-md;
    border-radius: $radius-md;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .setting-info {
      h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #fff;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: $text-muted;
      }
    }
  }
}

.legal-section {
  padding: 0;
  max-height: 550px;
  overflow-y: auto;
  @include scrollbar;
}

.account-nav {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: 0 $spacing-md;

  .nav-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: 12px $spacing-md;
    border-radius: $radius-md;
    color: rgba($text-muted, 0.8);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }

    &.active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-weight: 500;
    }

    &.signout {
      margin-top: auto;
      color: rgba(#ff4d4f, 0.8);

      &:hover {
        background: rgba(#ff4d4f, 0.1);
        color: #ff4d4f;
      }
    }
  }
}

/* Content Area Styling */
.account-content {
  flex: 1;
  padding: $spacing-xl;
  overflow-y: auto;

  h3 {
    margin-bottom: $spacing-xl;
    font-size: 24px;
    font-weight: 700;
  }
}

.content-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Profile Section Styles */
.avatar-upload-section {
  text-align: center;
  margin-bottom: $spacing-xl;
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
  color: #fff;
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
  color: #fff;
}

.upload-hint {
  font-size: 13px;
  color: $text-muted;
}

.g-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 500px;
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

.section-actions {
  margin-top: $spacing-xl;
  padding-top: $spacing-xl;
  border-top: 1px solid $border-glass;
}

/* Credits Dashboard Styles (Matching Image 3) */
.credits-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xl;
  border-radius: $radius-lg;
  margin-bottom: $spacing-xl;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);

  .credit-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;

    .label {
      font-size: 12px;
      color: rgba($text-muted, 0.8);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .value {
      font-size: 28px;
      font-weight: 800;
      color: #fff;
    }

    &.main .value {
      color: #fff;
      font-size: 32px;
    }
  }

  .equation-operator {
    font-size: 24px;
    color: rgba($text-muted, 0.5);
    padding: 0 $spacing-sm;
  }
}

.credits-history {
  .history-tabs {
    margin-bottom: $spacing-lg;
  }

  .history-list {
    display: flex;
    flex-direction: column;

    .history-loading {
      padding: 40px 0;
      display: flex;
      justify-content: center;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-md 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      .desc {
        margin: 0;
        font-size: 14px;
        color: #fff;
      }

      .date {
        margin: 0;
        font-size: 12px;
        color: $text-muted;
      }

      .item-amount {
        font-size: 16px;
        font-weight: 700;

        &.consumed {
          color: rgba(#ff4d4f, 0.8);
        }

        &.obtained {
          color: #52c41a;
        }
      }
    }

    .empty-state {
      padding: $spacing-xl;
      text-align: center;
      color: $text-muted;
      font-style: italic;
    }
  }
}

/* Integrations Grid Styles */
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-lg;
  margin-top: $spacing-lg;
}

.integration-card {
  padding: $spacing-xl;
  border-radius: $radius-lg;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  transition: all 0.3s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
}

.integration-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.integration-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.youtube {
    background: linear-gradient(135deg, #ff0000, #cc0000);
  }

  &.facebook {
    background: linear-gradient(135deg, #1877f2, #0d5dbf);
  }
}

.integration-info {
  flex: 1;

  h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }

  p {
    margin: 0;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;

    &.connected {
      color: #52c41a;
      font-weight: 600;
    }

    &.disconnected {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

.integration-actions {
  display: flex;
  justify-content: flex-end;
}

/* Pricing Table Styles (Matching Image 4) */
.pricing-table-container {
  background: rgba(255, 255, 255, 0.02);
  border-radius: $radius-md;
  overflow: hidden;
  border: 1px solid $border-glass;
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    background: rgba(255, 255, 255, 0.05);
    padding: $spacing-md;
    text-align: left;
    color: $text-muted;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
  }

  td {
    padding: $spacing-md;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: top;
  }

  .category-row td {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  ul {
    padding-left: $spacing-md;
    margin: 0;

    li {
      margin-bottom: 4px;
      color: rgba($text-muted, 0.9);
    }
  }

  small {
    color: rgba($text-muted, 0.6);
    display: block;
    margin-top: 4px;
  }
}

.text-center {
  text-align: center;
}

.text-muted {
  color: $text-muted;
}

.mb-lg {
  margin-bottom: $spacing-lg;
}

.price-header {
  margin-bottom: $spacing-xl;
}
</style>
