<template>
    <el-dialog 
        :model-value="modelValue" 
        @update:model-value="$emit('update:modelValue', $event)"
        :title="$t('vtubers.voiceLibrary.title')" 
        width="850px" 
        append-to-body 
        custom-class="glass-dialog voice-picker-dialog"
    >
        <div class="space-y-6 p-2">
            <!-- Filters Header -->
            <div class="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div class="flex items-center gap-4">
                    <div class="flex-1 flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                        <search theme="outline" class="opacity-40" />
                        <el-input v-model="searchQuery" :placeholder="$t('vtubers.voiceLibrary.filterPlaceholder')" class="voice-search-input-inner" />
                    </div>
                    
                    <div class="flex items-center gap-2 px-1">
                        <span class="text-[8px] font-black opacity-30 uppercase tracking-widest mr-2">{{ $t('vtubers.voiceLibrary.provider') }}</span>
                        <el-radio-group :model-value="provider" @update:model-value="$emit('update:provider', $event)" size="small" class="soul-radio-group">
                            <el-radio-button value="gemini">GEMINI</el-radio-button>
                            <el-radio-button value="google">GOOGLE</el-radio-button>
                        </el-radio-group>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                            <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">{{ $t('vtubers.voiceLibrary.gender') }}</span>
                            <div class="flex gap-1">
                                <div v-for="g in ['all', 'female', 'male', 'neutral']" :key="g"
                                     @click="genderFilter = g"
                                     class="trait-tag !py-1 !px-3 !text-[8px]" :class="{'active': genderFilter === g}">
                                    {{ $t(`vtubers.voiceLibrary.genders.${g}`).toUpperCase() }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="provider === 'google'" class="flex items-center gap-2">
                         <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">{{ $t('vtubers.voiceLibrary.language') }}</span>
                         <el-select :model-value="language" @update:model-value="$emit('update:language', $event)" size="small" class="glass-select-mini w-40" filterable>
                              <el-option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.value" :label="lang.label" :value="lang.value" />
                         </el-select>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="voice-grid flex items-center justify-center h-64">
                <el-icon class="is-loading text-blue-500 text-3xl"><loading-icon /></el-icon>
            </div>

            <!-- Voices Grid -->
            <div v-else class="voice-grid custom-scrollbar h-[400px] overflow-y-auto">
                <StudioVoiceCard 
                    v-for="v in filteredVoices" 
                    :key="v.id"
                    :name="v.name"
                    :gender="v.gender"
                    :active="voiceId === v.id"
                    :playing="playingVoiceId === v.id"
                    :loading="previewGenerating === v.id"
                    @click="handleSelect(v.id)"
                    @preview="handlePreview(v)"
                />
            </div>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useVTuberStore } from '@/stores/vtuber';
import { Search, Loading as LoadingIcon } from '@icon-park/vue-next';

const { t } = useI18n();
import { SUPPORTED_LANGUAGES } from '@/constants/google_voices';
import StudioVoiceCard from '../studio/shared/StudioVoiceCard.vue';
import { getFileUrl } from '@/utils/api';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';

const props = defineProps<{
    modelValue: boolean;
    provider: string;
    voiceId: string;
    language: string;
}>();

const emit = defineEmits(['update:modelValue', 'update:provider', 'update:voiceId', 'update:language', 'select']);

const vtuberStore = useVTuberStore();
const { attachToAudioElement } = useAudioVisualizer();

const loading = ref(false);
const voicesList = ref<any[]>([]);
const searchQuery = ref('');
const genderFilter = ref('all');
const playingVoiceId = ref<string | null>(null);
let audioPlayer: HTMLAudioElement | null = null;

const fetchVoices = async () => {
    loading.value = true;
    try {
        const data = await vtuberStore.fetchVoices(props.provider || 'gemini');
        if (data && Array.isArray(data)) {
            voicesList.value = data;
        }
    } catch (e) {
        console.warn('[VoiceLibrary] Failed to fetch dynamic voices.');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchVoices();
});

watch(() => props.provider, () => {
    fetchVoices();
    emit('update:voiceId', '');
});

watch(() => props.language, () => {
    if (props.provider === 'google') {
        emit('update:voiceId', '');
    }
});

const filteredVoices = computed(() => {
    let filtered = voicesList.value;

    // Filter by Language for Google
    if (props.provider === 'google' && props.language) {
        filtered = filtered.filter((v: any) => {
            if (v.languageCodes) return v.languageCodes.includes(props.language);
            return v.language === props.language || v.language?.startsWith(props.language.split('-')[0]);
        });
    }

    // Filter by Gender
    if (genderFilter.value !== 'all') {
        filtered = filtered.filter((v: any) => {
            const g = (v.gender || v.ssmlGender || '').toLowerCase();
            return g === genderFilter.value.toLowerCase();
        });
    }

    // Filter by Search Query
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter((v: any) => 
            (v.name || '').toLowerCase().includes(q) || 
            (v.id || '').toLowerCase().includes(q)
        );
    }

    return filtered.map((v: any) => ({ 
        id: v.id || v.name, 
        name: v.name || `${v.id} (${v.gender || v.ssmlGender})`,
        gender: v.gender || v.ssmlGender || 'Neutral',
        audioSampleUrl: v.audioSampleUrl
    }));
});

const handleSelect = (id: string) => {
    const voice = voicesList.value.find(v => (v.id || v.name) === id);
    emit('update:voiceId', id);
    emit('select', voice);
    emit('update:modelValue', false);
};

const previewGenerating = ref<string | null>(null);

const handlePreview = async (voice: any) => {
    if (playingVoiceId.value === voice.id) {
        audioPlayer?.pause();
        playingVoiceId.value = null;
        return;
    }

    if (audioPlayer) {
        audioPlayer.pause();
        playingVoiceId.value = null;
    }

    let srcUrl = voice.audioSampleUrl ? getFileUrl(voice.audioSampleUrl) : null;

    // If no sample URL, generate TTS on-the-fly
    if (!srcUrl) {
        previewGenerating.value = voice.id;
        try {
            const previewText = t('vtubers.voiceLibrary.tts.preview');
            const data = await vtuberStore.generateVoicePreview({
                text: previewText,
                provider: props.provider || 'gemini',
                voiceId: voice.id,
                language: props.language || 'en-US'
            });
            // The store returns the full response body { success, data: { audioUrl } }
            if (data?.data?.audioUrl) {
                srcUrl = data.data.audioUrl.startsWith('data:') 
                    ? data.data.audioUrl 
                    : getFileUrl(data.data.audioUrl);
            } else if (data?.audioUrl) {
                srcUrl = getFileUrl(data.audioUrl);
            } else {
                console.warn('[VoiceLibrary] No audio URL returned for preview');
                return;
            }
        } catch (e) {
            console.error('[VoiceLibrary] Failed to generate TTS preview:', e);
            return;
        } finally {
            previewGenerating.value = null;
        }
    }

    if (!audioPlayer) {
        audioPlayer = new Audio();
        audioPlayer.crossOrigin = 'anonymous';
        attachToAudioElement(audioPlayer);
        audioPlayer.onended = () => {
            playingVoiceId.value = null;
        };
    }

    audioPlayer.src = srcUrl;
    audioPlayer.play();
    playingVoiceId.value = voice.id;
};

</script>

<style scoped>
.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    padding-right: 4px;
}

.voice-search-input-inner :deep(.el-input__wrapper) {
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
}

.voice-search-input-inner :deep(.el-input__inner) {
    color: white !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
}

.glass-select-mini :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    border-radius: 8px !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
}
</style>
