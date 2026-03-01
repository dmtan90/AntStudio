<template>
    <div class="api-grid grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Giphy API -->
        <el-card class="settings-section" v-if="apiConfigs && apiConfigs.media && apiConfigs.media.giphy">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>{{ $t('admin.settings.media.giphy.title') }}</span>
                    <el-switch v-model="apiConfigs.media.giphy.enabled" :active-text="t('admin.userDetails.status.active')" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.giphy" label-position="top"
                v-if="apiConfigs && apiConfigs.media && apiConfigs.media.giphy">
                <el-form-item :label="t('admin.settings.media.giphy.apiKey')">
                    <el-input v-model="apiConfigs.media.giphy.apiKey" type="password" show-password
                        :placeholder="t('admin.settings.media.giphy.placeholder')" :disabled="!apiConfigs.media.giphy.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">{{ $t('admin.settings.media.giphy.info') }}</p>
                </div>
            </el-form>
        </el-card>

        <!-- Pexels API -->
        <el-card class="settings-section" v-if="apiConfigs && apiConfigs.media && apiConfigs.media.pexels">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>{{ $t('admin.settings.media.pexels.title') }}</span>
                    <el-switch v-model="apiConfigs.media.pexels.enabled" :active-text="t('admin.userDetails.status.active')" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.pexels" label-position="top"
                v-if="apiConfigs && apiConfigs.media && apiConfigs.media.pexels">
                <el-form-item :label="t('admin.settings.media.pexels.apiKey')">
                    <el-input v-model="apiConfigs.media.pexels.apiKey" type="password" show-password
                        :placeholder="t('admin.settings.media.pexels.placeholder')" :disabled="!apiConfigs.media.pexels.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">{{ $t('admin.settings.media.pexels.info') }}</p>
                </div>
            </el-form>
        </el-card>

        <!-- Unsplash API -->
        <el-card class="settings-section" v-if="apiConfigs && apiConfigs.media && apiConfigs.media.unsplash">
            <template #header>
                <div class="provider-header flex justify-between items-center">
                    <span>{{ $t('admin.settings.media.unsplash.title') }}</span>
                    <el-switch v-model="apiConfigs.media.unsplash.enabled" :active-text="t('admin.userDetails.status.active')" />
                </div>
            </template>
            <el-form :model="apiConfigs.media.unsplash" label-position="top"
                v-if="apiConfigs && apiConfigs.media && apiConfigs.media.unsplash">
                <el-form-item :label="t('admin.settings.media.unsplash.apiKey')">
                    <el-input v-model="apiConfigs.media.unsplash.apiKey" type="password" show-password
                        :placeholder="t('admin.settings.media.unsplash.placeholder')" :disabled="!apiConfigs.media.unsplash.enabled"
                        class="glass-input" />
                </el-form-item>
                <div class="api-info p-3 bg-black/20 rounded-xl mt-4">
                    <p class="text-[10px] opacity-60">{{ $t('admin.settings.media.unsplash.info') }}</p>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
    apiConfigs: any;
}>();
</script>
