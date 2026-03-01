<template>
    <el-dialog v-model="visible" :title="t('admin.settings.ai.protocol', { type: provider?.name })" width="1000px" 
        class="cinematic-dialog ai-config-dialog" destroy-on-close @closed="$emit('update:modelValue', false)">
        
        <div class="flex gap-6 h-[600px]" v-if="provider">
            <!-- Sidebar Selection -->
            <div class="w-64 border-r border-white/5 pr-4 flex flex-col gap-2">
                <div v-for="type in supportedTypes" :key="type" 
                    @click="activeType = type"
                    :class="['type-item group', activeType === type ? 'active' : '']">
                    <div class="flex items-center gap-3">
                        <component :is="getTypeIcon(type)" theme="outline" size="16" />
                        <span class="text-[10px] font-black uppercase tracking-widest">{{ $t(`admin.settings.ai.capabilities.${type}`) }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div v-if="isConfigured(type)" class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <right theme="outline" size="12" class="opacity-0 group-hover:opacity-40 transition-all" />
                    </div>
                </div>

                <div class="mt-auto p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <h5 class="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-2">{{ t('admin.settings.ai.aiAssist') }}</h5>
                    <p class="text-[9px] opacity-40 leading-relaxed">{{ t('admin.settings.ai.aiAssistDesc') }}</p>
                </div>
            </div>

            <!-- Configuration Area -->
            <div class="flex-1 overflow-y-auto px-2">
                <div v-if="activeType" class="space-y-8 animate-in slide-up">
                    <header class="flex justify-between items-start">
                        <div>
                            <h3 class="text-xl font-black uppercase tracking-tighter">{{ $t('admin.settings.ai.protocol', { type: activeType }) }}</h3>
                            <p class="text-[10px] opacity-40">{{ $t('admin.settings.ai.protocolDesc', { type: activeType }) }}</p>
                        </div>
                        <el-button plain bg round shadow @click="showAIModal = true">
                            <magic theme="outline" size="14" class="mr-2" />
                            {{ $t('admin.settings.ai.aiAssist') }}
                        </el-button>
                    </header>

                    <div class="grid grid-cols-12 gap-6">
                        <!-- Endpoint & Method -->
                        <div class="col-span-12 space-y-4">
                            <div class="flex gap-4">
                                <div class="w-24">
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.method') }}</label>
                                    <el-select v-model="config.method" size="default" class="glass-input">
                                        <el-option label="POST" value="POST" />
                                        <el-option label="GET" value="GET" />
                                    </el-select>
                                </div>
                                <div class="flex-1">
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.endpoint') }}</label>
                                    <el-input v-model="config.endpoint" placeholder="https://api.provider.com/v1/..." class="glass-input" />
                                </div>
                            </div>
                        </div>

                        <!-- Headers -->
                        <div class="col-span-12">
                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.headers') }}</label>
                            <el-input v-model="headersJson" type="textarea" :rows="3" placeholder='{ "Authorization": "Bearer {{apiKey}}" }' class="glass-input code-font" />
                        </div>

                        <!-- Payload Template -->
                        <div class="col-span-12">
                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.payload') }}</label>
                            <el-input v-model="config.payloadTemplate" type="textarea" :rows="6" 
                                placeholder='{ "model": "{{model}}", "prompt": "{{prompt}}" }' class="glass-input code-font" />
                        </div>

                         <!-- Available Models -->
                         <div class="col-span-12">
                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.models') }}</label>
                            <div class="flex flex-wrap gap-2 p-3 bg-white/2 border border-white/5 rounded-2xl">
                                <el-tag v-for="(m, i) in config.models" :key="i" closable @close="config.models.splice(i, 1)"
                                    class="usage-tag">
                                    {{ m }}
                                </el-tag>
                                <el-input v-if="showNewModel" ref="newModelInput" v-model="newModelId" size="small" 
                                    class="w-32" @keyup.enter="addModel" @blur="addModel" />
                                <el-button v-else size="small" plain bg round @click="showModelInput">
                                    <plus theme="outline" size="12" />
                                </el-button>
                            </div>
                        </div>

                        <!-- Response Mapping -->
                        <div class="col-span-12">
                            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4 border-b border-white/5 pb-2">{{ $t('admin.settings.ai.config.responseMapping') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div v-if="activeType === 'text'">
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.contentPath') }}</label>
                                    <el-input v-model="config.responseMapping.text" placeholder="choices[0].message.content" class="glass-input" />
                                </div>
                                <div v-if="activeType !== 'text'">
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.mediaUrlPath') }}</label>
                                    <el-input v-model="config.responseMapping.url" placeholder="data[0].url" class="glass-input" />
                                </div>
                                <div v-if="['image', 'video', 'audio'].includes(activeType)">
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.base64Path') }}</label>
                                    <el-input v-model="config.responseMapping.b64" placeholder="data[0].b64_json" class="glass-input" />
                                </div>
                                <div>
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.jobIdPath') }}</label>
                                    <el-input v-model="config.responseMapping.jobId" placeholder="id or task_id" class="glass-input" />
                                </div>
                            </div>
                        </div>

                        <!-- Async Polling Config (only shown when jobId mapping is set) -->
                        <div class="col-span-12" v-if="hasJobId">
                            <div class="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-5">
                                <h4 class="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-2">
                                    <AlarmClock theme="outline" size="12" />
                                    {{ $t('admin.settings.ai.pollConfig') }}
                                </h4>
                                <p class="text-[9px] opacity-40 -mt-3">{{ $t('admin.settings.ai.poll.desc') }}</p>

                                <!-- Poll Endpoint -->
                                <div class="flex gap-4">
                                    <div class="w-24">
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.method') }}</label>
                                        <el-select v-model="config.pollConfig.method" size="default" class="glass-input">
                                            <el-option label="GET" value="GET" />
                                            <el-option label="POST" value="POST" />
                                        </el-select>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.endpoint') }}</label>
                                        <el-input v-model="config.pollConfig.endpoint" placeholder="https://api.provider.com/history/{[jobId]}" class="glass-input" />
                                    </div>
                                </div>

                                <!-- Timing -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.interval') }}</label>
                                        <el-input-number v-model="config.pollConfig.intervalMs" :min="500" :step="500" size="default" class="w-full" />
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.timeout') }}</label>
                                        <el-input-number v-model="config.pollConfig.timeoutMs" :min="5000" :step="5000" size="default" class="w-full" />
                                    </div>
                                </div>

                                <!-- Status Path -->
                                <div>
                                    <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.statusPath') }}</label>
                                    <el-input v-model="config.pollConfig.statusPath" placeholder="data.status or status" class="glass-input" />
                                </div>

                                <!-- Success / Failure Values -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.successValues') }}</label>
                                        <el-input v-model="pollSuccessValuesStr" placeholder="SUCCESS, completed, done" class="glass-input" />
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.poll.failureValues') }}</label>
                                        <el-input v-model="pollFailureValuesStr" placeholder="FAILED, error" class="glass-input" />
                                    </div>
                                </div>

                                <!-- Poll Response Mapping -->
                                <div>
                                    <h5 class="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 border-b border-white/5 pb-2">{{ $t('admin.settings.ai.poll.responseMapping') }}</h5>
                                    <div class="grid grid-cols-3 gap-3">
                                        <div v-if="activeType !== 'text'">
                                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.mediaUrlPath') }}</label>
                                            <el-input v-model="config.pollConfig.responseMapping.url" placeholder="data.output_url" class="glass-input" />
                                        </div>
                                        <div v-if="['image', 'audio'].includes(activeType)">
                                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.base64Path') }}</label>
                                            <el-input v-model="config.pollConfig.responseMapping.b64" placeholder="data.audio_base64" class="glass-input" />
                                        </div>
                                        <div v-if="activeType === 'text'">
                                            <label class="block text-[8px] font-black uppercase opacity-30 mb-2">{{ $t('admin.settings.ai.config.contentPath') }}</label>
                                            <el-input v-model="config.pollConfig.responseMapping.text" placeholder="data.text" class="glass-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
                <el-button @click="visible = false" plain round bg>{{ t('common.cancel') }}</el-button>
                <el-button type="primary" @click="handleSave" round shadow>{{ t('admin.settings.toasts.applyConfig') }}</el-button>
            </div>
        </template>

        <!-- AI Assistant Modal -->
        <el-dialog v-model="showAIModal" :title="t('admin.settings.ai.aiAssist')" width="500px" append-to-body class="cinematic-dialog sub-dialog">
            <div class="space-y-6">
                <div class="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 text-center">
                    <div class="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <magic theme="outline" size="32" />
                    </div>
                    <h4 class="text-lg font-black uppercase tracking-tighter mb-2">{{ t('admin.settings.ai.aiAssistTitle') }}</h4>
                    <p class="text-xs opacity-50 px-4">{{ t('admin.settings.ai.aiAssistDesc') }}</p>
                </div>

                <div class="space-y-4">
                    <label class="block text-[8px] font-black uppercase opacity-30">{{ t('admin.settings.ai.docUrl') }}</label>
                    <el-input v-model="docUrl" type="textarea" :rows="3" :placeholder="t('admin.settings.ai.docUrlPlaceholder')" class="glass-input" />
                </div>

                <div class="flex justify-end gap-2">
                    <el-button @click="showAIModal = false" plain round size="small">{{ t('admin.settings.toasts.abort') }}</el-button>
                    <el-button type="primary" :loading="generating" @click="generateFromAI" round size="small" shadow>
                        {{ t('admin.settings.toasts.generateProtocol') }}
                    </el-button>
                </div>
            </div>
        </el-dialog>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
    Text, Pic, Video, Voice, Music, Right, 
    Magic, SettingTwo, Plus, Delete, AlarmClock
} from '@icon-park/vue-next';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';

const props = defineProps<{
    modelValue: boolean;
    provider: any;
}>();

const { t } = useI18n();
const emit = defineEmits(['update:modelValue', 'save']);

const adminStore = useAdminStore();
const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const supportedTypes = computed(() => props.provider?.supportedTypes || []);
const activeType = ref('');

interface PollConfig {
    endpoint: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    intervalMs: number;
    timeoutMs: number;
    statusPath: string;
    successValues: string[];
    failureValues: string[];
    responseMapping: { url?: string; b64?: string; text?: string; };
}

interface TaskConfig {
    endpoint: string;
    method: 'POST' | 'GET';
    headers: Record<string, string>;
    payloadTemplate: string;
    models: string[];
    responseMapping: {
        text?: string;
        url?: string;
        b64?: string;
        jobId?: string;
    };
    pollConfig: PollConfig;
}

const defaultPollConfig = (): PollConfig => ({
    endpoint: '',
    method: 'GET',
    headers: {},
    intervalMs: 3000,
    timeoutMs: 120000,
    statusPath: '',
    successValues: ['SUCCESS', 'completed'],
    failureValues: ['FAILED', 'error'],
    responseMapping: {}
});

const config = ref<TaskConfig>({
    endpoint: '',
    method: 'POST',
    headers: {},
    payloadTemplate: '',
    models: [],
    responseMapping: {},
    pollConfig: defaultPollConfig()
});

// Poll config convenience string models
const pollSuccessValuesStr = computed({
    get: () => config.value.pollConfig.successValues.join(', '),
    set: (v: string) => { config.value.pollConfig.successValues = v.split(',').map(s => s.trim()).filter(Boolean); }
});
const pollFailureValuesStr = computed({
    get: () => config.value.pollConfig.failureValues.join(', '),
    set: (v: string) => { config.value.pollConfig.failureValues = v.split(',').map(s => s.trim()).filter(Boolean); }
});

const headersJson = ref('{}');

// Computed accessor to safely check jobId in template without TypeScript complaining
const hasJobId = computed(() => !!config.value.responseMapping.jobId);

// AI Modal State
const showAIModal = ref(false);
const docUrl = ref('');
const generating = ref(false);

// Model Input State
const showNewModel = ref(false);
const newModelId = ref('');
const newModelInput = ref<any>(null);

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'text': return Text;
        case 'image': return Pic;
        case 'video': return Video;
        case 'audio': return Voice;
        case 'music': return Music;
        default: return SettingTwo;
    }
};

const isConfigured = (type: string) => {
    const c = props.provider?.taskConfigs?.[type];
    return c && c.endpoint && c.payloadTemplate;
};

const loadTypeConfig = (type: string) => {
    const saved = props.provider?.taskConfigs?.[type] || {};
    config.value = {
        endpoint: saved.endpoint || '',
        method: saved.method || 'POST',
        headers: saved.headers || {},
        payloadTemplate: saved.payloadTemplate || '',
        models: saved.models ? [...saved.models] : [],
        responseMapping: { ...(saved.responseMapping || {}) },
        pollConfig: saved.pollConfig ? { ...defaultPollConfig(), ...saved.pollConfig, responseMapping: { ...(saved.pollConfig.responseMapping || {}) } } : defaultPollConfig()
    };
    headersJson.value = JSON.stringify(config.value.headers, null, 2);
};

watch(activeType, (newType) => {
    if (newType) loadTypeConfig(newType);
});

watch(visible, (val) => {
    if (val && supportedTypes.value.length > 0) {
        activeType.value = supportedTypes.value[0];
    }
});

const showModelInput = () => {
    showNewModel.value = true;
    nextTick(() => newModelInput.value?.focus());
};

const addModel = () => {
    if (newModelId.value.trim()) {
        if (!config.value.models.includes(newModelId.value.trim())) {
            config.value.models.push(newModelId.value.trim());
        }
        newModelId.value = '';
    }
    showNewModel.value = false;
};

const generateFromAI = async () => {
    if (!docUrl.value.trim()) return toast.error(t('admin.settings.toasts.docRequired'));
    generating.value = true;
    try {
        const data = await adminStore.generateTemplate(docUrl.value, activeType.value);
        if (data) {
            config.value.endpoint = data.endpoint || '';
            config.value.method = data.method || 'POST';
            config.value.headers = data.headers || {};
            config.value.payloadTemplate = data.payloadTemplate || '';
            config.value.models = data.models || [];
            config.value.responseMapping = data.responseMapping || {};

            // Apply generated pollConfig if present
            if (data.pollConfig && data.pollConfig.endpoint) {
                config.value.pollConfig = { ...defaultPollConfig(), ...data.pollConfig, responseMapping: { ...(data.pollConfig.responseMapping || {}) } };
            }
            
            headersJson.value = JSON.stringify(config.value.headers, null, 2);
            toast.success(t('admin.settings.toasts.aiTemplateSuccess'));
            showAIModal.value = false;
        }
    } catch (e) {
        toast.error(t('admin.settings.toasts.aiTemplateFailed'));
    } finally {
        generating.value = false;
    }
};

const handleSave = () => {
    try {
        config.value.headers = JSON.parse(headersJson.value);
        emit('save', {
            type: activeType.value,
            config: { ...config.value }
        });
        toast.success(t('admin.settings.toasts.configStaged', { type: activeType.value }));
    } catch (e) {
        toast.error(t('admin.settings.toasts.invalidHeaders'));
    }
};
</script>

<style scoped lang="postcss">
.ai-config-dialog {
    :deep(.el-dialog__body) {
        padding: 10px 24px 20px;
    }
}

.type-item {
    @apply p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between;
    @apply border border-transparent;
    background: rgba(255, 255, 255, 0.02);

    &:hover {
        @apply bg-white/5;
    }

    &.active {
        @apply bg-blue-500/10 border-blue-500/20;
        span { @apply text-blue-400; }
        svg { @apply text-blue-400; }
    }
}

.usage-tag {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 9px !important;
    text-transform: uppercase;
    font-weight: 900;
}

.glass-input {
    :deep(.el-input__wrapper), :deep(.el-textarea__inner) {
        background: rgba(255, 255, 255, 0.03) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        font-family: 'Outfit', sans-serif;
        color: #fff;
        transition: 0.3s;

        &:hover, &:focus {
            border-color: rgba(59, 130, 246, 0.3) !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
    }

    &.code-font {
        :deep(.el-textarea__inner) {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11px;
            letter-spacing: -0.2px;
            color: #93c5fd;
        }
    }
}

.sub-dialog {
    :deep(.el-dialog) {
        background: #0f1115 !important;
        border: 1px solid rgba(59, 130, 246, 0.1) !important;
    }
}
</style>
