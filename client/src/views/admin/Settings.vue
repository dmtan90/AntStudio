<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1>System Settings</h1>
      <el-button type="primary" @click="saveSettings" :loading="saving">Save All Changes</el-button>
    </div>

    <div v-if="settings && settings.apiConfigs" class="settings-container">
      <el-tabs v-model="activeTab" class="settings-tabs">
        
        <!-- License Tab -->
        <el-tab-pane label="License" name="license">
            <el-card class="settings-section">
                <template #header>
                    <div class="panel-header">
                        <span>License Activation</span>
                        <span v-if="settings.license?.info" :class="['status-badge', settings.license.info.status]">
                            {{ settings.license.info.status.toUpperCase() }}
                        </span>
                    </div>
                </template>
                <div class="license-info mb-4" v-if="settings.license?.info">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Type</span>
                            <span class="value type-badge">{{ settings.license.info.type.toUpperCase() }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Max Users</span>
                            <span class="value">{{ settings.license.info.maxUsers == -1 ? 'Unlimited' : settings.license.info.maxUsers }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Max Projects</span>
                            <span class="value">{{ settings.license.info.maxProjects == -1 ? 'Unlimited' : settings.license.info.maxProjects }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Expires</span>
                            <span class="value">{{ settings.license.info.endDate ? new Date(settings.license.info.endDate).toLocaleDateString() : 'Never' }}</span>
                        </div>
                    </div>
                </div>
                
                <el-form label-position="top">
                    <el-form-item label="License Key">
                        <el-input v-model="settings.license.key" placeholder="Enter your license key" show-password />
                        <p class="mt-2 text-xs text-muted">Enter your license key and click "Save All Changes" to activate.</p>
                    </el-form-item>
                </el-form>
            </el-card>
        </el-tab-pane>

        <!-- Whitelabel Tab -->
        <el-tab-pane label="Whitelabel" name="whitelabel">
            <el-card class="settings-section">
                <template #header>Branding Configuration</template>
                <el-form label-position="top">
                    <el-form-item label="Application Name">
                        <el-input v-model="settings.whitelabel.appName" placeholder="AntFlow" />
                    </el-form-item>
                    <el-form-item label="Logo URL">
                        <el-input v-model="settings.whitelabel.logo" placeholder="/logo.png or https://..." />
                        <div class="mt-2" v-if="settings.whitelabel.logo">
                            <p class="text-xs text-muted mb-1">Preview:</p>
                            <img :src="getFileUrl(settings.whitelabel.logo)" style="height: 40px; object-fit: contain;" />
                        </div>
                    </el-form-item>
                    <el-form-item label="Favicon URL">
                        <el-input v-model="settings.whitelabel.favicon" placeholder="/favicon.ico or https://..." />
                    </el-form-item>
                </el-form>
            </el-card>
        </el-tab-pane>

        <!-- General Tab -->
        <el-tab-pane label="System" name="general">
             <div class="api-grid">
                 <!-- SMTP -->
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
                         <el-form-item label="Endpoint">
                             <el-input v-model="settings.apiConfigs.aws.endpoint" />
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

                 <!-- Social Login / OAuth -->
                  <el-card class="settings-section">
                     <template #header>Social Login (OAuth)</template>
                     
                     <!-- Google OAuth -->
                     <div class="oauth-provider-section">
                       <div class="provider-header">
                         <div class="subtitle">Google OAuth</div>
                         <el-switch 
                           v-model="settings.oauthProviders.google.enabled" 
                           active-text="Enabled"
                           inactive-text="Disabled"
                         />
                       </div>
                       <el-form :model="settings.apiConfigs.social.google" label-position="top" size="small">
                           <el-form-item label="Client ID">
                               <el-input v-model="settings.apiConfigs.social.google.clientId" :disabled="!settings.oauthProviders.google.enabled" />
                           </el-form-item>
                           <el-form-item label="Client Secret">
                               <el-input v-model="settings.apiConfigs.social.google.clientSecret" type="password" show-password :disabled="!settings.oauthProviders.google.enabled" />
                           </el-form-item>
                       </el-form>
                     </div>
                     
                     <el-divider />
                     
                     <!-- Facebook OAuth -->
                     <div class="oauth-provider-section">
                       <div class="provider-header">
                         <div class="subtitle">Facebook OAuth</div>
                         <el-switch 
                           v-model="settings.oauthProviders.facebook.enabled" 
                           active-text="Enabled"
                           inactive-text="Disabled"
                         />
                       </div>
                       <el-form :model="settings.apiConfigs.social.facebook" label-position="top" size="small">
                           <el-form-item label="App ID">
                               <el-input v-model="settings.apiConfigs.social.facebook.appId" :disabled="!settings.oauthProviders.facebook.enabled" />
                           </el-form-item>
                           <el-form-item label="App Secret">
                               <el-input v-model="settings.apiConfigs.social.facebook.appSecret" type="password" show-password :disabled="!settings.oauthProviders.facebook.enabled" />
                           </el-form-item>
                       </el-form>
                     </div>
                   </el-card>

                   <!-- Ant Media Server -->
                   <el-card class="settings-section">
                       <template #header>Ant Media Server (Publishing)</template>
                       <el-form :model="settings.apiConfigs.antMedia" label-position="top">
                           <el-form-item label="Base URL (e.g. https://your-ams:5443)">
                               <el-input v-model="settings.apiConfigs.antMedia.baseUrl" placeholder="https://..." />
                           </el-form-item>
                           <el-row :gutter="20">
                               <el-col :span="12">
                                    <el-form-item label="Admin Email">
                                        <el-input v-model="settings.apiConfigs.antMedia.email" />
                                    </el-form-item>
                               </el-col>
                               <el-col :span="12">
                                    <el-form-item label="Admin Password">
                                        <el-input v-model="settings.apiConfigs.antMedia.password" type="password" show-password />
                                    </el-form-item>
                               </el-col>
                           </el-row>
                           <el-form-item label="Target Application (e.g. WebRTCAppEE)">
                               <el-input v-model="settings.apiConfigs.antMedia.appName" />
                           </el-form-item>
                           <div class="api-info">
                             <p>Used for authenticating and managing live streams/RTMP ingest. Refer to <a href="https://docs.antmedia.io/guides/developer-sdk-and-api/rest-api-guide/management-rest-apis" target="_blank">AMS REST API Docs</a>.</p>
                           </div>
                       </el-form>
                   </el-card>
             </div>
        </el-tab-pane>

        <!-- Media APIs Tab -->
        <el-tab-pane label="Media APIs" name="media">
             <div class="api-grid">
                 <!-- Giphy API -->
                 <el-card class="settings-section">
                    <template #header>
                       <div class="provider-header">
                          <span>Giphy API</span>
                          <el-switch 
                            v-model="settings.apiConfigs.media.giphy.enabled" 
                            active-text="Enabled"
                            inactive-text="Disabled"
                          />
                       </div>
                    </template>
                    <el-form :model="settings.apiConfigs.media.giphy" label-position="top">
                      <el-form-item label="API Key">
                        <el-input 
                          v-model="settings.apiConfigs.media.giphy.apiKey" 
                          type="password" 
                          show-password 
                          placeholder="Enter your Giphy API key"
                          :disabled="!settings.apiConfigs.media.giphy.enabled"
                        />
                      </el-form-item>
                      <div class="api-info">
                        <p>Get your API key from <a href="https://developers.giphy.com/" target="_blank" rel="noopener">Giphy Developers</a></p>
                        <p class="note">Used for GIFs, stickers, and emoji in the video editor</p>
                      </div>
                    </el-form>
                </el-card>

                 <!-- Pexels API -->
                 <el-card class="settings-section">
                     <template #header>
                       <div class="provider-header">
                          <span>Pexels API</span>
                          <el-switch 
                            v-model="settings.apiConfigs.media.pexels.enabled" 
                            active-text="Enabled"
                            inactive-text="Disabled"
                          />
                       </div>
                     </template>
                     <el-form :model="settings.apiConfigs.media.pexels" label-position="top">
                         <el-form-item label="API Key">
                             <el-input 
                               v-model="settings.apiConfigs.media.pexels.apiKey" 
                               type="password" 
                               show-password 
                               placeholder="Enter your Pexels API key"
                               :disabled="!settings.apiConfigs.media.pexels.enabled"
                             />
                         </el-form-item>
                         <div class="api-info">
                           <p>Get your API key from <a href="https://www.pexels.com/api/" target="_blank" rel="noopener">Pexels API</a></p>
                           <p class="note">Used for stock photos and videos in the video editor</p>
                         </div>
                     </el-form>
                 </el-card>

                 <!-- Unsplash API -->
                 <el-card class="settings-section">
                     <template #header>
                       <div class="provider-header">
                          <span>Unsplash API</span>
                          <el-switch 
                            v-model="settings.apiConfigs.media.unsplash.enabled" 
                            active-text="Enabled"
                            inactive-text="Disabled"
                          />
                       </div>
                     </template>
                     <el-form :model="settings.apiConfigs.media.unsplash" label-position="top">
                         <el-form-item label="API Key (Access Key)">
                             <el-input 
                               v-model="settings.apiConfigs.media.unsplash.apiKey" 
                               type="password" 
                               show-password 
                               placeholder="Client-ID your-access-key"
                               :disabled="!settings.apiConfigs.media.unsplash.enabled"
                             />
                         </el-form-item>
                         <div class="api-info">
                           <p>Get your access key from <a href="https://unsplash.com/developers" target="_blank" rel="noopener">Unsplash Developers</a></p>
                           <p class="note">Format: "Client-ID your-access-key" - Used for high-quality stock photos</p>
                         </div>
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
                     <GDropdown>
                      <el-button type="primary" plain bg round >Add Provider</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-for="p in KNOWN_PROVIDERS" :key="p.id" :label="p.name" :value="p.id" :disabled="settings.aiSettings.providers.some(pr => pr.id === p.id)" @click="confirmAddProvider(p as any)">{{ p.name }}</el-dropdown-item>
                          <el-dropdown-item @click="confirmAddProvider(null as any)">{{ 'Custom Provider' }}</el-dropdown-item>
                        </el-dropdown-menu>
                      </template> 
                     </GDropdown>
                 </div>
                 <div class="cinematic-table-container">
                    <div class="cinematic-table-header">
                        <div class="col" style="flex: 1.5">NAME</div>
                        <div class="col" style="flex: 1.5">ID</div>
                        <div class="col" style="flex: 2">API KEY / BASE URL</div>
                        <div class="col" style="flex: 2">CAPABILITIES</div>
                        <div class="col" style="flex: 0.5">ACTIVE</div>
                        <div class="col" style="flex: 0.5"></div>
                    </div>
                    <div class="cinematic-table-body">
                        <div v-for="(provider, idx) in settings.aiSettings.providers" :key="idx" class="cinematic-row">
                             <div class="col" style="flex: 1.5"><el-input v-model="provider.name" size="small" class="glass-input" placeholder="Name" /></div>
                             <div class="col" style="flex: 1.5"><el-input v-model="provider.id" size="small" class="glass-input" placeholder="id" /></div>
                             <div class="col" style="flex: 2; display: flex; flex-direction: column; gap: 4px;">
                                 <el-input v-model="provider.apiKey" type="password" show-password size="small" class="glass-input" placeholder="API Key" />
                                 <el-input v-model="provider.baseUrl" size="small" class="glass-input" placeholder="Base URL (Optional)" />
                             </div>
                             <div class="col" style="flex: 2">
                                <el-select v-model="provider.supportedTypes" multiple collapse-tags collapse-tags-tooltip size="small" class="glass-input" placeholder="Select Types">
                                    <el-option label="Text/LLM" value="text" />
                                    <el-option label="Image" value="image" />
                                    <el-option label="Video" value="video" />
                                    <el-option label="Audio/TTS" value="audio" />
                                    <el-option label="Music" value="music" />
                                </el-select>
                             </div>
                              <div class="col" style="flex: 0.5; justify-content: center; display: flex;"><el-switch v-model="provider.isActive" size="small" /></div>
                              <div class="col actions" style="flex: 0.5; justify-content: center; display: flex; gap: 8px;">
                                  <el-tooltip content="Configure API Templates" placement="top">
                                      <button class="icon-btn" @click="openTaskConfigConfig(provider)"><Setting style="width: 1em; height: 1em;" /></button>
                                  </el-tooltip>
                                   <el-tooltip content="Remove Provider" placement="top">
                                     <el-button type="danger" link :icon="Delete" @click="removeProvider(idx as number)" />
                                   </el-tooltip>
                              </div>
                        </div>
                    </div>
                 </div>
             </div>

             <!-- Defaults Configuration -->
             <div v-if="settings.aiSettings.defaults" class="settings-section mb-4 cinematic-panel">
                 <div class="panel-header"><span>Task Defaults</span></div>
                 <div class="cinematic-table-container">
                    <div class="cinematic-table-header">
                        <div class="col" style="flex: 1">TASK</div>
                        <div class="col" style="flex: 2">DEFAULT PROVIDER</div>
                        <div class="col" style="flex: 2">DEFAULT MODEL</div>
                        <div class="col" style="flex: 1">COST (CREDITS)</div>
                    </div>
                    <div class="cinematic-table-body">
                        <div v-for="type in ['text', 'image', 'video', 'audio', 'music']" :key="type" class="cinematic-row">
                            <div class="col" style="flex: 1; text-transform: capitalize; font-weight: 600;">{{ type }}</div>
                            <div class="col" style="flex: 2">
                                <el-select v-if="settings.aiSettings.defaults[type]" 
                                           v-model="settings.aiSettings.defaults[type].providerId" 
                                           size="small" 
                                           collapse-tags collapse-tags-tooltip
                                           class="high-contrast-select" 
                                           placeholder="Select Provider">
                                    <el-option v-for="p in getProvidersForType(type)" :key="p.id" :label="p.name" :value="p.id" />
                                </el-select>
                            </div>
                             <div class="col" style="flex: 2">
                                <el-select v-if="settings.aiSettings.defaults[type]" 
                                           v-model="settings.aiSettings.defaults[type].modelId" 
                                           filterable 
                                           allow-create 
                                           default-first-option
                                           collapse-tags collapse-tags-tooltip
                                           size="small" 
                                           class="high-contrast-select" 
                                           placeholder="Select or Type Model">
                                     <el-option v-for="m in getModelsForProvider(settings.aiSettings.defaults[type].providerId)" :key="m" :label="m" :value="m" />
                                </el-select>
                            </div>
                            <div class="col" style="flex: 1">
                                <el-input-number v-if="settings.aiSettings.defaults[type]" 
                                                 v-model="settings.aiSettings.defaults[type].creditCost" 
                                                 :min="0" 
                                                 size="small" 
                                                 class="glass-input" />
                            </div>
                        </div>
                    </div>
                 </div>
             </div>

             <!-- Removed separate Models Pricing Table -->
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
                <el-button type="primary" plain bg round @click="addPackage">Add Package</el-button>
             </div>
             
             <div class="plans-grid">
                <div v-for="(pkg, idx) in settings.creditPackages" :key="idx" class="settings-section plan-card cinematic-panel">
                     <div class="panel-header plan-header">
                         <el-input v-model="pkg.name" size="small" class="glass-input" placeholder="Package Name"/>
                         <button class="icon-btn delete" @click="removePackage(idx as number)"><Delete /></button>
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
    
    <!-- Task Config Dialog -->
    <el-dialog
        v-model="showTaskConfigDialog"
        title="Advanced Provider Configuration"
        class="cinematic-dialog"
        width="800px"
        destroy-on-close
    >
        <div v-if="currentConfigProvider" class="config-content">
             <div class="mb-4">
                 <div class="subtitle">Provider: {{ currentConfigProvider.name }} ({{ currentConfigProvider.id }})</div>
                 <div class="mono-text">Configure specific endpoints and payloads for each task type.</div>
             </div>
             
             <el-tabs v-model="activeConfigTab" class="config-tabs">
                <el-tab-pane v-for="type in currentConfigProvider.supportedTypes" :key="type" :label="type.toUpperCase()" :name="type">
                    <div class="task-config-form">
                         <div class="flex-row-between mb-4">
                             <div class="section-title" style="font-size: 14px; margin: 0;">{{ type }} Configuration</div>
                             <div class="template-actions">
                                 <el-button plain bg round @click="applyTemplate(currentConfigProvider.id, type)">Apply {{ currentConfigProvider.id }} Default</el-button>
                                 <div class="ai-doc-wrapper">
                                   <el-button plain bg round :loading="generatingFromDoc" @click="showDocUrlPopover = !showDocUrlPopover">AI Generate from Docs</el-button>
                                   <transition name="fade">
                                     <div v-if="showDocUrlPopover" class="ai-doc-dropdown">
                                       <div class="mb-2" style="font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500;">Enter API Documentation URL</div>
                                       <el-input 
                                         v-model="docUrl" 
                                         placeholder="https://docs.example.com/api/endpoint or paste API documentation content"
                                         size="small"
                                         type="textarea"
                                         :autosize="{ minRows: 2, maxRows: 10 }"
                                         class="glass-input mb-2"
                                       />
                                       <div class="flex-row-between" style="gap: 8px;">
                                         <el-button size="small" @click="showDocUrlPopover = false">Cancel</el-button>
                                         <el-button size="small" type="primary" @click="generateFromDocs(type)" :loading="generatingFromDoc">Generate</el-button>
                                       </div>
                                     </div>
                                   </transition>
                                 </div>
                             </div>
                         </div>
                         
                         <!-- Auto-initialize with defaults if missing -->
                         
                         <div>
                             <el-form label-position="top" size="small">
                                 <el-row :gutter="20">
                                     <el-col :span="18">
                                         <el-form-item label="API Endpoint URL">
                                             <el-input v-model="currentConfigProvider.taskConfigs[type].endpoint" placeholder="https://api.example.com/v1/..." class="glass-input" />
                                         </el-form-item>
                                     </el-col>
                                     <el-col :span="6">
                                         <el-form-item label="Method">
                                             <el-select v-model="currentConfigProvider.taskConfigs[type].method" class="glass-input">
                                                 <el-option label="POST" value="POST" />
                                                 <el-option label="GET" value="GET" />
                                             </el-select>
                                         </el-form-item>
                                     </el-col>
                                 </el-row>

                                 <el-form-item label="Headers (JSON)">
                                     <div class="mono-text mb-1" style="opacity: 0.7">Example: {"Content-Type": "application/json", "x-api-key": "&#123;&#123;apiKey&#125;&#125;"}</div>
                                     <el-input 
                                        v-model="currentConfigProvider.taskConfigs[type].headers" 
                                        type="textarea" 
                                        :rows="3"
                                        placeholder='{"Content-Type": "application/json", "x-api-key": "&#123;&#123;apiKey&#125;&#125;"}'
                                        class="glass-input code-font"
                                     />
                                 </el-form-item>

                                 <el-form-item label="Payload Template (JSON)">
                                     <div class="mono-text mb-1" style="opacity: 0.7">Variables: &#123;&#123;prompt&#125;&#125;, &#123;&#123;model&#125;&#125;, &#123;&#123;apiKey&#125;&#125;, &#123;&#123;aspectRatio&#125;&#125;...</div>
                                     <el-input 
                                        v-model="currentConfigProvider.taskConfigs[type].payloadTemplate" 
                                        type="textarea" 
                                        :rows="6" 
                                        class="glass-input code-font" 
                                        placeholder='{ "prompt": "{{prompt}}", ... }'
                                     />
                                 </el-form-item>

                                  <el-form-item label="Response Mapping (JSON Path)">
                                      <el-row :gutter="20">
                                          <el-col :span="12">
                                              <el-form-item label="Text Result Path">
                                                 <el-input v-model="currentConfigProvider.taskConfigs[type].responseMapping.text" placeholder="choices[0].message.content" class="glass-input" />
                                              </el-form-item>
                                          </el-col>
                                           <el-col :span="12">
                                              <el-form-item label="Image URL Path">
                                                 <el-input v-model="currentConfigProvider.taskConfigs[type].responseMapping.url" placeholder="data[0].url" class="glass-input" />
                                              </el-form-item>
                                          </el-col>
                                          <el-col :span="12">
                                              <el-form-item label="Base64 Data Path">
                                                 <el-input v-model="currentConfigProvider.taskConfigs[type].responseMapping.b64" placeholder="data[0].b64_json" class="glass-input" />
                                              </el-form-item>
                                          </el-col>
                                          <el-col :span="12">
                                              <el-form-item label="Job ID Path (Async)">
                                                 <el-input v-model="currentConfigProvider.taskConfigs[type].responseMapping.jobId" placeholder="id" class="glass-input" />
                                              </el-form-item>
                                          </el-col>
                                      </el-row>
                                  </el-form-item>
                             </el-form>
                         </div>
                    </div>
                </el-tab-pane>
             </el-tabs>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="showTaskConfigDialog = false">Close</el-button>
            </div>
        </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Delete, Setting, ArrowDown } from '@element-plus/icons-vue'
import { toast } from 'vue-sonner'
import { ElMessageBox, ClickOutside as vClickOutside } from 'element-plus'
import { useAdminStore } from '@/stores/admin'
import { storeToRefs } from 'pinia'
import api, { getFileUrl } from '@/utils/api.js'

const adminStore = useAdminStore()
const { settings, loading: loadingSettings } = storeToRefs(adminStore)
const saving = ref(false)
const activeTab = ref('license')

const fetchSettings = async () => {
  try {
    await adminStore.fetchSettings()
  } catch (error) {
    toast.error('Failed to load settings')
  }
}

const saveSettings = async () => {
  if (!settings.value) return
  saving.value = true
  try {
    await adminStore.updateSettings(settings.value)
    toast.success('Settings saved successfully')
  } catch (error) {
    toast.error('Failed to save settings')
  } finally {
    saving.value = false
  }
}

const KNOWN_PROVIDERS = [
    {
        id: 'google',
        name: 'Google Gemini',
        baseUrl: '', // Genkit handles this internally
        supportedTypes: ['text', 'image', 'video', 'audio'],
        models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'imagen-3.0', 'veo-2.0']
    },
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        supportedTypes: ['text', 'image', 'audio'],
        models: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3', 'tts-1']
    },
    {
        id: 'grok',
        name: 'xAI Grok',
        baseUrl: 'https://api.x.ai/v1',
        supportedTypes: ['text', 'image'],
        models: ['grok-beta', 'grok-vision-beta']
    },
    {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        baseUrl: 'https://api.elevenlabs.io/v1',
        supportedTypes: ['audio'], // TTS
        models: ['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_flash_v2_5']
    },
    {
        id: 'suno',
        name: 'Suno',
        baseUrl: 'https://api.sunoapi.org', // Common proxy/wrapper
        supportedTypes: ['music'],
        models: ['v3.5', 'v4.0']
    },
    {
        id: 'geminigen-ai',
        name: 'GeminiGen AI',
        baseUrl: 'https://api.geminigen.ai/v1', // Placeholder based on user request
        supportedTypes: ['image', 'video', 'audio'],
        models: ['gemini-gen-v1']
    }
]

// const showAddProviderDialog = ref(false)
// const newProviderSelection = ref('')

// const openAddProviderDialog = () => {
//     newProviderSelection.value = ''
//     showAddProviderDialog.value = true
// }

const confirmAddProvider = (provider: any) => {
    if (!settings.value) return
    
    let providerData = {
        id: provider?.id || 'new-provider',
        name: provider?.name || 'New Provider',
        apiKey: '',
        baseUrl: provider?.baseUrl || '',
        supportedTypes: [...(provider?.supportedTypes || ['text'])],
        isActive: true,
        taskConfigs: {}
    }

    if (providerData) {
        settings.value.aiSettings.providers.push(providerData as any)
    }
}



// --- Task Config Dialog Logic ---


const showTaskConfigDialog = ref(false)
const showDocUrlPopover = ref(false)
const docUrl = ref('')
const generatingFromDoc = ref(false)
const currentConfigProvider = ref<any>(null)
const activeConfigTab = ref('text')

// Default Templates Library
const TASK_TEMPLATES: Record<string, any> = {
    'geminigen-ai': {
        image: {
            endpoint: 'https://api.geminigen.ai/uapi/v1/generate_image',
            method: 'POST',
            headers: { 'x-api-key': '{{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                prompt: '{{prompt}}',
                aspect_ratio: '{{aspectRatio}}',
                model_id: '{{model}}'
            }, null, 2),
            responseMapping: {
                url: 'url'
            }
        },
        video: {
            endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/grok',
            method: 'POST',
            headers: { 'x-api-key': '{{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                prompt: '{{prompt}}',
                model_id: '{{model}}'
            }, null, 2),
            responseMapping: {
                jobId: 'job_id'
            }
        },
        audio: {
            endpoint: 'https://api.geminigen.ai/uapi/v1/text-to-speech',
            method: 'POST',
            headers: { 'x-api-key': '{{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                text: '{{prompt}}',
                voice: '{{voice}}',
                model: '{{model}}'
            }, null, 2),
            responseMapping: {
                url: 'audio_url'
            }
        }
    },
    'openai': {
        text: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                model: '{{model}}',
                messages: [{ role: 'user', content: '{{prompt}}' }],
                temperature: 0.7
            }, null, 2),
            responseMapping: {
                text: 'choices[0].message.content'
            }
        },
        image: {
            endpoint: 'https://api.openai.com/v1/images/generations',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                model: '{{model}}',
                prompt: '{{prompt}}',
                n: 1,
                size: '{{size}}',
                response_format: 'b64_json'
            }, null, 2),
            responseMapping: {
                b64: 'data[0].b64_json',
                url: 'data[0].url'
            }
        }
    },
    'elevenlabs': {
        audio: {
            endpoint: 'https://api.elevenlabs.io/v1/text-to-speech/{{model}}',
            method: 'POST',
            headers: { 'xi-api-key': '{{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                text: '{{prompt}}',
                model_id: '{{model}}',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            }, null, 2),
            responseMapping: {
                b64: 'audio_base64' // Assuming they added b64 support or we handled streaming elsewhere, but this is a template example
            }
        }
    },
    'suno': {
        music: {
            endpoint: 'https://api.sunoapi.org/api/generate',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{apiKey}}', 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                prompt: '{{prompt}}',
                tags: '{{tags}}',
                title: '{{title}}',
                make_instrumental: false,
                wait_audio: false
            }, null, 2),
            responseMapping: {
                jobId: 'id'
            }
        }
    },
    'google': {
        // Native usually, but if custom endpoint desired:
        text: {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{{model}}:generateContent?key={{apiKey}}',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            payloadTemplate: JSON.stringify({
                contents: [{ parts: [{ text: '{{prompt}}' }] }]
            }, null, 2),
            responseMapping: {
                text: 'candidates[0].content.parts[0].text'
            }
        }
    }
}

const openTaskConfigConfig = (provider: any) => {
    currentConfigProvider.value = provider
    // Initialize taskConfigs if missing
    if (!currentConfigProvider.value.taskConfigs) {
        currentConfigProvider.value.taskConfigs = {}
    }
    
    // Auto-initialize each supported type with default template if available
    provider.supportedTypes?.forEach((type: string) => {
        if (!currentConfigProvider.value.taskConfigs[type]) {
            const template = TASK_TEMPLATES[provider.id]?.[type]
            if (template) {
                const config = { ...template }
                // Convert headers object to JSON string for textarea
                if (config.headers && typeof config.headers === 'object') {
                    config.headers = JSON.stringify(config.headers, null, 2)
                }
                currentConfigProvider.value.taskConfigs[type] = config
            } else {
                // Fallback empty config
                currentConfigProvider.value.taskConfigs[type] = {
                    endpoint: '',
                    method: 'POST',
                    headers: JSON.stringify({ 'Content-Type': 'application/json', 'x-api-key': '{{apiKey}}' }, null, 2),
                    payloadTemplate: '{}',
                    responseMapping: {}
                }
            }
        } else {
            // Convert existing headers to string if it's an object
            if (currentConfigProvider.value.taskConfigs[type].headers && 
                typeof currentConfigProvider.value.taskConfigs[type].headers === 'object') {
                currentConfigProvider.value.taskConfigs[type].headers = 
                    JSON.stringify(currentConfigProvider.value.taskConfigs[type].headers, null, 2)
            }
        }
    })
    
    // Set default tab to first supported type
    if (provider.supportedTypes && provider.supportedTypes.length > 0) {
        activeConfigTab.value = provider.supportedTypes[0]
    }
    showTaskConfigDialog.value = true
}

const applyTemplate = (providerId: string, taskType: string) => {
    const template = TASK_TEMPLATES[providerId]?.[taskType]
    if (template && currentConfigProvider.value) {
        // Init if missing
        if (!currentConfigProvider.value.taskConfigs) currentConfigProvider.value.taskConfigs = {}
        
        currentConfigProvider.value.taskConfigs[taskType] = {
            ...template,
            // Keep existing if we want deeply merge, but usually overwrite is expected on "Apply Template"
        }
        toast.success(`Applied ${providerId} template for ${taskType}`)
    } else {
        toast.error('No default template found for this provider/task combination')
    }
}

const generateFromDocs = async (taskType: string) => {
    if (!docUrl.value.trim()) {
        toast.error('Please enter a documentation URL')
        return
    }
    
    generatingFromDoc.value = true
    
    try {
        const data = await adminStore.generateTemplate(docUrl.value, taskType)
        console.log("data", data);
        
        if (data.endpoint) {
            // Apply the AI-generated template
            if (!currentConfigProvider.value.taskConfigs) {
                currentConfigProvider.value.taskConfigs = {}
            }
            
            currentConfigProvider.value.taskConfigs[taskType] = data
            
            toast.success('Template generated successfully from documentation!')
            showDocUrlPopover.value = false
            docUrl.value = ''
        } else {
            const errorMsg = data.error || 'Failed to generate template'
            const hint = data.hint
            toast.error(hint ? `${errorMsg}\n\n${hint}` : errorMsg, { duration: 8000 })
        }
    } catch (error: any) {
        console.error('Error generating template:', error)
        const errorMsg = error.response?.data?.error || 'Failed to generate template from documentation'
        const hint = error.response?.data?.hint
        toast.error(hint ? `${errorMsg}\n\n💡 ${hint}` : errorMsg, { duration: 8000 })
    } finally {
        generatingFromDoc.value = false
    }
}

const getModelsForProviderAndType = (providerId: string, type: string) => {
    if (!settings.value || !providerId) return []
    return settings.value.aiSettings.models.filter((m: any) => m.isActive && m.providerId === providerId && m.type === type)
}

// Helper to get models for the default selector
const getModelsForProvider = (providerId: string) => {
    const known = KNOWN_PROVIDERS.find(p => p.id === providerId)
    // Return known models + any custom models user added in the "Models" table
    const dbModels = settings.value?.aiSettings.models
        .filter((m: any) => m.providerId === providerId)
        .map((m: any) => m.id) || []
    
    // Merge unique
    return [...new Set([...(known?.models || []), ...dbModels])]
}

const getProvidersForType = (type: string) => {
    if (!settings.value) return []
    return settings.value.aiSettings.providers.filter((p: any) => p.isActive && p.supportedTypes?.includes(type))
}

const removeProvider = async (index: number) => {
    if (!settings.value) return
    const providerToRemove = settings.value.aiSettings.providers[index]
    
    // Check usage in defaults
    const usedIn = Object.entries(settings.value.aiSettings.defaults)
        .filter(([_, config]: [string, any]) => config.providerId === providerToRemove.id)
        .map(([type]) => type)
        
    if (usedIn.length > 0) {
        toast.error(`Cannot remove provider. It is currently the default for: ${usedIn.join(', ')}`)
        return
    }

    try {
        await ElMessageBox.confirm(
            'Are you sure you want to delete this provider? This action cannot be undone.',
            'Delete Provider',
            {
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                type: 'warning',
            }
        )
        settings.value.aiSettings.providers.splice(index, 1)
        toast.success('Provider deleted')
    } catch (error) {
        // User cancelled
    }
}

const addModel = () => {
   if (!settings.value) return
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
    if (!settings.value) return
    settings.value.aiSettings.models.splice(index, 1)
}

const addPackage = () => {
    if (!settings.value) return
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
    if (!settings.value) return
    settings.value.creditPackages.splice(index, 1)
}

onMounted(() => {
    fetchSettings()
})
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
    color: #fff;
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
      color: #fff;
    }
  }
}

// Cinematic Table Styles 
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
      color: rgba(255, 255, 255, 0.6);
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
       border-color: #3b82f6;
    }
    
    .el-input__inner { color: #fff; }
  }
}

// High Contrast Select for Task Defaults
:deep(.high-contrast-select) {
  .el-input__wrapper {
      background: rgba(255, 255, 255, 0.1); // Brighter background
      border: 1px solid rgba(255, 255, 255, 0.2);
      
      .el-input__inner {
          color: #fff;
          font-weight: 500;
      }
      
      &.is-focus {
          border-color: #3b82f6;
          background: rgba(0, 0, 0, 0.6);
      }
      
      // Override scrollbar/dropdown styles if needed via popper-class
  }
}

// Ensure Delete Icon is visible
.icon-btn.delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    
    svg {
        width: 16px;
        height: 16px;
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
        color: rgba(255, 255, 255, 0.6);
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
        background: #111; 
        padding: 0 10px;
        color: rgba(255, 255, 255, 0.4);
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

/* Fixed icon-btn styles */
.icon-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    
    &:hover { 
        background: rgba(255, 255, 255, 0.1); 
        color: #fff;
    }
    
    &.delete {
        color: #ef4444;
        &:hover { background: rgba(239, 68, 68, 0.1); }
    }
}

.code-font {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
}

.flex-row-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mono-text {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

// Task Config Dialog Styles
:deep(.cinematic-dialog) {
    .el-dialog__header {
        background: rgba(0, 0, 0, 0.4);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 20px 24px;
        
        .el-dialog__title {
            color: #fff;
            font-size: 18px;
            font-weight: 600;
        }
    }
    
    .el-dialog__body {
        background: rgba(10, 10, 15, 0.95);
        padding: 24px;
        color: #fff;
    }
    
    .el-dialog__footer {
        background: rgba(0, 0, 0, 0.4);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 16px 24px;
    }
}

.config-content {
    .subtitle {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 8px;
    }
    
    .mb-4 {
        margin-bottom: 16px;
    }
}

.config-tabs {
    :deep(.el-tabs__header) {
        margin-bottom: 20px;
        background: transparent;
    }
    
    :deep(.el-tabs__nav-wrap) {
        &::after {
            display: none;
        }
    }
    
    :deep(.el-tabs__nav) {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 6px;
    }
    
    :deep(.el-tabs__item) {
        color: rgba(255, 255, 255, 0.5);
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 500;
        font-size: 13px;
        letter-spacing: 0.3px;
        
        &.is-active {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }
        
        &:hover:not(.is-active) {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.05);
        }
    }
    
    :deep(.el-tabs__active-bar) {
        display: none;
    }
}

.task-config-form {
    .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 16px;
    }
    
    .template-actions {
        display: flex;
        gap: 8px;
    }
    
    :deep(.el-form-item__label) {
        color: rgba(255, 255, 255, 0.8);
        font-size: 13px;
        font-weight: 500;
    }
    
    :deep(.el-input__wrapper),
    :deep(.el-textarea__inner) {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        
        &:hover, &.is-focus {
            background: rgba(0, 0, 0, 0.5);
            border-color: #3b82f6;
        }
    }
    
    :deep(.el-textarea__inner) {
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.6;
    }
}

.mb-1 {
    margin-bottom: 4px;
}

.mb-2 {
    margin-bottom: 8px;
}

.doc-url-input {
    padding: 4px;
}


.settings-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    
    &.is-active {
      color: #3b82f6;
      font-weight: 600;
    }
  }
}

.api-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
}

.subtitle {
    font-size: 12px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.oauth-provider-section {
    margin-bottom: 20px;
}

.provider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
}

.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }

:deep(.cinematic-dialog) {
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    .el-dialog__title { color: white; }
    .el-dialog__body { padding-top: 10px; }
}

// AI Doc Dropdown - custom implementation to avoid duplicate popover
.ai-doc-wrapper {
    position: relative;
    display: inline-block;
}

.ai-doc-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 400px;
    z-index: 3000;
    background: rgba(20, 20, 25, 0.98);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from, .fade-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

.api-info {
    margin-top: 12px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 6px;
    
    p {
        margin: 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.6;
        
        &:not(:last-child) {
            margin-bottom: 8px;
        }
        
        &.note {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            font-style: italic;
        }
        
        a {
            color: #60a5fa;
            text-decoration: none;
            font-weight: 500;
            
            &:hover {
                text-decoration: underline;
            }
        }
    }
}
.status-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    
    &.valid {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
    }
    
    &.expired, &.invalid {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
    }
}

.type-badge {
    color: #60a5fa;
    font-weight: 700;
}

.license-info {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        font-weight: 600;
    }
    
    .value {
        font-size: 14px;
        color: #fff;
    }
}
</style>
