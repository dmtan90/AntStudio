<template>
    <div class="admin-settings p-6 max-w-7xl mx-auto animate-in">
        <header class="page-header flex justify-between items-center mb-10">
            <div>
                <h1 class="text-3xl font-black uppercase tracking-tighter">System Configuration</h1>
                <p class="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Global AntFlow Intelligence
                    Registry</p>
            </div>
            <div class="flex gap-4">
                <el-button @click="fetchSettings" :loading="loading" class="glass-btn">Reload Core</el-button>
                <el-button type="primary" @click="saveSettings" :loading="saving" class="save-btn px-8">Save All
                    Changes</el-button>
            </div>
        </header>

        <el-tabs v-model="activeTab" class="settings-tabs custom-tabs">
            <!-- License & Identity -->
            <el-tab-pane label="License & Identity" name="license">
                <div class="space-y-6">
                    <LicenseSettings :license="settings.license" />
                    <WhitelabelSettings :whitelabel="settings.whitelabel" :get-file-url="getFileUrl" />
                </div>
            </el-tab-pane>

            <!-- System Infrastructure -->
            <el-tab-pane label="System Infrastructure" name="system">
                <SystemConfigSettings :api-configs="settings.apiConfigs"
                    :oauth-providers="settings.apiConfigs.social" />
            </el-tab-pane>

            <!-- Media Content APIs -->
            <el-tab-pane label="Media Asset APIs" name="media">
                <MediaApiSettings :api-configs="settings.apiConfigs" />
            </el-tab-pane>

            <!-- Artificial Intelligence -->
            <el-tab-pane label="Neural Engine" name="ai">
                <div class="space-y-8">
                    <AIModelSettings :providers="settings.aiSettings.providers" :ai-o-auth="settings.aiSettings.oauth"
                        :ai-studio-cookies="settings.aiSettings.sessionSync?.googleCookies || ''"
                        :suggested-redirect-uri="suggestedRedirectUri" :known-providers="KNOWN_PROVIDERS"
                        @add-provider="addProvider" @remove-provider="removeProvider"
                        @save-cookies="saveAIStudioCookies" @sync-google="syncGoogleAI" />

                    <TaskDefaultsSettings :ai-settings="settings.aiSettings"
                        :get-providers-for-type="getProvidersForType" :get-models-for-provider="getModelsForProvider" />
                </div>
            </el-tab-pane>

            <!-- Subscriptions & Economy -->
            <el-tab-pane label="Commercial Core" name="billing">
                <SubscriptionSettings :plans="settings.billing.plans" :credit-packages="settings.billing.creditPackages"
                    @add-package="addPackage" @remove-package="removePackage" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';
import axios from 'axios';

// Components
import LicenseSettings from '@/components/admin/settings/LicenseSettings.vue';
import WhitelabelSettings from '@/components/admin/settings/WhitelabelSettings.vue';
import SystemConfigSettings from '@/components/admin/settings/SystemConfigSettings.vue';
import MediaApiSettings from '@/components/admin/settings/MediaApiSettings.vue';
import AIModelSettings from '@/components/admin/settings/AIModelSettings.vue';
import TaskDefaultsSettings from '@/components/admin/settings/TaskDefaultsSettings.vue';
import SubscriptionSettings from '@/components/admin/settings/SubscriptionSettings.vue';

const adminStore = useAdminStore();
const activeTab = ref('license');
const loading = ref(false);
const saving = ref(false);

const settings = computed(() => adminStore.settings);

const suggestedRedirectUri = computed(() => {
    return `${window.location.origin}/api/ai/auth/google/callback`;
});

const KNOWN_PROVIDERS = [
    { id: 'google_gemini', name: 'Google Gemini (Vertex AI)', supportedTypes: ['text', 'image', 'video'] },
    { id: 'openai_gpt', name: 'OpenAI (GPT-4 / DALL-E)', supportedTypes: ['text', 'image'] },
    { id: 'anthropic', name: 'Anthropic (Claude)', supportedTypes: ['text'] },
    { id: 'stability_ai', name: 'Stability AI', supportedTypes: ['image', 'video'] },
    { id: 'eleven_labs', name: 'Eleven Labs (Neural Voice)', supportedTypes: ['audio'] }
];

// Methods
const fetchSettings = async () => {
    loading.value = true;
    try {
        await adminStore.fetchSettings();
        toast.success("System settings synchronized");
    } catch (e) {
        toast.error("Failed to load settings registry");
    } finally {
        loading.value = false;
    }
};

const saveSettings = async () => {
    saving.value = true;
    try {
        await adminStore.updateSettings(settings.value);
        toast.success("All changes committed to neural core");
    } catch (e) {
        toast.error("Failed to save changes");
    } finally {
        saving.value = false;
    }
};

const getFileUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_BASE || ''}${path}`;
};

const addProvider = (known: any) => {
    const newProvider = {
        id: known ? known.id : `custom_${Date.now()}`,
        name: known ? known.name : 'New Core',
        apiKey: '',
        baseUrl: '',
        isActive: true,
        supportedTypes: known ? [...known.supportedTypes] : ['text']
    };
    settings.value.aiSettings.providers.push(newProvider);
};

const removeProvider = (idx: number) => {
    settings.value.aiSettings.providers.splice(idx, 1);
};

const saveAIStudioCookies = async (cookies: string) => {
    settings.value.aiSettings.sessionSync.googleCookies = cookies;
    toast.success("Session state staged for commit");
};

const syncGoogleAI = async () => {
    toast.info("Initiating high-speed Google AI Handshake...");
    // Logic for fast sync
};

const getProvidersForType = (type: string) => {
    return settings.value.aiSettings.providers.filter((p: any) => p.supportedTypes.includes(type));
};

const getModelsForProvider = (providerId: string) => {
    // Logic to return known models for provider or return empty for custom
    if (providerId === 'google_gemini') return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-ultra'];
    if (providerId === 'openai_gpt') return ['gpt-4o', 'gpt-4-turbo', 'dall-e-3'];
    return [];
};

const addPackage = () => {
    settings.value.billing.creditPackages.push({ name: 'Pro Neural Pack', credits: 5000, price: 49.00, isActive: true });
};

const removePackage = (idx: number) => {
    settings.value.billing.creditPackages.splice(idx, 1);
};

onMounted(fetchSettings);
</script>

<style lang="scss" scoped>
.admin-settings {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(30, 64, 175, 0.05), transparent 40%);
}

.save-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(37, 99, 235, 0.3);
    }
}

.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
}

:deep(.custom-tabs) {
    .el-tabs__header {
        margin-bottom: 40px;
    }

    .el-tabs__nav-wrap::after {
        display: none;
    }

    .el-tabs__active-bar {
        background: #3b82f6;
        height: 3px;
        border-radius: 3px;
        box-shadow: 0 0 15px #3b82f6;
    }

    .el-tabs__item {
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: rgba(255, 255, 255, 0.3);
        padding: 0 32px;
        height: 48px;

        &.is-active {
            color: #fff;
        }
    }
}
</style>
