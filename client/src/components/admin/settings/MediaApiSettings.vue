<template>
    <div class="api-grid grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Giphy API -->
        <el-card class="settings-section">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>Giphy API</span>
                    <el-switch v-model="apiConfigs.media.giphy.enabled" active-text="Active" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.giphy" label-position="top">
                <el-form-item label="API Key">
                    <el-input v-model="apiConfigs.media.giphy.apiKey" type="password" show-password
                        placeholder="Enter Giphy API key" :disabled="!apiConfigs.media.giphy.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">Used for GIFs, stickers, and emoji in the video editor. Get keys
                        from Giphy
                        Developers.</p>
                </div>
            </el-form>
        </el-card>

        <!-- Pexels API -->
        <el-card class="settings-section">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>Pexels API</span>
                    <el-switch v-model="apiConfigs.media.pexels.enabled" active-text="Active" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.pexels" label-position="top">
                <el-form-item label="API Key">
                    <el-input v-model="apiConfigs.media.pexels.apiKey" type="password" show-password
                        placeholder="Enter Pexels API key" :disabled="!apiConfigs.media.pexels.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">Used for stock photos and videos. Ensure you meet Pexels
                        Attribution
                        requirements if using the free tier.</p>
                </div>
            </el-form>
        </el-card>

        <!-- Unsplash API -->
        <el-card class="settings-section">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>Unsplash API</span>
                    <el-switch v-model="apiConfigs.media.unsplash.enabled" active-text="Active" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.unsplash" label-position="top">
                <el-form-item label="API Key (Access Key)">
                    <el-input v-model="apiConfigs.media.unsplash.apiKey" type="password" show-password
                        placeholder="Client-ID your-access-key" :disabled="!apiConfigs.media.unsplash.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">Format: "Client-ID your-access-key". Used for high-quality,
                        professional
                        photography assets.</p>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    apiConfigs: any;
}>();
</script>
