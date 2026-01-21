<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1>System Settings</h1>
      <el-button type="primary" @click="saveSettings" :loading="saving">Save All Changes</el-button>
    </div>

    <div v-if="settings" class="settings-container">
      <el-tabs v-model="activeTab" class="settings-tabs">
        
        <!-- General Tab -->
        <el-tab-pane label="General" name="general">
             <el-card class="settings-section">
                <template #header>SMTP Configuration</template>
                <el-form :model="settings.apiConfigs.smtp" label-position="top">
                  <el-row :gutter="20">
                    <el-col :span="18">
                      <el-form-item label="Host">
                        <el-input v-model="settings.apiConfigs.smtp.host" placeholder="smtp.gmail.com" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="6">
                      <el-form-item label="Port">
                        <el-input-number v-model="settings.apiConfigs.smtp.port" :controls="false" style="width: 100%" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item label="User">
                    <el-input v-model="settings.apiConfigs.smtp.user" />
                  </el-form-item>
                  <el-form-item label="Password">
                    <el-input v-model="settings.apiConfigs.smtp.pass" type="password" show-password />
                  </el-form-item>
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form-item label="From Email">
                        <el-input v-model="settings.apiConfigs.smtp.fromEmail" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="From Name">
                        <el-input v-model="settings.apiConfigs.smtp.fromName" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
             </el-card>
        </el-tab-pane>

        <!-- API Configurations Tab -->
        <el-tab-pane label="API Keys" name="api">
             <div class="api-grid">
                 <!-- AWS S3 -->
                 <el-card class="settings-section">
                     <template #header>AWS S3 Storage</template>
                     <el-form :model="settings.apiConfigs.aws" label-position="top">
                         <el-form-item label="Access Key ID">
                             <el-input v-model="settings.apiConfigs.aws.accessKeyId" />
                         </el-form-item>
                         <el-form-item label="Secret Access Key">
                             <el-input v-model="settings.apiConfigs.aws.secretAccessKey" type="password" show-password />
                         </el-form-item>
                         <el-form-item label="Bucket Name">
                             <el-input v-model="settings.apiConfigs.aws.bucketName" />
                         </el-form-item>
                         <el-form-item label="Region">
                             <el-input v-model="settings.apiConfigs.aws.region" />
                         </el-form-item>
                     </el-form>
                 </el-card>

                 <!-- Stripe -->
                 <el-card class="settings-section">
                     <template #header>Stripe Payments</template>
                     <el-form :model="settings.apiConfigs.stripe" label-position="top">
                         <el-form-item label="Public Key">
                             <el-input v-model="settings.apiConfigs.stripe.publicKey" />
                         </el-form-item>
                         <el-form-item label="Secret Key">
                             <el-input v-model="settings.apiConfigs.stripe.secretKey" type="password" show-password />
                         </el-form-item>
                         <el-form-item label="Webhook Secret">
                             <el-input v-model="settings.apiConfigs.stripe.webhookSecret" type="password" show-password />
                         </el-form-item>
                     </el-form>
                 </el-card>

                 <!-- Social Login -->
                  <el-card class="settings-section">
                     <template #header>Social Login</template>
                     <div class="subtitle">Google OAuth</div>
                     <el-form :model="settings.apiConfigs.social.google" label-position="top" size="small">
                         <el-form-item label="Client ID">
                             <el-input v-model="settings.apiConfigs.social.google.clientId" />
                         </el-form-item>
                         <el-form-item label="Client Secret">
                             <el-input v-model="settings.apiConfigs.social.google.clientSecret" type="password" show-password />
                         </el-form-item>
                     </el-form>
                     <el-divider />
                     <div class="subtitle">Facebook OAuth</div>
                     <el-form :model="settings.apiConfigs.social.facebook" label-position="top" size="small">
                         <el-form-item label="App ID">
                             <el-input v-model="settings.apiConfigs.social.facebook.appId" />
                         </el-form-item>
                         <el-form-item label="App Secret">
                             <el-input v-model="settings.apiConfigs.social.facebook.appSecret" type="password" show-password />
                         </el-form-item>
                     </el-form>
                 </el-card>
             </div>
        </el-tab-pane>

        <!-- AI Models Tab -->
        <el-tab-pane label="AI Models" name="ai">
             <!-- Providers -->
             <div class="settings-section mb-4 cinematic-panel">
                 <div class="panel-header">
                     <span>AI Providers</span>
                     <el-button size="small" type="primary" plain @click="addProvider">Add Provider</el-button>
                 </div>
                 <div class="cinematic-table-container">
                    <div class="cinematic-table-header">
                        <div class="col" style="flex: 2">NAME</div>
                        <div class="col" style="flex: 2">PROVIDER ID</div>
                        <div class="col" style="flex: 3">API KEY</div>
                        <div class="col" style="flex: 1">ACTIVE</div>
                        <div class="col" style="flex: 0.5"></div>
                    </div>
                    <div class="cinematic-table-body">
                        <div v-for="(provider, idx) in settings.aiSettings.providers" :key="idx" class="cinematic-row">
                             <div class="col" style="flex: 2"><el-input v-model="provider.name" size="small" class="glass-input" /></div>
                             <div class="col" style="flex: 2"><span class="mono-text">{{ provider.id }}</span></div>
                             <div class="col" style="flex: 3"><el-input v-model="provider.apiKey" type="password" show-password size="small" class="glass-input" /></div>
                             <div class="col" style="flex: 1"><el-switch v-model="provider.isActive" size="small" /></div>
                             <div class="col actions" style="flex: 0.5">
                                 <button class="icon-btn delete" @click="removeProvider(idx)"><Delete /></button>
                             </div>
                        </div>
                    </div>
                 </div>
             </div>

             <!-- Models Pricing -->
             <div class="settings-section cinematic-panel">
                 <div class="panel-header">
                     <span>Model Pricing (Credits)</span>
                     <el-button size="small" type="primary" plain @click="addModel">Add Model</el-button>
                 </div>
                 <div class="cinematic-table-container">
                    <div class="cinematic-table-header">
                        <div class="col" style="flex: 2">DISPLAY NAME</div>
                        <div class="col" style="flex: 2">MODEL ID</div>
                        <div class="col" style="flex: 1.5">PROVIDER</div>
                        <div class="col" style="flex: 1">TYPE</div>
                        <div class="col" style="flex: 1">COST</div>
                        <div class="col" style="flex: 1">ACTIVE</div>
                        <div class="col" style="flex: 0.5"></div>
                    </div>
                    <div class="cinematic-table-body">
                         <div v-for="(model, idx) in settings.aiSettings.models" :key="idx" class="cinematic-row">
                             <div class="col" style="flex: 2"><el-input v-model="model.name" size="small" class="glass-input" /></div>
                             <div class="col" style="flex: 2"><span class="mono-text">{{ model.id }}</span></div>
                             <div class="col" style="flex: 1.5">{{ model.providerId }}</div>
                             <div class="col" style="flex: 1"><el-tag size="small" effect="dark">{{ model.type }}</el-tag></div>
                             <div class="col" style="flex: 1"><el-input-number v-model="model.creditCost" :min="0" size="small" controls-position="right" class="glass-input" /></div>
                             <div class="col" style="flex: 1"><el-switch v-model="model.isActive" size="small" /></div>
                             <div class="col actions" style="flex: 0.5">
                                 <button class="icon-btn delete" @click="removeModel(idx)"><Delete /></button>
                             </div>
                         </div>
                    </div>
                 </div>
             </div>
        </el-tab-pane>

        <!-- Subscriptions Tab -->
        <el-tab-pane label="Subscriptions" name="plans">
             <div class="section-title">Membership Plans</div>
             <div class="plans-grid">
                 <div v-for="(plan, index) in settings.plans" :key="index" class="settings-section plan-card cinematic-panel">
                     <div class="panel-header plan-header">
                         <el-input v-model="plan.name" size="small" class="glass-input plan-name-input" />
                     </div>
                     <div class="plan-form">
                         <div class="form-group">
                            <label>Monthly Price ($)</label>
                            <el-input-number v-model="plan.price" :min="0" :precision="2" class="full-width glass-input" />
                         </div>
                         <div class="form-group">
                            <label>Yearly Price ($)</label>
                            <el-input-number v-model="plan.yearlyPrice" :min="0" :precision="2" class="full-width glass-input" />
                         </div>
                         <div class="divider">Limits</div>
                         <div class="form-group">
                             <label>Monthly Credits</label>
                             <el-input-number v-model="plan.features.monthlyCredits" :min="0" class="full-width glass-input" />
                         </div>
                         <div class="form-group checkbox">
                             <el-checkbox v-model="plan.features.prioritySupport">Priority Support</el-checkbox>
                         </div>
                     </div>
                 </div>
             </div>

             <el-divider />

             <div class="section-header-row">
                <div class="section-title">Credit Packages</div>
                <el-button size="small" type="primary" plain @click="addPackage">Add Package</el-button>
             </div>
             
             <div class="plans-grid">
                <div v-for="(pkg, idx) in settings.creditPackages" :key="idx" class="settings-section plan-card cinematic-panel">
                     <div class="panel-header plan-header">
                         <el-input v-model="pkg.name" size="small" class="glass-input" placeholder="Package Name"/>
                         <button class="icon-btn delete" @click="removePackage(idx)"><Delete /></button>
                     </div>
                     <div class="plan-form">
                         <div class="form-group">
                            <label>Credits Amount</label>
                             <el-input-number v-model="pkg.credits" :min="100" class="full-width glass-input" />
                         </div>
                         <div class="form-group">
                            <label>Price ($)</label>
                             <el-input-number v-model="pkg.price" :min="0" :precision="2" class="full-width glass-input" />
                         </div>
                         <div class="form-group checkbox">
                             <el-checkbox v-model="pkg.isActive">Active</el-checkbox>
                         </div>
                     </div>
                </div>
             </div>
        </el-tab-pane>

      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'app',
  middleware: ['admin']
})

const settings = ref<any>(null)
const saving = ref(false)
const activeTab = ref('general')

const fetchSettings = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const res: any = await $fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    settings.value = res
  } catch (error) {
    toast.error('Failed to load settings')
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: settings.value
    })
    toast.success('Settings saved successfully')
  } catch (error) {
    toast.error('Failed to save settings')
  } finally {
    saving.value = false
  }
}

const addProvider = () => {
  settings.value.aiSettings.providers.push({
      id: 'new-provider',
      name: 'New Provider',
      apiKey: '',
      isActive: true
  })
}

const removeProvider = (index: number) => {
    settings.value.aiSettings.providers.splice(index, 1)
}

const addModel = () => {
   settings.value.aiSettings.models.push({
      id: 'new-model',
      name: 'New Model',
      providerId: 'google',
      type: 'text',
      creditCost: 1,
      isActive: true
   }) 
}

const removeModel = (index: number) => {
    settings.value.aiSettings.models.splice(index, 1)
}

const addPackage = () => {
    if (!settings.value.creditPackages) settings.value.creditPackages = []
    settings.value.creditPackages.push({
        id: 'cp_' +  Math.random().toString(36).substr(2, 9),
        name: 'New Package',
        credits: 1000,
        price: 9.99,
        currency: 'usd',
        isActive: true
    })
}

const removePackage = (index: number) => {
    settings.value.creditPackages.splice(index, 1)
}

onMounted(fetchSettings)
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: $text-primary;
    letter-spacing: -0.5px;
  }
}

// Cinematic Panel
.cinematic-panel {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    span {
      font-weight: 600;
      font-size: 16px;
      color: $text-primary;
    }
  }
}

// Cinematic Table Styles (Reused from Users)
.cinematic-table-container {
  width: 100%;
  
  .cinematic-table-header {
    display: flex;
    padding: 12px 16px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    margin-bottom: 8px;
    
    .col {
      font-size: 11px;
      font-weight: 700;
      color: $text-secondary;
      text-transform: uppercase;
    }
  }
  
  .cinematic-row {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 8px;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    
    .col {
      padding-right: 12px;
      &:last-child { padding-right: 0; }
    }
  }
}

// Glass Inputs
:deep(.glass-input) {
  .el-input__wrapper {
    background: rgba(0, 0, 0, 0.2);
    box-shadow: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover, &.is-focus {
       background: rgba(0, 0, 0, 0.4);
       border-color: $primary-color;
    }
    
    .el-input__inner { color: #fff; }
  }
}

// Plan Cards
.plan-card {
  padding: 24px;
  
  .plan-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  
  .plan-form {
    .form-group {
      margin-bottom: 16px;
      
      label {
        display: block;
        font-size: 12px;
        color: $text-secondary;
        margin-bottom: 6px;
        text-transform: uppercase;
        font-weight: 600;
      }
    }
    
    .divider {
      margin: 20px 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      
      &::after {
        content: 'Limits';
        background: #111; // Approx bg
        padding: 0 10px;
        color: $text-muted;
        font-size: 11px;
        position: absolute;
      }
    }
  }
}

.full-width { width: 100% !important; }

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fff;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  margin-top: 32px;
}

.icon-btn.delete {
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    &:hover { background: rgba(239, 68, 68, 0.1); }
}

.mono-text {
    font-family: monospace;
    font-size: 12px;
    color: #a8a29e;
}

.settings-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  :deep(.el-tabs__item) {
    color: $text-secondary;
    font-size: 14px;
    
    &.is-active {
      color: $primary-color;
      font-weight: 600;
    }
  }
}

// Re-use some existing styles
.api-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
}

.subtitle {
    font-size: 12px;
    text-transform: uppercase;
    color: $text-secondary;
    margin-bottom: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
}

.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
</style>
