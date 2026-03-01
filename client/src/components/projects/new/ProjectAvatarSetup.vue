<template>
    <div class="avatar-setup animate-up">
        <div class="setup-container">
            <div class="steps-header">
                <div v-for="(step, idx) in steps" :key="idx" class="step-item"
                    :class="{ active: currentStep === idx + 1, completed: currentStep > idx + 1 }">
                    <div class="step-circle">{{ idx + 1 }}</div>
                    <span>{{ step }}</span>
                    <div v-if="idx < steps.length - 1" class="step-line"></div>
                </div>
            </div>

            <transition name="fade-slide" mode="out-in">
                <!-- Step 1: Select Avatar -->
                <div v-if="currentStep === 1" class="step-content">
                    <div class="header-section">
                        <h2>{{ t('projects.new.setup.avatar.selectVtuber') }}</h2>
                        <p>{{ t('projects.new.setup.avatar.selectVtuberDesc') }}</p>
                    </div>

                    <div class="avatar-grid">
                        <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 grid-flow-row auto-rows-fr gap-6">
                            <div v-for="av in allAvatars" :key="av.id" class="avatar-card"
                                :class="{ active: selectedAvatar === av.id }" @click="selectedAvatar = av.id"
                                @hover.native="av.play = true" @mouseleave.native="av.play = false">
                                <!-- <img :src="getFileUrl(av.img)" alt="Avatar" /> -->
                                <el-image class="h-full w-full" :src="getFileUrl(av.img)" fit="cover">
                                    <template #placeholder>
                                        <div class="image-slot">
                                            <i class="el-icon-loading"></i>
                                        </div>
                                    </template>
                                </el-image>
                                <div class="avatar-preview" v-if="av.play && av.preview">
                                    <video :src="getFileUrl(av.preview)" autoplay loop muted></video>
                                </div>
                                <div class="avatar-name">{{ av.name }}</div>
                            </div>

                            <!-- Upload Custom Card -->
                            <div class="avatar-card upload-card p-5 text-center" @click="handleUploadAvatarClick">
                                <div class="upload-placeholder">
                                    <Plus class="text-4xl" />
                                    <span>{{ t('projects.new.setup.avatar.uploadCustom') }}</span>
                                    <div class="mt-2 text-[10px] text-gray-400">
                                        {{ t('projects.new.setup.avatar.uploadSupport') }}
                                    </div>
                                </div>
                                <input type="file" ref="fileInput" class="hidden" accept="image/*"
                                    @change="onFileSelected" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Script & Voice -->
                <div v-else-if="currentStep === 2" class="step-content">
                    <div class="header-section">
                        <h2>{{ t('projects.new.setup.avatar.scriptVoice') }}</h2>
                        <p>{{ t('projects.new.setup.avatar.scriptVoiceDesc') }}</p>
                    </div>

                    <div class="form-cols">
                        <div class="col-left">
                            <label>{{ t('projects.new.setup.avatar.scriptLabel') }}</label>
                            <textarea v-model="script" class="glow-textarea"
                                :placeholder="t('projects.new.setup.avatar.scriptPlaceholder')"></textarea>
                        </div>
                        <div class="col-right">
                            <label>{{ t('projects.new.setup.avatar.voiceSelection') }}</label>

                            <div v-if="!showAdvanced" class="voice-presets-list animate-fade-in">
                                <div v-for="preset in voicePresets" :key="preset.id" class="voice-preset-card"
                                    :class="{ active: selectedVoice === preset.voiceId }" @click="selectPreset(preset)">
                                    <div class="preset-icon">
                                        <button class="btn-play-preview" @click.stop="playPreview(preset.preview_url)">
                                            <PlayOne theme="filled" />
                                        </button>
                                    </div>
                                    <div class="preset-info">
                                        <span class="name">{{ preset.name }}</span>
                                        <span class="desc">{{ preset.desc }}</span>
                                    </div>
                                    <div v-if="selectedVoice === preset.voiceId" class="preset-check">
                                        <Check />
                                    </div>
                                </div>
                            </div>

                            <!-- Advanced Mode (Toggle) -->
                            <div class="advanced-toggle-wrapper">
                                <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
                                    <span>{{ t('projects.new.setup.avatar.advancedSettings') }}</span>
                                    <Up v-if="showAdvanced" />
                                    <Down v-else />
                                </div>
                            </div>

                            <transition name="fade-slide">
                                <div v-if="showAdvanced" class="advanced-voice-container">
                                    <!-- Search and Filters -->
                                    <div class="voice-filters">
                                        <input v-model="voiceSearch" type="text" :placeholder="t('projects.new.setup.avatar.searchVoices')"
                                            class="search-input" />
                                        <div class="filter-row">
                                            <select v-model="filterLanguage" class="filter-select">
                                                <option value="">{{ t('projects.new.setup.avatar.allLanguages') }}</option>
                                                <option v-for="lang in availableLanguages" :key="lang" :value="lang">
                                                    {{ lang }}
                                                </option>
                                            </select>
                                            <select v-model="filterGender" class="filter-select">
                                                <option value="">{{ t('projects.new.setup.avatar.allGenders') }}</option>
                                                <option value="male">{{ t('projects.new.setup.avatar.male') }}</option>
                                                <option value="female">{{ t('projects.new.setup.avatar.female') }}</option>
                                                <option value="neutral">{{ t('projects.new.setup.avatar.neutral') }}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="voice-list">
                                        <div v-for="voice in filteredVoices" :key="voice.id" class="voice-item"
                                            :class="{ active: selectedVoice === voice.id }"
                                            @click="selectedVoice = voice.id">
                                            <div class="voice-icon">
                                                <span v-if="voice.provider === 'elevenlabs'">✨</span>
                                                <span v-else>☁️</span>
                                            </div>
                                            <div class="voice-info">
                                                <span class="name">{{ voice.name }}</span>
                                                <span class="desc">{{ voice.provider }} • {{ voice.gender }} • {{
                                                    voice.language
                                                }}</span>
                                            </div>
                                            <button v-if="voice.preview_url" class="btn-preview"
                                                @click.stop="playPreview(voice.preview_url)">
                                                <PlayOne theme="filled" />
                                            </button>
                                        </div>
                                    </div>

                                    <div class="advanced-settings-sliders animate-fade-in">
                                        <div class="setting-item">
                                            <label>{{ t('projects.new.setup.avatar.speed') }} ({{ voiceSpeed }}x)</label>
                                            <input type="range" v-model="voiceSpeed" min="0.5" max="2.0" step="0.1" />
                                        </div>
                                        <template v-if="isElevenLabsActive">
                                            <div class="setting-item">
                                                <label>{{ t('projects.new.setup.avatar.stability') }} ({{ voiceStability }})</label>
                                                <input type="range" v-model="voiceStability" min="0" max="1"
                                                    step="0.1" />
                                            </div>
                                            <div class="setting-item">
                                                <label>{{ t('projects.new.setup.avatar.similarity') }} ({{ voiceSimilarity }})</label>
                                                <input type="range" v-model="voiceSimilarity" min="0" max="1"
                                                    step="0.1" />
                                            </div>
                                        </template>
                                    </div>

                                    <!-- Personal Voice / Cloning -->
                                    <div class="personal-voice-section">
                                        <button class="btn-clone" @click="showCloneModal = true">
                                            <Mic />
                                            {{ t('projects.new.setup.avatar.trainVoice') }}
                                        </button>
                                    </div>
                                </div>
                            </transition>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Preview -->
                <div v-else-if="currentStep === 3" class="step-content">
                    <div class="header-section">
                        <h2>{{ t('projects.new.setup.avatar.videoPreview') }}</h2>
                        <p v-if="!generatedVideoUrl">{{ t('projects.new.setup.avatar.generatingVideo') }}</p>
                        <p v-else>{{ t('projects.new.setup.avatar.videoReady') }}</p>
                    </div>

                    <div class="preview-container">
                        <div v-if="!generatedVideoUrl" class="generating-state">
                            <div class="spinner-large"></div>
                            <div class="progress-info">
                                <p>{{ generationStatus }}</p>
                            </div>
                        </div>
                        <div v-else class="video-player-wrapper">
                            <video :src="getFileUrl(generatedVideoUrl)" controls class="main-video"></video>
                            <div class="actions">
                                <button class="btn-action" @click="handleDownload">
                                    <span>{{ t('projects.new.setup.avatar.download') }}</span>
                                </button>
                                <button class="btn-action primary" @click="handleUpload">
                                    <span>{{ t('projects.new.setup.avatar.saveLibrary') }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>

            <div class="setup-footer" v-if="currentStep < 3 || generatedVideoUrl">
                <button v-if="currentStep > 1 && currentStep < 3" class="btn-back" @click="currentStep--">{{ t('projects.new.back') }}</button>
                <button v-if="currentStep === 1" class="btn-cancel" @click="$router.push('/dashboard')">{{ t('common.cancel') }}</button>
                <button v-if="currentStep === 3" class="btn-cancel" @click="resetSetup">{{ t('projects.new.setup.avatar.createNew') }}</button>

                <button v-if="currentStep < 3" class="btn-next" :disabled="loading" @click="handleNext"
                    data-guide="generate-btn">
                    <span v-if="loading">{{ t('common.processing') }}</span>
                    <span v-else>{{ currentStep === 2 ? t('projects.new.create') : t('projects.new.next') }}</span>
                </button>
            </div>
        </div>

        <!-- Voice Cloning Modal -->
        <transition name="fade">
            <div v-if="showCloneModal" class="modal-overlay" @click.self="showCloneModal = false">
                <div class="modal-content animate-up">
                    <div class="modal-header">
                        <h3>{{ t('projects.new.setup.avatar.modal.title') }}</h3>
                        <button class="btn-close-modal" @click="showCloneModal = false">
                            <Close />
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="modal-desc">{{ t('projects.new.setup.avatar.modal.desc') }}</p>

                        <div class="form-group">
                            <label>{{ t('projects.new.setup.avatar.modal.voiceName') }}</label>
                            <input v-model="cloneName" type="text" :placeholder="t('projects.new.setup.avatar.modal.voiceNamePlaceholder')" class="modal-input" />
                        </div>

                        <div class="upload-zone" :class="{ dragover: isDragging }" @dragover.prevent="isDragging = true"
                            @dragleave.prevent="isDragging = false" @drop.prevent="onCloneDrop">
                            <UploadTwo />
                            <p v-html="t('projects.new.setup.avatar.modal.uploadZone')"></p>
                            <input type="file" multiple accept="audio/*" class="hidden-input"
                                @change="onCloneFilesSelected" />
                        </div>

                        <div v-if="cloneFiles.length > 0" class="file-list">
                            <div v-for="(file, idx) in cloneFiles" :key="idx" class="file-tag">
                                <span>{{ file.name }}</span>
                                <CloseOne theme="filled" @click="cloneFiles.splice(idx, 1)" />
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel-modal" @click="showCloneModal = false"
                            :disabled="cloning">{{ t('common.cancel') }}</button>
                        <button class="btn-start-clone" @click="handleCloneVoice"
                            :disabled="cloning || !cloneName || cloneFiles.length === 0">
                            <span v-if="cloning">{{ t('common.processing') }}</span>
                            <span v-else>{{ t('projects.new.setup.avatar.modal.startTraining') }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </transition>
        
        <!-- User Guide -->
        <UserGuide :steps="avatarSetupGuide" storage-key="avatar-setup-guide-completed" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { toast } from 'vue-sonner'
import { getFileUrl } from '@/utils/api'
import { useMediaStore } from '@/stores/media'
import { useVoiceStore } from '@/stores/voice'
import { useAIStore } from '@/stores/ai'
import { useI18n } from 'vue-i18n';
import {
    Plus, PlayOne, Check, Up, Down,
    Microphone as Mic, Close, UploadTwo, CloseOne
} from '@icon-park/vue-next'
import UserGuide from '@/components/common/UserGuide.vue'
import { avatarSetupGuide } from '@/config/userGuides'

const router = useRouter()
const projectStore = useProjectStore()
const mediaStore = useMediaStore()
const voiceStore = useVoiceStore()
const aiStore = useAIStore()
const { t } = useI18n()

const steps = computed(() => t('projects.new.setup.avatar.steps', { returnObjects: true } as any) as unknown as string[])
const currentStep = ref(1)
const loading = ref(false)
const selectedAvatar = ref(1)
const selectedVoice = ref('v1')
const script = ref('')

const generatedVideoUrl = ref('')
const generationStatus = ref(t('projects.new.setup.avatar.initializingEngine'))
const jobId = ref('')

const avatars = [
    { id: 1, name: 'Aditi', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor01.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor01_veo_3_1.webm', play: false },
    { id: 2, name: 'Amal', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor02.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor02_veo_3_1.webm', play: false },
    { id: 3, name: 'Caleb', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor03.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor03_veo_3_1.webm', play: false },
    { id: 4, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor04.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor04_veo_3_1.webm', play: false },
    { id: 5, name: 'Eric', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor05.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor05_veo_3_1.webm', play: false },
    { id: 6, name: 'Farah', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor06.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor06_veo_3_1.webm', play: false },
    { id: 7, name: 'Jada', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor07.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor07_veo_3_1.webm', play: false },
    { id: 8, name: 'James', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor08.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor08_veo_3_1.webm', play: false },
    { id: 9, name: 'Kim', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor09.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor09_veo_3_1.webm', play: false },
    { id: 10, name: 'Leo', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor10.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor10_veo_3_1.webm', play: false },
    { id: 11, name: 'Olivia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor11.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor11_veo_3_1.webm', play: false },
    { id: 12, name: 'Samir', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor12.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor12_veo_3_1.webm', play: false },
    // { id: 13, name: 'Sophia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor13.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor13_veo_3_1.webm', play: false },
    // { id: 14, name: 'Tina', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor14.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor14_veo_3_1.webm', play: false },
    // { id: 15, name: 'Tom', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor15.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor15_veo_3_1.webm', play: false },
    // { id: 16, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor16.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor16_veo_3_1.webm', play: false },
    // { id: 17, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor17.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor17_veo_3_1.webm', play: false },
    // { id: 18, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor18.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor18_veo_3_1.webm', play: false },
    // { id: 19, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor19.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor19_veo_3_1.webm', play: false },
    // { id: 20, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor20.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor20_veo_3_1.webm', play: false },
    // { id: 21, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor21.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor21_veo_3_1.webm', play: false },
    // { id: 22, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor22.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor22_veo_3_1.webm', play: false },
    // { id: 23, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor23.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor23_veo_3_1.webm', play: false },
    // { id: 24, name: 'Emillia', img: 'https://www.gstatic.com/docs/videos/images/presetavatars/actor24.jpg', preview: 'https://www.gstatic.com/docs/videos/videos/presetavatars/preview_actor24_veo_3_1.webm', play: false },
]

const customAvatars = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const allAvatars = computed(() => {
    return [...avatars, ...customAvatars.value]
})

const fetchCustomAvatars = async () => {
    try {
        const res = await mediaStore.fetchMedia('avatar')
        if (res.media) {
            customAvatars.value = (res.media || []).map((item: any) => ({
                id: item._id,
                name: item.fileName,
                img: item.key,
                preview: null,
                play: false,
                isCustom: true
            }))
        }
    } catch (error) {
        console.error('Failed to fetch custom avatars', error)
    }
}

const handleUploadAvatarClick = () => {
    fileInput.value?.click()
}

const onFileSelected = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    loading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('purpose', 'avatar')
        // Automatically mark as static VTuber puppet for now if uploaded via this flow
        formData.append('modelType', 'static')

        const data = await mediaStore.uploadMedia(formData);

        toast.success(t('projects.avatarCreator.toasts.avatarUploaded'))
        await fetchCustomAvatars()
        selectedAvatar.value = data?.media?._id
    } catch (error: any) {
        // Error handled by store
    } finally {
        loading.value = false
        if (fileInput.value) fileInput.value.value = ''
    }
}

const voiceSearch = ref('')
const filterLanguage = ref('')
const filterGender = ref('')
const filterType = ref('')
const voicePresets = [
    { id: 'narrator', name: 'Narrator', desc: 'Smooth, medium pitch', voiceId: 'en-US-Neural2-J', preview_url: '' },
    { id: 'educator', name: 'Educator', desc: 'Friendly, higher pitch', voiceId: 'en-US-Neural2-F', preview_url: '' },
    { id: 'teacher', name: 'Teacher', desc: 'Clear, low pitch', voiceId: 'en-US-Standard-B', preview_url: '' },
    { id: 'persuader', name: 'Persuader', desc: 'Engaging, low pitch', voiceId: 'en-US-News-N', preview_url: '' },
    { id: 'explainer', name: 'Explainer', desc: 'Lively, low pitch', voiceId: 'en-US-Neural2-H', preview_url: '' },
    { id: 'coach', name: 'Coach', desc: 'Lively, higher pitch', voiceId: 'en-GB-Neural2-B', preview_url: '' },
    { id: 'motivator', name: 'Motivator', desc: 'Energetic, medium pitch', voiceId: 'en-US-Polyglot-1', preview_url: '' },
]
const selectPreset = (preset: any) => {
    selectedVoice.value = preset.voiceId
}

const showAdvanced = ref(false)
const voiceSpeed = ref(1.0)
const voiceStability = ref(0.5)
const voiceSimilarity = ref(0.75)
const showCloneModal = ref(false)

const allVoices = ref<any[]>([])

const fetchVoices = async () => {
    try {
        const voices = await voiceStore.fetchVoices()
        allVoices.value = voices
    } catch (error) {
        console.error('Failed to fetch voices', error)
    }
}

const filteredVoices = computed(() => {
    return allVoices.value.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(voiceSearch.value.toLowerCase())
        const matchesLang = !filterLanguage.value || v.language === filterLanguage.value
        const matchesGender = !filterGender.value || v.gender === filterGender.value
        // We might want to match "type" eventually if metadata allows, for now just placeholder
        return matchesSearch && matchesLang && matchesGender
    })
})

const availableLanguages = computed(() => {
    return [...new Set(allVoices.value.map(v => v.language))].filter(Boolean)
})

const isElevenLabsActive = computed(() => {
    const selected = allVoices.value.find(v => v.id === selectedVoice.value)
    return selected?.provider === 'elevenlabs'
})

const playPreview = (url: string) => {
    const audio = new Audio(url)
    audio.play()
}

onMounted(() => {
    fetchCustomAvatars()
    fetchVoices()
})

const voices = [
    { id: 'v1', name: 'Alloy', desc: 'Neutral, Balanced' },
    { id: 'v2', name: 'Echo', desc: 'Warm, Round' },
    { id: 'v3', name: 'Fable', desc: 'British, Polite' },
]

const handleNext = () => {
    if (currentStep.value === 1) {
        currentStep.value++
    } else if (currentStep.value === 2) {
        generateAvatarVideo()
    }
}

const cloneName = ref('')
const cloneFiles = ref<File[]>([])
const cloning = ref(false)
const isDragging = ref(false)

const onCloneFilesSelected = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (files) cloneFiles.value.push(...Array.from(files))
}

const onCloneDrop = (e: DragEvent) => {
    isDragging.value = false
    const files = e.dataTransfer?.files
    if (files) cloneFiles.value.push(...Array.from(files))
}

const handleCloneVoice = async () => {
    if (!cloneName.value || cloneFiles.value.length === 0) return

    cloning.value = true
    try {
        const formData = new FormData()
        formData.append('name', cloneName.value)
        formData.append('description', 'Created via AntStudio User UI')
        cloneFiles.value.forEach(file => formData.append('files', file))

        await voiceStore.cloneVoice(formData)

        toast.success(t('projects.avatarCreator.toasts.voiceTrainingStarted'))
        showCloneModal.value = false
        cloneName.value = ''
        cloneFiles.value = []
        await fetchVoices() // Refresh list to include new voice
    } catch (error: any) {
        // Error handled by store
    } finally {
        cloning.value = false
    }
}

const generateAvatarVideo = async () => {
    if (!script.value.trim()) return toast.error(t('projects.avatarCreator.toasts.enterScript'))

    loading.value = true
    currentStep.value = 3
    generatedVideoUrl.value = ''
    generationStatus.value = t('projects.new.setup.avatar.initializingEngine')

    try {
        const avatar = allAvatars.value.find(a => a.id === selectedAvatar.value)
        const voice = allVoices.value.find(v => v.id === selectedVoice.value)

        const data = await aiStore.generateAvatarVideo({
            avatarId: String(selectedAvatar.value),
            avatarImage: avatar?.img,
            voiceId: selectedVoice.value,
            voiceProvider: voice?.provider,
            script: script.value,
            voiceSettings: {
                speed: voiceSpeed.value,
                stability: voiceStability.value,
                similarity: voiceSimilarity.value,
                pitch: 0, // Default for now
                languageCode: filterLanguage.value || voice?.language || 'en-US'
            }
        })

        if (data && data.jobId) {
            jobId.value = data.jobId
            pollStatus()
        } else {
            throw new Error('Failed to start generation')
        }
    } catch (error: any) {
        // toast.error(error.response?.data?.error || 'Failed to generate')
        currentStep.value = 2
    } finally {
        loading.value = false
    }
}

const pollStatus = async () => {
    try {
        const status = await aiStore.pollVideoStatus(jobId.value, 3000, 300000)

        if (status.status === 'completed' && status.videoUrl) {
            generatedVideoUrl.value = status.videoUrl
            toast.success(t('projects.avatarCreator.toasts.videoGenerated'))
        }
    } catch (error: any) {
        console.error('Polling error:', error)
        toast.error(t('projects.avatarCreator.toasts.generationFailed', { error: error.message }))
        currentStep.value = 2
    }
}

const handleDownload = () => {
    if (!generatedVideoUrl.value) return
    const link = document.createElement('a')
    link.href = getFileUrl(generatedVideoUrl.value)
    link.download = `avatar-video-${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

const handleUpload = async () => {
    if (!generatedVideoUrl.value) return;
    
    try {
        toast.info(t('projects.publish.toasts.vodSaving'));
        
        // 1. Fetch blob
        const response = await fetch(getFileUrl(generatedVideoUrl.value));
        const blob = await response.blob();
        
        // 2. Upload
        const formData = new FormData();
        const filename = `avatar-video-${Date.now()}.mp4`;
        formData.append('file', blob, filename);
        formData.append('purpose', 'render');
        
        await mediaStore.uploadMedia(formData);
        toast.success(t('projects.avatarCreator.toasts.videoSaved'));
    } catch (error) {
        console.error('Failed to save video:', error);
        toast.error(t('projects.avatarCreator.toasts.saveFailed'));
    }
}

const resetSetup = () => {
    currentStep.value = 1
    generatedVideoUrl.value = ''
    script.value = ''
}
</script>

<style lang="scss" scoped>
// Inherit styles from Product Ads Setup mostly, simplified here
.avatar-setup {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 40px 20px;
}

.setup-container {
    width: 100%;
    max-width: 800px;
    background: rgba(20, 20, 20, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 40px;
}

.header-section {
    text-align: center;
    margin-bottom: 30px;

    h2 {
        font-size: 28px;
        color: #fff;
    }

    p {
        color: rgba(255, 255, 255, 0.6);
    }
}

.avatar-grid {
    display: grid;
    // grid-template-columns: repeat(4, 1fr);
    // grid-template-rows: repeat(2, 1fr);
    // gap: 20px;
    overflow-y: scroll;
    max-height: 400px;
    scrollbar-width: none;

    .avatar-card {
        aspect-ratio: 3/4;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        overflow: hidden;
        position: relative;
        border: 2px solid transparent;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .avatar-name {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            text-align: center;
            font-size: 14px;
            backdrop-filter: blur(5px);
            z-index: 2;
        }

        &.active {
            border-color: #6366f1;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        &.upload-card {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.03);

            &:hover {
                border-color: #6366f1;
                background: rgba(99, 102, 241, 0.05);
            }

            .upload-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                color: rgba(255, 255, 255, 0.4);

                span {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            }
        }

        .avatar-preview {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;

            video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }
    }
}

.steps-header {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 40px;
}

.step-item {
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.4);

    &.active {
        color: #fff;

        .step-circle {
            background: #6366f1;
            border-color: #6366f1;
        }
    }

    &.completed {
        color: #10b981;

        .step-circle {
            background: #10b981;
            border-color: #10b981;
        }
    }

    .step-circle {
        width: 32px;
        height: 32px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        transition: all 0.3s;
    }
}

.form-cols {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
}

.glow-textarea {
    width: 100%;
    height: 300px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: #fff;
    outline: none;
    resize: none;

    &:focus {
        border-color: #6366f1;
    }
}

.voice-presets-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 4px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }

    .voice-preset-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
        }

        &.active {
            background: rgba(255, 255, 255, 0.1);
            border-color: #6366f1;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .preset-icon {
            .btn-play-preview {
                width: 44px;
                height: 44px;
                background: #d1edff;
                border: none;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.2s;

                &:hover {
                    transform: scale(1.05);
                    background: #bae6ff;
                }
            }
        }

        .preset-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;

            .name {
                font-weight: 700;
                color: #fff;
                font-size: 15px;
            }

            .desc {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }
        }

        .preset-check {
            width: 20px;
            height: 20px;
            background: #6366f1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 12px;
        }
    }
}

.advanced-toggle-wrapper {
    margin-top: 20px;
}

.advanced-voice-container {
    margin-top: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: none;
    border-radius: 0 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.voice-filters {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .search-input {
        width: 100%;
        height: 40px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 0 16px;
        color: #fff;
        font-size: 14px;

        &:focus {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.05);
        }
    }

    .filter-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .filter-select {
        height: 40px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 0 12px;
        color: #fff;
        font-size: 14px;
        outline: none;

        option {
            background: #1a1a1a;
        }
    }
}

.voice-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 4px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }
}

.voice-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(4px);
    }

    &.active {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }

    .voice-icon {
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }

    .voice-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .name {
            font-weight: 600;
            color: #fff;
            font-size: 14px;
        }

        .desc {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            text-transform: capitalize;
        }
    }

    .btn-preview {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: #6366f1;
            transform: scale(1.1);
        }
    }
}

.advanced-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 245, 0.08);
    }
}

.advanced-settings-sliders {
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .setting-item {
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 600;
        }

        input[type="range"] {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            appearance: none;
            outline: none;

            &::-webkit-slider-thumb {
                appearance: none;
                width: 14px;
                height: 14px;
                background: #6366f1;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
            }
        }
    }
}

.personal-voice-section {
    margin-top: 24px;

    .btn-clone {
        width: 100%;
        height: 44px;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        i {
            font-size: 18px;
        }
    }
}

.setup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    button {
        height: 44px;
        padding: 0 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-back,
    .btn-cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;

        &:hover {
            background: rgba(255, 255, 255, 0.05);
        }
    }

    .btn-next {
        background: #fff;
        border: none;
        color: #000;

        &:disabled {
            opacity: 0.5;
        }

        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }
    }
}

.preview-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 16px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
}

.generating-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;

    .spinner-large {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .progress-info {
        text-align: center;

        p {
            font-size: 16px;
            color: #fff;
            margin: 0;
        }
    }
}

.video-player-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;

    .main-video {
        width: 100%;
        max-height: 450px;
        border-radius: 12px;
        background: #000;
    }

    .actions {
        display: flex;
        justify-content: center;
        gap: 12px;
    }
}

.btn-action {
    height: 48px;
    padding: 0 32px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    &.primary {
        background: #6366f1;
        border: none;
        color: #fff;

        &:hover {
            background: #4f46e5;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(40px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.modal-content {
    width: 100%;
    max-width: 500px;
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    h3 {
        font-size: 20px;
        color: #fff;
        margin: 0;
    }

    .btn-close-modal {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 24px;
        cursor: pointer;

        &:hover {
            color: #fff;
        }
    }
}

.modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .modal-desc {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.5;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.4);
        }

        .modal-input {
            height: 44px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 0 16px;
            color: #fff;

            &:focus {
                border-color: #6366f1;
            }
        }
    }
}

.upload-zone {
    height: 120px;
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &:hover,
    &.dragover {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.05);
    }

    i {
        font-size: 32px;
        color: rgba(255, 255, 255, 0.3);
    }

    p {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.4);

        span {
            color: #6366f1;
            font-weight: 600;
        }
    }

    .hidden-input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
    }
}

.file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .file-tag {
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.2);
        padding: 6px 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #fff;

        i {
            color: #f87171;
            cursor: pointer;

            &:hover {
                color: #ef4444;
            }
        }
    }
}

.modal-footer {
    padding: 24px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    justify-content: flex-end;
    gap: 12px;

    button {
        height: 44px;
        padding: 0 24px;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-cancel-modal {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .btn-start-clone {
        background: #6366f1;
        border: none;
        color: #fff;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
    }
}
</style>
