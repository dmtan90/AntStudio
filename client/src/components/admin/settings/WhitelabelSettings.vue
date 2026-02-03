<template>
    <el-card class="settings-section">
        <template #header>
            <div class="flex items-center justify-between">
                <span>Branding Configuration</span>
                <el-tag type="info" size="small" class="opacity-50">WHITELABEL CORE</el-tag>
            </div>
        </template>

        <el-form label-position="top" v-if="whitelabel" class="space-y-6">
            <el-form-item label="Application Name">
                <el-input v-model="whitelabel.appName" placeholder="AntStudio" class="glass-input" />
            </el-form-item>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Logo Upload -->
                <el-form-item label="Application Logo">
                    <div class="flex flex-col gap-3">
                        <div class="flex gap-2">
                            <el-input v-model="whitelabel.logo" placeholder="/logo.png or https://..."
                                class="glass-input flex-grow" />
                            <el-button @click="triggerUpload('logo')" :loading="uploadingLogo" class="action-btn">
                                <upload theme="outline" size="16" />
                            </el-button>
                        </div>

                        <div v-if="whitelabel.logo" class="preview-container">
                            <p class="preview-label">Logo Preview</p>
                            <div class="preview-box">
                                <img :src="getFileUrl(whitelabel.logo)" class="logo-preview" />
                            </div>
                        </div>
                    </div>
                </el-form-item>

                <!-- Favicon Upload -->
                <el-form-item label="Browser Favicon">
                    <div class="flex flex-col gap-3">
                        <div class="flex gap-2">
                            <el-input v-model="whitelabel.favicon" placeholder="/favicon.ico or https://..."
                                class="glass-input flex-grow" />
                            <el-button @click="triggerUpload('favicon')" :loading="uploadingFavicon" class="action-btn">
                                <upload theme="outline" size="16" />
                            </el-button>
                        </div>

                        <div v-if="whitelabel.favicon" class="preview-container">
                            <p class="preview-label">Favicon Preview</p>
                            <div class="preview-box compact">
                                <img :src="getFileUrl(whitelabel.favicon)" class="favicon-preview" />
                            </div>
                        </div>
                    </div>
                </el-form-item>
            </div>

            <!-- Hidden inputs for file picking -->
            <input type="file" ref="logoInput" class="hidden" accept="image/*"
                @change="(e) => handleFileChange(e, 'logo')" />
            <input type="file" ref="faviconInput" class="hidden" accept="image/*,image/x-icon"
                @change="(e) => handleFileChange(e, 'favicon')" />
        </el-form>
    </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Upload } from '@icon-park/vue-next';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';

const props = defineProps<{
    whitelabel: any;
    getFileUrl: (path: string) => string;
}>();

const projectStore = useProjectStore();
const logoInput = ref<HTMLInputElement | null>(null);
const faviconInput = ref<HTMLInputElement | null>(null);
const uploadingLogo = ref(false);
const uploadingFavicon = ref(false);

const triggerUpload = (type: 'logo' | 'favicon') => {
    if (type === 'logo') logoInput.value?.click();
    else faviconInput.value?.click();
};

const handleFileChange = async (event: Event, type: 'logo' | 'favicon') => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (type === 'logo') uploadingLogo.value = true;
    else uploadingFavicon.value = true;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'whitelabel'); // Identifier for the backend if needed

        const res = await projectStore.uploadMedia(formData);
        if (res.success && res.data?.url) {
            props.whitelabel[type] = res.data.url;
            toast.success(`Successfully uploaded whitelabel ${type}`);
        }
    } catch (e) {
        toast.error(`Failed to upload ${type}`);
        console.error(e);
    } finally {
        if (type === 'logo') uploadingLogo.value = false;
        else uploadingFavicon.value = false;
        target.value = ''; // Reset input
    }
};
</script>

<style lang="scss" scoped>
.preview-container {
    padding: 12px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-label {
    font-size: 10px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
    border-radius: 8px;

    &.compact {
        min-height: 50px;
    }
}

.logo-preview {
    height: 48px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.favicon-preview {
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.action-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 12px;
    height: auto;

    &:hover {
        background: rgba(37, 99, 235, 0.2);
        border-color: #3b82f6;
        color: #60a5fa;
    }
}
</style>
