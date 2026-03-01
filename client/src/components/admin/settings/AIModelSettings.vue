<template>
    <div class="ai-model-settings space-y-8 animate-in">
        <!-- Providers Registry -->
        <div class="settings-section cinematic-panel p-6">
            <div class="panel-header flex justify-between items-center mb-6">
                <span class="text-xs font-black uppercase tracking-widest opacity-60">
                    {{ $t('admin.settings.ai.providerRegistry') }}
                </span>
                <div class="flex gap-2">
                    <el-button v-if="geminiApiKeys" plain bg round size="small" type="primary" @click="showGeminiPool = true">
                        {{ $t('admin.settings.ai.geminiPoolManager') }}
                    </el-button>
                    <el-dropdown @command="handleProviderCommand">
                        <el-button plain bg round size="small">
                            {{ $t('admin.settings.ai.addIntelligenceCore') }}
                        </el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item v-for="p in knownProviders" :key="p.id" :command="p"
                                    :disabled="providers.some(pr => pr.id === p.id)">{{ p.name }}</el-dropdown-item>
                                <el-dropdown-item command="custom">{{ $t('admin.settings.ai.customProvider') }}</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
            <div class="cinematic-table-container">
                <div
                    class="cinematic-table-header grid grid-cols-12 gap-4 p-4 border-b border-white/5 opacity-30 text-[8px] font-black uppercase">
                    <div class="col-span-2">{{ $t('admin.settings.table.identity') }}</div>
                    <div class="col-span-4">{{ $t('admin.settings.table.security') }}</div>
                    <div class="col-span-3">{{ $t('admin.settings.table.capabilities') }}</div>
                    <div class="col-span-1 text-center">{{ $t('admin.settings.table.status') }}</div>
                    <div class="col-span-2 text-right">{{ $t('admin.settings.table.actions') }}</div>
                </div>
                <div class="cinematic-table-body">
                    <div v-for="(provider, idx) in providers" :key="idx"
                        class="cinematic-row grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/2 transition-all">
                        <div class="col-span-2">
                            <el-input v-model="provider.name" size="small" class="glass-input mb-1"
                                :placeholder="t('admin.common.label')" />
                            <p class="text-[8px] font-mono opacity-30 px-2 uppercase">{{ provider.id }}</p>
                        </div>
                        <div class="col-span-4 space-y-2">
                            <el-input v-model="provider.apiKey" type="password" show-password size="small"
                                class="glass-input" :placeholder="t('admin.settings.table.apiKey')" />
                            <el-input v-model="provider.baseUrl" size="small" class="glass-input"
                                :placeholder="t('admin.settings.table.baseUrl')" />
                        </div>
                        <div class="col-span-3">
                            <el-select v-model="provider.supportedTypes" multiple collapse-tags size="small"
                                class="glass-input w-full" :placeholder="t('admin.settings.table.protocols')">
                                <el-option :label="t('admin.settings.ai.config.models')" value="text" />
                                <el-option :label="t('admin.settings.ai.capabilities.image')" value="image" />
                                <el-option :label="t('admin.settings.ai.capabilities.video')" value="video" />
                                <el-option :label="t('admin.settings.ai.capabilities.audio')" value="audio" />
                                <el-option :label="t('admin.settings.ai.capabilities.music')" value="music" />
                            </el-select>
                        </div>
                        <div class="col-span-1 flex justify-center">
                            <el-switch v-model="provider.isActive" size="small" />
                        </div>
                        <div class="col-span-2 flex justify-end gap-2">
                            <button class="icon-btn" @click="$emit('configure-provider', provider)">
                                <setting-two theme="outline" size="14" />
                            </button>
                            <button class="icon-btn text-red-500" @click="$emit('remove-provider', idx)">
                                <delete theme="outline" size="14" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Gemini Pool Management Dialog -->
        <el-dialog v-model="showGeminiPool" :title="t('admin.settings.ai.geminiPoolManager')" width="800px" class="cinematic-dialog">
            <div class="space-y-6">
                <!-- Bulk Add -->
                <div class="bulk-add-section p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h5 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3">{{ $t('admin.settings.ai.bulkAddKeys') }}</h5>
                    <div class="flex gap-3">
                        <el-input v-model="bulkKeys" type="textarea" :rows="2" :placeholder="t('admin.settings.ai.pasteKeys')" class="glass-input" />
                        <el-button type="primary" class="h-auto" @click="handleBulkAdd">{{ $t('admin.common.import') }}</el-button>
                    </div>
                </div>

                <!-- Key List -->
                <div class="key-list space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    <div v-for="(k, idx) in geminiApiKeys" :key="idx" 
                        class="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all">
                        <div class="flex items-center gap-4 flex-1">
                            <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                <key theme="outline" size="16" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <el-input v-model="k.label" size="small" class="label-input" :placeholder="t('admin.common.label')" />
                                    <el-tag v-if="k.usageCount > 0" size="small" effect="plain" round class="usage-tag">
                                        {{ k.usageCount }} {{ $t('admin.common.calls') }}
                                    </el-tag>
                                </div>
                                <code class="text-[10px] font-mono opacity-40 block truncate">{{ k.key }}</code>
                            </div>
                        </div>
                        
                        <!-- Quota Info -->
                        <div class="quota-info px-4 flex gap-6 text-[10px] shrink-0">
                            <div v-for="(q, model) in k.quotas" :key="model" class="text-center">
                                <p class="opacity-30 uppercase font-black tracking-tighter">{{ model }}</p>
                                <p :class="q.used >= q.limit ? 'text-red-400' : 'text-green-400'">{{ q.used }}/{{ q.limit }}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <el-switch v-model="k.isActive" size="small" />
                            <button class="icon-btn text-red-500" @click="removeKey(idx)">
                                <delete theme="outline" size="14" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </el-dialog>

        <!-- AI Account Manager OAuth -->
        <!-- Move to System config -->
        <!-- <div class="settings-section cinematic-panel p-6">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <user theme="outline" size="20" />
                </div>
                <div>
                    <h4 class="text-xs font-black uppercase tracking-widest">AI Account Manager (OAuth)</h4>
                    <p class="text-[9px] opacity-40">Orchestrate cross-account quotas and identity stability.</p>
                </div>
            </div>
            <el-form label-position="top">
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="Google Client ID">
                            <el-input v-model="aiOAuth.google.clientId" placeholder="...apps.googleusercontent.com"
                                class="glass-input" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="Google Client Secret">
                            <el-input v-model="aiOAuth.google.clientSecret" type="password" show-password
                                class="glass-input" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="20">
                    <el-col :span="24">
                        <div class="p-3 bg-black/40 rounded-2xl border border-white/5 mt-6">
                            <p class="text-[8px] font-black uppercase opacity-30 mb-1">Redirect URI Handshake</p>
                            <code class="text-[10px] text-blue-400 font-mono">{{ suggestedRedirectUri }}</code>
                        </div>
                    </el-col>
                </el-row>
            </el-form>
        </div> -->

        <!-- Neural Session Sync -->
        <!-- <div class="settings-section cinematic-panel p-6">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <refresh theme="outline" size="20" />
                </div>
                <div>
                    <h4 class="text-xs font-black uppercase tracking-widest">Neural Session Sync</h4>
                    <p class="text-[9px] opacity-40">Session cookies for AI Studio, Gemini, and Labs Flow.</p>
                </div>
            </div>
            <el-form label-position="top">
                <el-form-item label="AIStudio / Gemini Cookies (JSON/Raw)">
                    <el-input v-model="localGoogleCookies" type="textarea" :rows="3"
                        placeholder='Paste Google AI Studio / Gemini session cookies...' class="glass-input code-font"
                        @change="saveCookies" />
                </el-form-item>
                <el-form-item label="Labs Flow Cookies (JSON/Raw)" class="mt-4">
                    <el-input v-model="localFlowCookies" type="textarea" :rows="3"
                        placeholder='Paste Labs Flow session cookies...' class="glass-input code-font"
                        @change="saveCookies" />
                </el-form-item>
                <div class="flex gap-3">
                    <el-button type="success" plain bg round @click="$emit('sync-google')">Save Cookies</el-button>
                </div>
            </el-form>
        </div> -->
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SettingTwo, Delete, User, Refresh, Key } from '@icon-park/vue-next';

const { t } = useI18n();

const props = defineProps<{
    providers: any[];
    geminiApiKeys?: any[];
    aiOAuth: any;
    googleCookies?: string;
    flowCookies?: string;
    suggestedRedirectUri: string;
    knownProviders: any[];
}>();

const emit = defineEmits([
    'add-provider', 'remove-provider', 'configure-provider',
    'save-cookies', 'sync-google',
    'add-gemini-key', 'remove-gemini-key', 'bulk-add-gemini-keys'
]);

const showGeminiPool = ref(false);
const bulkKeys = ref('');

const localGoogleCookies = ref(props.googleCookies || '');
const localFlowCookies = ref(props.flowCookies || '');

watch(() => props.googleCookies, (val) => localGoogleCookies.value = val || '');
watch(() => props.flowCookies, (val) => localFlowCookies.value = val || '');

const handleProviderCommand = (command: any) => {
    if (command === 'custom') emit('add-provider', null);
    else emit('add-provider', command);
};

const saveCookies = () => {
    emit('save-cookies', {
        googleCookies: localGoogleCookies.value,
        flowCookies: localFlowCookies.value
    });
};

const handleBulkAdd = () => {
    if (!bulkKeys.value.trim()) return;
    emit('bulk-add-gemini-keys', bulkKeys.value);
    bulkKeys.value = '';
};

const removeKey = (idx: number) => {
    emit('remove-gemini-key', idx);
};
</script>

<style scoped lang="scss">
.cinematic-panel {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    cursor: pointer;
    transition: 0.2s;
    @include flex-center;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.label-input {
    :deep(.el-input__wrapper) {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0;
        height: 20px;
        input {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    }
}

.usage-tag {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.4) !important;
    font-size: 8px !important;
    height: 16px;
    padding: 0 6px;
}
</style>
