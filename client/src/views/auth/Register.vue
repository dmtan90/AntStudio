<template>
  <div class="auth-page">
    <div class="video-bg-container">
      <video autoplay muted loop playsinline class="video-bg">
        <source :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4')"
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
            <p>Create wonderful videos with AI</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleRegister" class="ant-form">
            <el-form-item prop="name">
              <GInput v-model="form.name" placeholder="Full Name" class="register-input" />
            </el-form-item>

            <el-form-item prop="email">
              <GInput v-model="form.email" placeholder="Email address" type="email" class="register-input" />
            </el-form-item>

            <el-form-item prop="password">
              <GInput v-model="form.password" placeholder="Password (min 8 chars)" type="password" show-password
                class="register-input" />
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <GInput v-model="form.confirmPassword" placeholder="Confirm password" type="password" show-password
                class="register-input" />
            </el-form-item>

            <el-form-item>
              <GButton type="primary" size="lg" :loading="loading" native-type="submit" class="register-btn">
                Create Account
              </GButton>
            </el-form-item>
          </el-form>

          <div class="auth-footer">
            <p>
              Already have an account?
              <router-link to="/login" class="link">Login</router-link>
            </p>
            <router-link to="/" class="back-home">Back to Home</router-link>
          </div>
        </GCard>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUIStore } from '@/stores/ui'
import GCard from '@/components/ui/GCard.vue'
import GInput from '@/components/ui/GInput.vue'
import GButton from '@/components/ui/GButton.vue'
import { getFileUrl } from '@/utils/api'

const router = useRouter()
const userStore = useUserStore()
const uiStore = useUIStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value !== form.password) {
    callback(new Error('Passwords do not match'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  name: [
    { required: true, message: 'Please input your name', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Please input email', trigger: 'blur' },
    { type: 'email', message: 'Please input valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please input password', trigger: 'blur' },
    { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm password', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true
    try {
      await userStore.register({
        email: form.email,
        password: form.password,
        name: form.name
      })

      toast.success('Account created successfully!')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Registration failed')
    } finally {
      loading.value = false
    }
  })
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
  margin-top: 0;
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

.register-btn {
  width: 100%;
  height: 52px !important;
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

/* Animations */
.fade-up-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}
</style>
