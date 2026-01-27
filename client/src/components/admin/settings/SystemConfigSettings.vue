<template>
    <div class="api-grid grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- SMTP -->
        <el-card class="settings-section">
            <template #header>SMTP Configuration</template>
            <el-form :model="apiConfigs.smtp" label-position="top">
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
            <el-form :model="apiConfigs.aws" label-position="top">
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
            <template #header>Stripe Payments</template>
            <el-form :model="apiConfigs.stripe" label-position="top">
                <el-form-item label="Public Key">
                    <el-input v-model="apiConfigs.stripe.publicKey" class="glass-input" />
                </el-form-item>
                <el-form-item label="Secret Key">
                    <el-input v-model="apiConfigs.stripe.secretKey" type="password" show-password class="glass-input" />
                </el-form-item>
                <el-form-item label="Webhook Secret">
                    <el-input v-model="apiConfigs.stripe.webhookSecret" type="password" show-password
                        class="glass-input" />
                </el-form-item>
            </el-form>
        </el-card>

        <!-- Social Login / OAuth -->
        <el-card class="settings-section">
            <template #header>Social Login (OAuth)</template>

            <!-- Google OAuth -->
            <div class="oauth-provider-section mb-6">
                <div class="provider-header flex justify-between items-center mb-4">
                    <div class="subtitle font-bold">Google Identity</div>
                    <el-switch v-model="oauthProviders.google.enabled" active-text="Active" />
                </div>
                <el-form :model="apiConfigs.social.google" label-position="top" size="small">
                    <el-form-item label="Client ID">
                        <el-input v-model="apiConfigs.social.google.clientId" :disabled="!oauthProviders.google.enabled"
                            class="glass-input" />
                    </el-form-item>
                    <el-form-item label="Client Secret">
                        <el-input v-model="apiConfigs.social.google.clientSecret" type="password" show-password
                            :disabled="!oauthProviders.google.enabled" class="glass-input" />
                    </el-form-item>
                </el-form>
            </div>

            <el-divider />

            <!-- Facebook OAuth -->
            <div class="oauth-provider-section mt-6">
                <div class="provider-header flex justify-between items-center mb-4">
                    <div class="subtitle font-bold">Facebook Login</div>
                    <el-switch v-model="oauthProviders.facebook.enabled" active-text="Active" />
                </div>
                <el-form :model="apiConfigs.social.facebook" label-position="top" size="small">
                    <el-form-item label="App ID">
                        <el-input v-model="apiConfigs.social.facebook.appId"
                            :disabled="!oauthProviders.facebook.enabled" class="glass-input" />
                    </el-form-item>
                    <el-form-item label="App Secret">
                        <el-input v-model="apiConfigs.social.facebook.appSecret" type="password" show-password
                            :disabled="!oauthProviders.facebook.enabled" class="glass-input" />
                    </el-form-item>
                </el-form>
            </div>
        </el-card>

        <!-- Ant Media Server -->
        <el-card class="settings-section">
            <template #header>Ant Media Server (Publishing)</template>
            <el-form :model="apiConfigs.antMedia" label-position="top">
                <el-form-item label="Base URL (e.g. https://your-ams:5443)">
                    <el-input v-model="apiConfigs.antMedia.baseUrl" placeholder="https://..." class="glass-input" />
                </el-form-item>
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="Admin Email">
                            <el-input v-model="apiConfigs.antMedia.email" class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="Admin Password">
                            <el-input v-model="apiConfigs.antMedia.password" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="Target Application (e.g. WebRTCAppEE)">
                    <el-input v-model="apiConfigs.antMedia.appName" class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">Used for authenticating and managing live streams/RTMP ingest.
                        Refer to
                        AMS REST API Docs for setup instructions.</p>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    apiConfigs: any;
    oauthProviders: any;
}>();
</script>
