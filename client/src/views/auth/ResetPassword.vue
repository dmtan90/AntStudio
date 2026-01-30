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
            <h1 class="brand">Reset Password</h1>
            <p>Enter your new password below</p>
          </div>

          <form @submit.prevent="handleResetPassword" class="ant-form">
            <div class="form-item">
              <GInput v-model="form.password" placeholder="New Password" type="password" class="login-input" />
            </div>

            <div class="form-item">
              <GInput v-model="form.confirmPassword" placeholder="Confirm New Password" type="password"
                class="login-input" />
            </div>

            <div class="form-item">
              <GButton type="primary" size="lg" :loading="loading" native-type="submit" class="login-btn">
                Reset Password
              </GButton>
            </div>
          </form>

          <div class="auth-footer">
            <router-link to="/login" class="back-home">Back to Login</router-link>
          </div>
        </GCard>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import GCard from '@/components/ui/GCard.vue'
import GInput from '@/components/ui/GInput.vue'
import GButton from '@/components/ui/GButton.vue'
import { useRouter, useRoute } from 'vue-router'
import { ref, reactive } from 'vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '@/stores/user'
import { getFileUrl } from '@/utils/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  password: '',
  confirmPassword: ''
})

const handleResetPassword = async () => {
  if (!form.password || !form.confirmPassword) {
    toast.error('Please fill in all fields')
    return
  }

  if (form.password !== form.confirmPassword) {
    toast.error('Passwords do not match')
    return
  }

  if (form.password.length < 6) {
    toast.error('Password must be at least 6 characters')
    return
  }

  const token = route.query.token as string
  if (!token) {
    toast.error('Invalid reset token')
    return
  }

  loading.value = true
  try {
    await userStore.resetPassword({
      token,
      newPassword: form.password
    })

    // Redirect to login after slight delay
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error: any) {
    // Error handled in store
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
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

.ant-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-btn {
  width: 100%;
  height: 54px !important;
  font-size: 16px !important;
  margin-top: 10px;
}

.auth-footer {
  margin-top: 32px;
  text-align: center;
}

.back-home {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    text-decoration: underline;
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
