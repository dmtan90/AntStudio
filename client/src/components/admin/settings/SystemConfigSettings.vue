<template>
    <div class="api-grid grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
        <!-- Public Domain -->
        <el-card class="settings-section">
            <template #header>{{ $t('admin.settings.system.domain.title') }}</template>
            <el-form :model="apiConfigs" label-position="top">
                <el-form-item :label="t('admin.settings.system.domain.label')">
                    <el-input v-model="apiConfigs.publicDomain" :placeholder="t('admin.settings.system.domain.placeholder')"
                        class="glass-input" />
                    <div class="text-[11px] text-gray-500 mt-1">{{ $t('admin.settings.system.domain.info', { url: 'https://your-domain.com/api/platforms/callback/...' }) }}</div>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- Proxy Configuration -->
        <el-card class="settings-section" v-if="apiConfigs.proxy">
            <template #header>
                <div class="flex justify-between items-center w-full">
                    <span>{{ $t('admin.settings.system.proxy.title') }}</span>
                    <el-switch v-model="apiConfigs.proxy.enabled" size="small" />
                </div>
            </template>
            
            <el-form :model="apiConfigs.proxy.webshare" label-position="top" :disabled="!apiConfigs.proxy.enabled">
                <el-row :gutter="20">
                    <el-col :span="16">
                        <el-form-item :label="t('admin.settings.system.proxy.domain')">
                            <el-input v-model="apiConfigs.proxy.webshare.domainName" placeholder="p.webshare.io" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item :label="t('admin.settings.system.proxy.port')">
                            <el-input-number v-model="apiConfigs.proxy.webshare.proxyPort" :controls="false" style="width: 100%" class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item :label="t('admin.settings.system.proxy.user')">
                    <el-input v-model="apiConfigs.proxy.webshare.proxyUsername" class="glass-input" />
                </el-form-item>
                <el-form-item :label="t('admin.settings.system.proxy.pass')">
                    <el-input v-model="apiConfigs.proxy.webshare.proxyPassword" type="password" show-password class="glass-input" />
                </el-form-item>
            </el-form>
            <div class="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold opacity-50">{{ $t('admin.settings.system.proxy.integration') }}</div>
        </el-card>

        <!-- SMTP -->
        <el-card class="settings-section">
            <template #header>{{ $t('admin.settings.system.smtp.title') }}</template>
            <el-form :model="apiConfigs.smtp" label-position="top" v-if="apiConfigs">
                <el-row :gutter="20">
                    <el-col :span="18">
                        <el-form-item :label="t('admin.settings.system.smtp.host')">
                            <el-input v-model="apiConfigs.smtp.host" placeholder="smtp.gmail.com" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="6">
                        <el-form-item :label="t('admin.settings.system.smtp.port')">
                            <el-input-number v-model="apiConfigs.smtp.port" :controls="false" style="width: 100%"
                                class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item :label="t('admin.settings.system.smtp.user')">
                    <el-input v-model="apiConfigs.smtp.user" class="glass-input" />
                </el-form-item>
                <el-form-item :label="t('admin.settings.system.smtp.pass')">
                    <el-input v-model="apiConfigs.smtp.pass" type="password" show-password class="glass-input" />
                </el-form-item>
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item :label="t('admin.settings.system.smtp.fromEmail')">
                            <el-input v-model="apiConfigs.smtp.fromEmail" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('admin.settings.system.smtp.fromName')">
                            <el-input v-model="apiConfigs.smtp.fromName" class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
        </el-card>

        <!-- Stripe -->
        <el-card class="settings-section">
            <template #header>{{ $t('admin.settings.system.payment.title') }}</template>
            <el-tabs class="nested-tabs">
                <el-tab-pane :label="t('admin.settings.system.payment.stripe')">
                    <el-form :model="apiConfigs.stripe" label-position="top" v-if="apiConfigs">
                        <el-form-item :label="t('admin.settings.system.payment.publicKey')">
                            <el-input v-model="apiConfigs.stripe.publicKey" class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.secretKey')">
                            <el-input v-model="apiConfigs.stripe.secretKey" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.webhookSecret')">
                            <el-input v-model="apiConfigs.stripe.webhookSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
                <el-tab-pane :label="t('admin.settings.system.payment.paypal')">
                    <el-form :model="apiConfigs.paypal" label-position="top" v-if="apiConfigs">
                        <el-form-item :label="t('admin.settings.system.payment.clientId')">
                            <el-input v-model="apiConfigs.paypal.clientId" 
                                :placeholder="t('admin.settings.system.payment.clientId')" 
                                class="glass-input" />
                            <div class="text-[11px] text-gray-500 mt-1">
                                Get this from PayPal Developer Dashboard → My Apps & Credentials
                            </div>
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.clientSecret')">
                            <el-input v-model="apiConfigs.paypal.clientSecret" 
                                type="password" 
                                show-password
                                :placeholder="t('admin.settings.system.payment.clientSecret')"
                                class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.webhookSecretOptional')">
                            <el-input v-model="apiConfigs.paypal.webhookSecret" 
                                type="password" 
                                show-password
                                placeholder="Webhook ID from PayPal"
                                class="glass-input" />
                            <div class="text-[11px] text-gray-500 mt-1">
                                {{ $t('admin.settings.system.payment.webhookInfo') }}
                            </div>
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.mode')">
                            <el-radio-group v-model="apiConfigs.paypal.mode" size="small">
                                <el-radio-button value="sandbox">{{ $t('admin.settings.system.payment.sandbox') }}</el-radio-button>
                                <el-radio-button value="live">{{ $t('admin.settings.system.payment.live') }}</el-radio-button>
                            </el-radio-group>
                            <div class="text-[11px] text-gray-500 mt-1">
                                {{ $t('admin.settings.system.payment.modeInfo') }}
                            </div>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <!-- Multi-Cloud Storage Hub -->
        <el-card class="settings-section md:col-span-3 xl:col-span-3">
            <template #header>
                <div class="flex justify-between items-center w-full">
                    <span>{{ $t('admin.settings.system.storage.title') }}</span>
                    <el-radio-group v-model="apiConfigs.storage.activeProvider" size="small" class="premium-radio">
                        <el-radio-button value="s3">{{ $t('admin.settings.system.storage.awsS3') }}</el-radio-button>
                        <el-radio-button value="google_drive">{{ $t('admin.settings.system.storage.googleDrive') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                <!-- AWS S3 (Active/Inactive state based on selection) -->
                <div :class="['storage-provider-card p-6 rounded-3xl border transition-all', apiConfigs.storage.activeProvider === 's3' ? 'bg-blue-600/5 border-blue-500/30' : 'bg-white/2 border-white/5 opacity-50 grayscale']">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                            <i class="at-brand-aws text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-white font-black uppercase text-xs tracking-widest">{{ $t('admin.settings.system.storage.amazonS3') }}</h3>
                            <p class="text-[10px] text-gray-500">{{ $t('admin.settings.system.storage.s3Info') }}</p>
                        </div>
                    </div>
                    
                    <el-form :model="apiConfigs.aws" label-position="top" size="small">
                        <el-row :gutter="20">
                            <el-col :span="12">
                                <el-form-item :label="t('admin.settings.system.storage.accessKeyId')">
                                    <el-input v-model="apiConfigs.aws.accessKeyId" class="glass-input" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :label="t('admin.settings.system.storage.secretAccessKey')">
                                    <el-input v-model="apiConfigs.aws.secretAccessKey" type="password" show-password class="glass-input" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-row :gutter="20">
                            <el-col :span="12">
                                <el-form-item :label="t('admin.settings.system.storage.bucketName')">
                                    <el-input v-model="apiConfigs.aws.bucketName" class="glass-input" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :label="t('admin.settings.system.storage.region')">
                                    <el-input v-model="apiConfigs.aws.region" class="glass-input" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-form-item :label="t('admin.settings.system.storage.customEndpoint')">
                            <el-input v-model="apiConfigs.aws.endpoint" placeholder="https://..." class="glass-input" />
                        </el-form-item>
                    </el-form>
                </div>

                <!-- Google Drive -->
                <div :class="['storage-provider-card p-6 rounded-3xl border transition-all', apiConfigs.storage.activeProvider === 'google_drive' ? 'bg-green-600/5 border-green-500/30' : 'bg-white/2 border-white/5 opacity-50 grayscale']">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400">
                            <i class="at-brand-drive text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-white font-black uppercase text-xs tracking-widest">{{ $t('admin.settings.system.storage.googleDrive') }}</h3>
                            <p class="text-[10px] text-gray-500">{{ $t('admin.settings.system.storage.driveInfo') }}</p>
                        </div>
                    </div>

                    <el-form :model="apiConfigs.storage.googleDrive" label-position="top" size="small">
                        <el-form-item :label="t('admin.settings.system.storage.serviceAccountEmail')">
                            <el-input v-model="apiConfigs.storage.googleDrive.clientEmail" placeholder="...-sa@project.iam.gserviceaccount.com" class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.storage.privateKey')">
                            <el-input v-model="apiConfigs.storage.googleDrive.privateKey" type="textarea" :rows="3" placeholder="-----BEGIN PRIVATE KEY-----..." class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.storage.rootFolderId')">
                            <el-input v-model="apiConfigs.storage.googleDrive.rootFolderId" placeholder="folder-uuid-from-url" class="glass-input" />
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </el-card>

        <!-- Social Login / OAuth -->
        <el-card class="settings-section md:col-span-3 xl:col-span-3">
            <template #header>{{ $t('admin.settings.system.oauth.title') }}</template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Google OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-red-500"></div> {{ $t('admin.settings.system.oauth.googleIdentity') }}
                        </div>
                        <el-switch v-model="apiConfigs.oauth.google.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.google" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.google.enabled">
                        <el-form-item :label="t('admin.settings.system.payment.clientId')">
                            <el-input v-model="apiConfigs.oauth.google.clientId" class="glass-input"
                                placeholder="...apps.googleusercontent.com" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.clientSecret')">
                            <el-input v-model="apiConfigs.oauth.google.clientSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.oauth.redirectUriOverride')">
                            <el-input v-model="apiConfigs.oauth.google.redirectUriOverride" class="glass-input"
                                :placeholder="t('admin.settings.system.oauth.redirectInfo')" />
                        </el-form-item>
                    </el-form>
                </div>

                <!-- Facebook OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-blue-600"></div> {{ $t('admin.settings.system.oauth.facebook') }}
                        </div>
                        <el-switch v-model="apiConfigs.oauth.facebook.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.facebook" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.facebook.enabled">
                        <el-form-item :label="t('admin.settings.system.oauth.appId')">
                            <el-input v-model="apiConfigs.oauth.facebook.appId" class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.oauth.appSecret')">
                            <el-input v-model="apiConfigs.oauth.facebook.appSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </div>

                <!-- TikTok OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-black border border-white/20"></div> {{ $t('admin.settings.system.oauth.tiktok') }}
                        </div>
                        <el-switch v-model="apiConfigs.oauth.tiktok.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.tiktok" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.tiktok.enabled">
                        <el-form-item :label="t('admin.settings.system.oauth.clientKey')">
                            <el-input v-model="apiConfigs.oauth.tiktok.clientKey" class="glass-input" />
                        </el-form-item>
                        <el-form-item :label="t('admin.settings.system.payment.clientSecret')">
                            <el-input v-model="apiConfigs.oauth.tiktok.clientSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
    apiConfigs: any;
    oauthProviders: any;
}>();
</script>
