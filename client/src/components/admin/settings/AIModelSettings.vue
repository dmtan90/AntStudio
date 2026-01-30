<template>
    <div class="ai-model-settings space-y-8 animate-in">
        <!-- Providers Registry -->
        <div class="settings-section cinematic-panel p-6">
            <div class="panel-header flex justify-between items-center mb-6">
                <span class="text-xs font-black uppercase tracking-widest opacity-60">Neural Provider Registry</span>
                <el-dropdown @command="handleProviderCommand">
                    <el-button plain bg round size="small">Add Intelligence Core</el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item v-for="p in knownProviders" :key="p.id" :command="p"
                                :disabled="providers.some(pr => pr.id === p.id)">{{ p.name }}</el-dropdown-item>
                            <el-dropdown-item command="custom">Custom Provider</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
            <div class="cinematic-table-container">
                <div
                    class="cinematic-table-header grid grid-cols-12 gap-4 p-4 border-b border-white/5 opacity-30 text-[8px] font-black uppercase">
                    <div class="col-span-2">Identity</div>
                    <div class="col-span-4">Security / Endpoint</div>
                    <div class="col-span-3">Capabilities</div>
                    <div class="col-span-1 text-center">Status</div>
                    <div class="col-span-2 text-right">Actions</div>
                </div>
                <div class="cinematic-table-body">
                    <div v-for="(provider, idx) in providers" :key="idx"
                        class="cinematic-row grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/2 transition-all">
                        <div class="col-span-2">
                            <el-input v-model="provider.name" size="small" class="glass-input mb-1"
                                placeholder="Name" />
                            <p class="text-[8px] font-mono opacity-30 px-2 uppercase">{{ provider.id }}</p>
                        </div>
                        <div class="col-span-4 space-y-2">
                            <el-input v-model="provider.apiKey" type="password" show-password size="small"
                                class="glass-input" placeholder="API Key" />
                            <el-input v-model="provider.baseUrl" size="small" class="glass-input"
                                placeholder="Base URL (Optional)" />
                        </div>
                        <div class="col-span-3">
                            <el-select v-model="provider.supportedTypes" multiple collapse-tags size="small"
                                class="glass-input w-full" placeholder="Protocols">
                                <el-option label="Text/LLM" value="text" />
                                <el-option label="Image" value="image" />
                                <el-option label="Video" value="video" />
                                <el-option label="Audio/TTS" value="audio" />
                                <el-option label="Music" value="music" />
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
        <div class="settings-section cinematic-panel p-6">
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
                    <!-- <el-button plain bg round @click="saveCookies">Save Session Cookies</el-button> -->
                    <el-button type="success" plain bg round @click="$emit('sync-google')">Save Cookies</el-button>
                </div>
            </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { SettingTwo, Delete, User, Refresh } from '@icon-park/vue-next';

const props = defineProps<{
    providers: any[];
    aiOAuth: any;
    googleCookies?: string;
    flowCookies?: string;
    suggestedRedirectUri: string;
    knownProviders: any[];
}>();

const emit = defineEmits([
    'add-provider', 'remove-provider', 'configure-provider',
    'save-cookies', 'sync-google'
]);

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
</style>
