<template>
    <div class="admin-settings min-h-screen bg-[#0a0a0c] text-white font-outfit p-8 animate-in fade-in duration-700">
        <header class="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 relative z-10">
            <div>
                <h1 class="text-5xl font-black tracking-tighter mb-2 relative inline-block">
                    {{ t('admin.settings.title') }}
                    <div class="absolute -bottom-2 left-0 w-1/3 h-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                </h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mt-4 pl-1">{{ t('admin.settings.subtitle') }}</p>
            </div>
            <div class="flex gap-4">
                <button @click="fetchSettings" :disabled="loading" 
                    class="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 group disabled:opacity-50">
                    <refresh theme="outline" size="14" :class="{ 'animate-spin': loading }" />
                    {{ t('admin.settings.sync') }}
                </button>
                <button @click="saveSettings" :disabled="saving"
                    class="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50">
                    <save theme="outline" size="14" v-if="!saving" />
                    <loading-one theme="outline" size="14" class="animate-spin" v-else />
                    {{ saving ? t('admin.settings.committing') : t('admin.settings.save') }}
                </button>
            </div>
        </header>

        <div class="settings-container relative z-10">
            <el-tabs v-model="activeTab" class="settings-tabs custom-tabs"
                v-if="settings && settings.license && settings.whitelabel && settings.apiConfigs && settings.aiSettings && settings.plans && settings.creditPackages">
                
                <!-- License & Identity -->
                <el-tab-pane name="license">
                    <template #label>
                        <div class="tab-label">
                            <id-card theme="filled" size="14" /> {{ t('admin.settings.tabs.license') }}
                        </div>
                    </template>
                    <div class="space-y-8 animate-in slide-up">
                        <LicenseSettings :license="settings.license" />
                        <WhitelabelSettings :whitelabel="settings.whitelabel" />
                    </div>
                </el-tab-pane>

                <!-- System Infrastructure -->
                <el-tab-pane name="system">
                    <template #label>
                        <div class="tab-label">
                            <server theme="filled" size="14" /> {{ t('admin.settings.tabs.system') }}
                        </div>
                    </template>
                    <div class="animate-in slide-up">
                        <SystemConfigSettings :api-configs="settings.apiConfigs"
                            :oauth-providers="settings.apiConfigs?.oauth" />
                    </div>
                </el-tab-pane>

                <!-- Media Content APIs -->
                <el-tab-pane name="media">
                    <template #label>
                        <div class="tab-label">
                            <play-one theme="filled" size="14" /> {{ t('admin.settings.tabs.media') }}
                        </div>
                    </template>
                    <div class="animate-in slide-up">
                        <MediaApiSettings :api-configs="settings.apiConfigs" />
                    </div>
                </el-tab-pane>

                <!-- Artificial Intelligence -->
                <el-tab-pane name="ai">
                    <template #label>
                        <div class="tab-label">
                            <brain theme="filled" size="14" /> {{ t('admin.settings.tabs.ai') }}
                        </div>
                    </template>
                    <div class="space-y-8 animate-in slide-up">
                        <AIModelSettings :providers="settings.aiSettings.providers"
                            :gemini-api-keys="settings.geminiApiKeys"
                            :ai-o-auth="settings.apiConfigs.oauth"
                            :google-cookies="settings.aiSettings.sessionSync?.googleCookies || ''"
                            :flow-cookies="settings.aiSettings.sessionSync?.flowCookies || ''"
                            :suggested-redirect-uri="suggestedRedirectUri" :known-providers="KNOWN_PROVIDERS"
                            @add-provider="addProvider" @remove-provider="removeProvider" @save-cookies="saveSessionCookies"
                            @sync-google="syncGoogleAI"
                            @remove-gemini-key="removeGeminiKey"
                            @bulk-add-gemini-keys="bulkAddGeminiKeys"
                            @configure-provider="openConfig" />

                        <TaskDefaultsSettings :ai-settings="settings.aiSettings"
                            :get-providers-for-type="getProvidersForType" :get-models-for-provider="getModelsForProvider" />
                    </div>
                </el-tab-pane>

                <!-- Subscriptions & Economy -->
                <el-tab-pane name="billing">
                    <template #label>
                        <div class="tab-label">
                            <shopping-bag theme="filled" size="14" /> {{ t('admin.settings.tabs.billing') }}
                        </div>
                    </template>
                    <div class="animate-in slide-up">
                        <SubscriptionSettings :plans="settings.plans" :credit-packages="settings.creditPackages"
                            @add-package="addPackage" @remove-package="removePackage" />
                    </div>
                </el-tab-pane>
            </el-tabs>

            <div v-else class="flex flex-col items-center justify-center py-32 opacity-50">
                <loading-four theme="outline" size="40" class="animate-spin mb-4 text-blue-500" />
                <p class="text-xs font-black uppercase tracking-widest text-gray-500">{{ t('admin.settings.loading') }}</p>
            </div>
        </div>

        <AIProviderTaskConfigDialog v-model="showConfigDialog" :provider="selectedProvider"
            @save="saveTaskConfig" />

        <!-- Ambient Glow -->
        <div class="fixed bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';
import { 
    Refresh, Save, LoadingOne, IdCard, Server, 
    PlayOne, Brain, ShoppingBag, LoadingFour 
} from '@icon-park/vue-next';

// Components
import LicenseSettings from '@/components/admin/settings/LicenseSettings.vue';
import WhitelabelSettings from '@/components/admin/settings/WhitelabelSettings.vue';
import SystemConfigSettings from '@/components/admin/settings/SystemConfigSettings.vue';
import MediaApiSettings from '@/components/admin/settings/MediaApiSettings.vue';
import AIModelSettings from '@/components/admin/settings/AIModelSettings.vue';
import TaskDefaultsSettings from '@/components/admin/settings/TaskDefaultsSettings.vue';
import SubscriptionSettings from '@/components/admin/settings/SubscriptionSettings.vue';
import AIProviderTaskConfigDialog from '@/components/admin/settings/AIProviderTaskConfigDialog.vue';

const { t } = useI18n()
const adminStore = useAdminStore();
const activeTab = ref('license');
const loading = ref(false);
const saving = ref(false);

const settings = computed(() => adminStore.settings);

const showConfigDialog = ref(false);
const selectedProvider = ref<any>(null);

const suggestedRedirectUri = computed(() => {
    return `${window.location.origin}/platforms/callback/google`;
});

const KNOWN_PROVIDERS = [
    // { id: 'gemini_chat', name: 'Gemini Chat (Native)', supportedTypes: ['text'] },
    { id: 'aistudio', name: 'Gemini', supportedTypes: ['text', 'image', 'video', 'audio'] },
    { id: 'google_gemini', name: 'Google Cloud (Vertex AI)', supportedTypes: ['text', 'image', 'video', 'audio'] },
    // { id: 'geminigen_ai', name: 'GeminiGen AI', supportedTypes: ['image', 'video'] },
    // { id: 'labs_flow', name: 'Labs Flow (Native)', supportedTypes: ['image', 'video'] },
    // { id: '11labs_direct', name: '11Labs Direct', supportedTypes: ['image', 'video', 'audio'] },
    // { id: 'openai_gpt', name: 'OpenAI (GPT-4 / DALL-E)', supportedTypes: ['text', 'image'] },
    // { id: 'anthropic', name: 'Anthropic (Claude)', supportedTypes: ['text'] },
    // { id: 'stability_ai', name: 'Stability AI', supportedTypes: ['image', 'video'] },
    // { id: 'eleven_labs', name: 'Eleven Labs', supportedTypes: ['audio'] },
    // { id: 'suno', name: 'Suno', supportedTypes: ['music'] }
];

// Methods
const fetchSettings = async () => {
    loading.value = true;
    try {
        if (activeTab.value === 'license') {
            await adminStore.syncLicense();
        } else {
            await adminStore.fetchSettings();
        }
        toast.success(t("admin.settings.toasts.syncSuccess"));
    } catch (e) {
        toast.error(t("admin.settings.toasts.syncFailed"));
    } finally {
        loading.value = false;
    }
};

const saveSettings = async () => {
    saving.value = true;
    try {
        await adminStore.updateSettings(settings.value);
        toast.success(t("admin.settings.toasts.saveSuccess"));
    } catch (e) {
        toast.error(t("admin.settings.toasts.saveFailed"));
    } finally {
        saving.value = false;
    }
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

const openConfig = (provider: any) => {
    if (!provider.taskConfigs) {
        provider.taskConfigs = {};
    }
    selectedProvider.value = provider;
    showConfigDialog.value = true;
};

const saveTaskConfig = ({ type, config }: { type: string, config: any }) => {
    if (!selectedProvider.value.taskConfigs) {
        selectedProvider.value.taskConfigs = {};
    }
    selectedProvider.value.taskConfigs[type] = config;
    toast.success(t('admin.settings.toasts.stagedProtocol', { type, name: selectedProvider.value.name }));
};

const removeGeminiKey = (idx: number) => {
    if (!settings.value.geminiApiKeys) return;
    settings.value.geminiApiKeys.splice(idx, 1);
    toast.success(t('admin.settings.toasts.keyRemoved'));
};

const bulkAddGeminiKeys = (rawKeys: string) => {
    if (!settings.value.geminiApiKeys) settings.value.geminiApiKeys = [];
    
    const keys = rawKeys.split(/[,|\s\n]+/).map(k => k.trim()).filter(k => k && k.length > 10);
    let addedCount = 0;

    keys.forEach(key => {
        const exists = settings.value.geminiApiKeys.some((k: any) => k.key === key);
        if (!exists) {
            settings.value.geminiApiKeys.push({
                key,
                label: `Key ${settings.value.geminiApiKeys.length + 1}`,
                isActive: true,
                usageCount: 0,
                quotas: new Map()
            });
            addedCount++;
        }
    });

    if (addedCount > 0) {
        toast.success(t('admin.settings.toasts.keysRegistered', { count: addedCount }));
    } else {
        toast.info(t('admin.settings.toasts.noUniqueKeys'));
    }
};

const saveSessionCookies = async (cookies: { googleCookies: string, flowCookies: string }) => {
    if (!settings.value.aiSettings.sessionSync) {
        settings.value.aiSettings.sessionSync = { googleCookies: '', flowCookies: '' };
    }
    settings.value.aiSettings.sessionSync.googleCookies = cookies.googleCookies;
    settings.value.aiSettings.sessionSync.flowCookies = cookies.flowCookies;
    toast.success(t('admin.settings.toasts.cookiesStaged'));
};

const syncGoogleAI = async () => {
    try {
        toast.info(t('admin.settings.toasts.validatingCookies'));

        if (!settings.value.aiSettings.sessionSync?.googleCookies && !settings.value.aiSettings.sessionSync?.flowCookies) {
            toast.error(t('admin.settings.toasts.noCookies'));
            return;
        }

        const validateCookies = (cookieStr: string) => {
            if (!cookieStr) return true;
            try {
                JSON.parse(cookieStr);
                return true;
            } catch {
                return cookieStr.includes('=') && cookieStr.length > 10;
            }
        };

        const googleValid = validateCookies(settings.value.aiSettings.sessionSync?.googleCookies || '');
        const flowValid = validateCookies(settings.value.aiSettings.sessionSync?.flowCookies || '');

        if (!googleValid || !flowValid) {
            toast.error(t('admin.settings.toasts.invalidCookies'));
            return;
        }

        await adminStore.updateSettings(settings.value);
        toast.success(t('admin.settings.toasts.syncCookiesSuccess'));
    } catch (error: any) {
        console.error('Sync error:', error);
        toast.error(t('admin.settings.toasts.syncCookiesFailed', { error: error.message }));
    }
};

const getProvidersForType = (type: string) => {
    return settings.value.aiSettings.providers.filter((p: any) => p.supportedTypes.includes(type));
};

const getModelsForProvider = (providerId: string, type: string) => {
    const provider = settings.value.aiSettings.providers.find((p: any) => p.id === providerId);
    if (provider?.taskConfigs?.[type]?.models) {
        return provider.taskConfigs[type].models;
    }
    
    // Fallbacks for built-in providers if no taskConfigs defined
    if (providerId === 'google_gemini') return ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    if (providerId === 'openai_gpt') return ['gpt-4o', 'gpt-4-turbo', 'dall-e-3'];
    return [];
};

const addPackage = () => {
    settings.value.billing.creditPackages.push({ name: 'Pro AI Pack', credits: 5000, price: 49.00, isActive: true });
};

const removePackage = (idx: number) => {
    settings.value.billing.creditPackages.splice(idx, 1);
};

onMounted(fetchSettings);
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.slide-up {
   animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
   from { opacity: 0; transform: translateY(20px); }
   to { opacity: 1; transform: translateY(0); }
}

:deep(.custom-tabs) {
    .el-tabs__header {
        margin-bottom: 40px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: rgba(255, 255, 255, 0.4);
        padding: 16px 32px;
        height: auto;
        transition: all 0.3s;

        &:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        &.is-active {
            color: #fff;
            text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        
        .tab-label {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    }
}
</style>
