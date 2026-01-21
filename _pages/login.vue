<template>
  <div class="auth-page">
    <div class="video-bg-container">
      <video autoplay muted loop playsinline class="video-bg">
        <source src="https://storage.googleapis.com/pinhole-about-assets-prod-us/RNDR_TunnelVidoes_stretched_005_1440x1080.mp4" type="video/mp4">
      </video>
      <div class="video-overlay"></div>
    </div>

    <div class="auth-container">
      <transition name="fade-up" appear>
          <GCard class="auth-card" :hoverable="false">
            <div class="logo">
              <h1 class="brand">AntFlow</h1>
              <p>Everyone can be a director with AI</p>
            </div>

            <form @submit.prevent="handleLogin" class="ant-form">
              <div class="form-item">
                <GInput
                  v-model="form.email"
                  placeholder="Email address"
                  type="email"
                  class="login-input"
                />
              </div>

              <div class="form-item">
                <GInput
                  v-model="form.password"
                  placeholder="Password"
                  type="password"
                  class="login-input"
                />
              </div>

              <div class="form-item">
                <GButton
                  type="primary"
                  size="lg"
                  :loading="loading"
                  native-type="submit"
                  class="login-btn"
                >
                  Sign In
                </GButton>
              </div>
            </form>

            <div class="auth-footer">
              <p>
                New to AntFlow?
                <NuxtLink to="/register" class="link">Create an account</NuxtLink>
              </p>
              <NuxtLink to="/" class="back-home">Back to Home</NuxtLink>
            </div>
          </GCard>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormRules } from 'element-plus'
import GCard from '~/components/ui/GCard.vue'
import GInput from '~/components/ui/GInput.vue'
import GButton from '~/components/ui/GButton.vue'

definePageMeta({
  layout: false
})

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
    const { data } = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password
      }
    })

    const token = (data as any).token
    if (token) {
      localStorage.setItem('auth-token', token)
    }

    toast.success('Login successful!')
    await navigateTo('/dashboard')
  } catch (error: any) {
    toast.error(error.data?.message || 'Login failed')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  @include flex-center;
  background: $bg-dark;
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
  padding: $spacing-lg;
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
  color: $text-secondary;
  margin: 0;
  font-size: 15px;
  font-weight: 400;
}

.ant-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-input {
  :deep(.g-input__inner) {
    height: 54px;
    font-size: 16px;
  }
}

.login-btn {
  width: 100%;
  height: 54px;
  font-size: 16px;
}

.auth-footer {
  margin-top: 32px;
  text-align: center;
}

.auth-footer p {
  color: $text-secondary;
  font-size: 14px;
  margin-bottom: $spacing-lg;
}

.link {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  margin-left: 5px;

  &:hover {
    text-decoration: underline;
  }
}

.back-home {
  display: block;
  font-size: 13px;
  color: $text-muted;
  text-decoration: none;
  transition: $transition-fast;

  &:hover {
    color: #fff;
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
