<template>
    <div class="api-grid grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
        <!-- Public Domain -->
        <el-card class="settings-section md:col-span-3 xl:col-span-3">
            <template #header>System Domain</template>
            <el-form :model="apiConfigs" label-position="top">
                <el-form-item label="Public Domain (URL)">
                    <el-input v-model="apiConfigs.publicDomain" placeholder="https://your-domain.com"
                        class="glass-input" />
                    <div class="text-[11px] text-gray-500 mt-1">Used for generating OAuth callback URLs (e.g.
                        https://your-domain.com/api/platforms/callback/...).</div>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- SMTP -->
        <el-card class="settings-section">
            <template #header>SMTP Configuration</template>
            <el-form :model="apiConfigs.smtp" label-position="top" v-if="apiConfigs">
                <el-row :gutter="20">
                    <el-col :span="18">
                        <el-form-item label="Host">
                            <el-input v-model="apiConfigs.smtp.host" placeholder="smtp.gmail.com" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="6">
                        <el-form-item label="Port">
                            <el-input-number v-model="apiConfigs.smtp.port" :controls="false" style="width: 100%"
                                class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="User">
                    <el-input v-model="apiConfigs.smtp.user" class="glass-input" />
                </el-form-item>
                <el-form-item label="Password">
                    <el-input v-model="apiConfigs.smtp.pass" type="password" show-password class="glass-input" />
                </el-form-item>
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="From Email">
                            <el-input v-model="apiConfigs.smtp.fromEmail" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="From Name">
                            <el-input v-model="apiConfigs.smtp.fromName" class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
        </el-card>

        <!-- AWS S3 -->
        <el-card class="settings-section">
            <template #header>AWS S3 Storage</template>
            <el-form :model="apiConfigs.aws" label-position="top" v-if="apiConfigs">
                <el-form-item label="Access Key ID">
                    <el-input v-model="apiConfigs.aws.accessKeyId" class="glass-input" />
                </el-form-item>
                <el-form-item label="Secret Access Key">
                    <el-input v-model="apiConfigs.aws.secretAccessKey" type="password" show-password
                        class="glass-input" />
                </el-form-item>
                <el-form-item label="Bucket Name">
                    <el-input v-model="apiConfigs.aws.bucketName" class="glass-input" />
                </el-form-item>
                <el-form-item label="Region">
                    <el-input v-model="apiConfigs.aws.region" class="glass-input" />
                </el-form-item>
                <el-form-item label="Endpoint (for S3-compatible)">
                    <el-input v-model="apiConfigs.aws.endpoint" placeholder="https://..." class="glass-input" />
                </el-form-item>
            </el-form>
        </el-card>

        <!-- Stripe -->
        <el-card class="settings-section">
            <template #header>Payment Gateways</template>
            <el-tabs class="nested-tabs">
                <el-tab-pane label="Stripe">
                    <el-form :model="apiConfigs.stripe" label-position="top" v-if="apiConfigs">
                        <el-form-item label="Public Key">
                            <el-input v-model="apiConfigs.stripe.publicKey" class="glass-input" />
                        </el-form-item>
                        <el-form-item label="Secret Key">
                            <el-input v-model="apiConfigs.stripe.secretKey" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                        <el-form-item label="Webhook Secret">
                            <el-input v-model="apiConfigs.stripe.webhookSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
                <el-tab-pane label="PayPal">
                    <!-- Placeholder -->
                    <div class="text-sm opacity-50 p-4">PayPal configuration coming soon.</div>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <!-- Social Login / OAuth -->
        <el-card class="settings-section md:col-span-3 xl:col-span-3">
            <template #header>Social Login (OAuth)</template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Google OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-red-500"></div> Google Identity
                        </div>
                        <el-switch v-model="apiConfigs.oauth.google.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.google" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.google.enabled">
                        <el-form-item label="Client ID">
                            <el-input v-model="apiConfigs.oauth.google.clientId" class="glass-input"
                                placeholder="...apps.googleusercontent.com" />
                        </el-form-item>
                        <el-form-item label="Client Secret">
                            <el-input v-model="apiConfigs.oauth.google.clientSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                        <el-form-item label="Redirect URI Override (Optional)">
                            <el-input v-model="apiConfigs.oauth.google.redirectUriOverride" class="glass-input"
                                placeholder="Leave empty to use Public Domain" />
                        </el-form-item>
                    </el-form>
                </div>

                <!-- Facebook OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-blue-600"></div> Facebook
                        </div>
                        <el-switch v-model="apiConfigs.oauth.facebook.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.facebook" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.facebook.enabled">
                        <el-form-item label="App ID">
                            <el-input v-model="apiConfigs.oauth.facebook.appId" class="glass-input" />
                        </el-form-item>
                        <el-form-item label="App Secret">
                            <el-input v-model="apiConfigs.oauth.facebook.appSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </div>

                <!-- TikTok OAuth -->
                <div class="oauth-provider-section" v-if="apiConfigs.oauth">
                    <div class="provider-header flex justify-between items-center mb-4">
                        <div class="subtitle font-bold flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-black border border-white/20"></div> TikTok
                        </div>
                        <el-switch v-model="apiConfigs.oauth.tiktok.enabled" size="small" />
                    </div>
                    <el-form :model="apiConfigs.oauth.tiktok" label-position="top" size="small"
                        :disabled="!apiConfigs.oauth.tiktok.enabled">
                        <el-form-item label="Client Key">
                            <el-input v-model="apiConfigs.oauth.tiktok.clientKey" class="glass-input" />
                        </el-form-item>
                        <el-form-item label="Client Secret">
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
defineProps<{
    apiConfigs: any;
    oauthProviders: any;
}>();
</script>
