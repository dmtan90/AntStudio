<template>
  <div class="auth-page">
    <div class="video-bg-container">
      <video autoplay muted loop playsinline class="video-bg">
        <source
          :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/RNDR_TunnelVidoes_stretched_005_1440x1080.mp4')"
          type="video/mp4">
      </video>
      <div class="video-overlay"></div>
    </div>

    <div class="auth-container">
      <transition name="fade-up" appear>
        <GCard class="auth-card" :hoverable="false">
          <div class="logo">
            <div v-if="uiStore.logo" class="flex justify-center mb-6">
              <img :src="getFileUrl(uiStore.logo)" :alt="uiStore.appName" class="h-16 w-auto object-contain" />
            </div>
            <h1 v-else class="brand">{{ uiStore.appName }}</h1>
            <p>Everyone can be a director with AI</p>
          </div>

          <form @submit.prevent="handleLogin" class="ant-form">
            <div class="form-item">
              <GInput v-model="form.email" placeholder="Email address" type="email" class="login-input" />
            </div>

            <div class="form-item">
              <GInput v-model="form.password" placeholder="Password" type="password" class="login-input" />
              <div class="forgot-password-link mt-4">
                <a href="#" @click.prevent="showForgotDialog = true">Forgot Password?</a>
              </div>
            </div>

            <div class="form-item">
              <GButton type="primary" size="lg" :loading="loading" native-type="submit" class="login-btn">
                Sign In
              </GButton>
            </div>
          </form>

          <!-- OAuth Login Buttons -->
          <div v-if="oauthConfig.google || oauthConfig.facebook" class="oauth-section">
            <div class="divider">
              <span>or continue with</span>
            </div>

            <div class="oauth-buttons">
              <button v-if="oauthConfig.google" @click="handleOAuthLogin('google')" class="oauth-btn google-btn"
                type="button">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4" />
                  <path
                    d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                    fill="#34A853" />
                  <path
                    d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05" />
                  <path
                    d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    fill="#EA4335" />
                </svg>
                Google
              </button>

              <button v-if="oauthConfig.facebook" @click="handleOAuthLogin('facebook')" class="oauth-btn facebook-btn"
                type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>

          <div class="auth-footer">
            <p>
              New to {{ uiStore.appName }}?
              <router-link to="/register" class="link">Create an account</router-link>
            </p>
            <router-link to="/" class="back-home">Back to Home</router-link>
          </div>
        </GCard>
      </transition>
    </div>

    <!-- Forgot Password Dialog -->
    <el-dialog v-model="showForgotDialog" title="Reset Password" width="400px" class="glass-dialog"
      :close-on-click-modal="false" align-center>
      <div class="forgot-content">
        <p class="description">Enter your email address and we'll send you a link to reset your password.</p>

        <form @submit.prevent="handleForgotPassword">
          <GInput v-model="forgotEmail" placeholder="Enter your email" type="email" class="mb-4" />

          <div class="dialog-footer text-center justify-center">
            <GButton @click="showForgotDialog = false" class="mr-2">Cancel</GButton>
            <GButton type="primary" native-type="submit" :loading="forgotLoading">Reset Password</GButton>
          </div>
        </form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import GCard from '@/components/ui/GCard.vue'
import GInput from '@/components/ui/GInput.vue'
import GButton from '@/components/ui/GButton.vue'
import { useRouter, useRoute } from 'vue-router'
import { ref, reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '@/stores/user'
import { useUIStore } from '@/stores/ui'
import { getFileUrl } from '@/utils/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const uiStore = useUIStore()

const loading = ref(false)
const form = reactive({
  email: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.email || !form.password) {
    toast.error('Please fill in all fields')
    return
  }

  loading.value = true
  try {
    await userStore.login({
      email: form.email,
      password: form.password
    })

    toast.success('Login successful!')

    // Redirect to intended page or dashboard
    const redirectPath = route.query.redirect as string
    router.push(redirectPath || '/dashboard')
  } catch (error: any) {
    toast.error(error.response?.data?.error || error.response?.data?.message || 'Login failed')
  } finally {
    loading.value = false
  }
}

// Forgot Password Logic
const showForgotDialog = ref(false)
const forgotEmail = ref('')
const forgotLoading = ref(false)

const handleForgotPassword = async () => {
  if (!forgotEmail.value) {
    toast.error('Please enter your email address')
    return
  }

  forgotLoading.value = true
  try {
    await userStore.forgotPassword(forgotEmail.value)
    showForgotDialog.value = false
    forgotEmail.value = ''
  } catch (error: any) {
    // Error handled in store
  } finally {
    forgotLoading.value = false
  }
}

// OAuth Login
const oauthConfig = reactive({ google: false, facebook: false })

const fetchOAuthConfig = async () => {
  try {
    const config = await userStore.fetchOAuthConfig()
    if (config) {
      oauthConfig.google = config.google || false
      oauthConfig.facebook = config.facebook || false
    }
  } catch (error) {
    console.error('Failed to fetch OAuth config:', error)
  }
}

const handleOAuthLogin = (provider: 'google' | 'facebook') => {
  window.location.href = `/api/auth/${provider}`
}

onMounted(() => {
  fetchOAuthConfig()

  // Check for OAuth error
  if (route.query.error === 'oauth_failed') {
    toast.error('Social login failed. Please try again.')
  }
})
</script>

<style lang="scss" scoped>
/* Previous styles remain... */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow: hidden;
}

.video-bg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.video-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.4);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent, #000 90%);
}

.auth-container {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.auth-card {
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);

  :deep(.g-card__body) {
    padding: 50px 40px;
  }
}

.logo {
  text-align: center;
  margin-bottom: 40px;
}

.brand {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 10px;
  color: #fff;
}

.logo p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 15px;
  font-weight: 400;
}

.forgot-content {
  .description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.5;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mr-2 {
  margin-right: 8px;
}

.ant-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-btn {
  width: 100%;
  height: 54px !important;
  font-size: 16px !important;
}

.auth-footer {
  margin-top: 32px;
  text-align: center;
}

.auth-footer p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin-bottom: 24px;
}

.link {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  margin-left: 5px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.back-home {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
  }
}

.oauth-section {
  margin-top: 24px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 24px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  span {
    padding: 0 16px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    font-weight: 500;
  }
}

.oauth-buttons {
  display: flex;
  gap: 12px;
}

.oauth-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    flex-shrink: 0;
  }
}

.forgot-password-link {
  text-align: right;
  font-size: 13px;
  margin-top: -10px;

  a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #fff;
    }
  }
}

/* Animations */
.fade-up-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}
</style>
