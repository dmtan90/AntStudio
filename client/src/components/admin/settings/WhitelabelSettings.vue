<template>
    <el-card class="settings-section">
        <template #header>Branding Configuration</template>
        <el-form label-position="top" v-if="whitelabel">
            <el-form-item label="Application Name">
                <el-input v-model="whitelabel.appName" placeholder="AntStudio" class="glass-input" />
            </el-form-item>
            <el-form-item label="Logo URL">
                <el-input v-model="whitelabel.logo" placeholder="/logo.png or https://..." class="glass-input" />
                <div class="mt-4 p-4 bg-black/30 rounded-xl border border-white/5" v-if="whitelabel.logo">
                    <p class="text-[10px] text-muted mb-2 uppercase font-black opacity-50">Identity Preview:</p>
                    <img :src="getFileUrl(whitelabel.logo)" style="height: 48px; object-fit: contain;" />
                </div>
            </el-form-item>
            <el-form-item label="Favicon URL">
                <el-input v-model="whitelabel.favicon" placeholder="/favicon.ico or https://..." class="glass-input" />
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup lang="ts">
defineProps<{
    whitelabel: any;
    getFileUrl: (path: string) => string;
}>();
</script>
