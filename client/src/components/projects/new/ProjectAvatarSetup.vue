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
                        <h2>Select AI Avatar</h2>
                        <p>Choose a presenter for your video.</p>
                    </div>

                    <div class="avatar-grid">
                        <div v-for="av in avatars" :key="av.id" class="avatar-card"
                            :class="{ active: selectedAvatar === av.id }" @click="selectedAvatar = av.id">
                            <img :src="getFileUrl(av.img)" alt="Avatar" />
                            <div class="avatar-name">{{ av.name }}</div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Script & Voice -->
                <div v-else-if="currentStep === 2" class="step-content">
                    <div class="header-section">
                        <h2>Script & Voice</h2>
                        <p>What should the avatar say?</p>
                    </div>

                    <div class="form-cols">
                        <div class="col-left">
                            <label>Script</label>
                            <textarea v-model="script" class="glow-textarea"
                                placeholder="Hello, welcome to our new product launch..."></textarea>
                        </div>
                        <div class="col-right">
                            <label>Voice</label>
                            <div class="voice-list">
                                <div v-for="voice in voices" :key="voice.id" class="voice-item"
                                    :class="{ active: selectedVoice === voice.id }" @click="selectedVoice = voice.id">
                                    <div class="voice-icon">🔊</div>
                                    <div class="voice-info">
                                        <span class="name">{{ voice.name }}</span>
                                        <span class="desc">{{ voice.desc }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Preview -->
                <div v-else-if="currentStep === 3" class="step-content">
                    <div class="header-section">
                        <h2>Video Preview</h2>
                        <p v-if="!generatedVideoUrl">Generating your AI avatar video...</p>
                        <p v-else>Your video is ready!</p>
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
                                    <span>Download</span>
                                </button>
                                <button class="btn-action primary" @click="handleUpload">
                                    <span>Save to Library</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>

            <div class="setup-footer" v-if="currentStep < 3 || generatedVideoUrl">
                <button v-if="currentStep > 1 && currentStep < 3" class="btn-back" @click="currentStep--">Back</button>
                <button v-if="currentStep === 1" class="btn-cancel" @click="$router.push('/dashboard')">Cancel</button>
                <button v-if="currentStep === 3" class="btn-cancel" @click="resetSetup">Create New</button>

                <button v-if="currentStep < 3" class="btn-next" :disabled="loading" @click="handleNext">
                    <span v-if="loading">Processing...</span>
                    <span v-else>{{ currentStep === 2 ? 'Generate Video' : 'Next' }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { toast } from 'vue-sonner'
import api, { getFileUrl } from '@/utils/api'

const router = useRouter()
const projectStore = useProjectStore()

const steps = ['Avatar', 'Script', 'Preview']
const currentStep = ref(1)
const loading = ref(false)
const selectedAvatar = ref(1)
const selectedVoice = ref('v1')
const script = ref('')

const generatedVideoUrl = ref('')
const generationStatus = ref('Starting generation...')
const jobId = ref('')

const avatars = [
    { id: 1, name: 'Anna', img: 'https://ui-avatars.com/api/?name=Anna&size=400&background=a18cd1&color=fff&bold=true' },
    { id: 2, name: 'David', img: 'https://ui-avatars.com/api/?name=David&size=400&background=84fab0&color=fff&bold=true' },
    { id: 3, name: 'Sarah', img: 'https://ui-avatars.com/api/?name=Sarah&size=400&background=fbc2eb&color=fff&bold=true' },
    { id: 4, name: 'James', img: 'https://ui-avatars.com/api/?name=James&size=400&background=8fd3f4&color=fff&bold=true' },
]

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

const generateAvatarVideo = async () => {
    if (!script.value.trim()) return toast.error('Please enter a script')

    loading.value = true
    currentStep.value = 3
    generatedVideoUrl.value = ''
    generationStatus.value = 'Initializing AI engine...'

    try {
        const avatar = avatars.find(a => a.id === selectedAvatar.value)

        const res = await api.post('/ai/generate-avatar-video', {
            avatarId: selectedAvatar.value,
            avatarImage: avatar?.img,
            voiceId: selectedVoice.value,
            script: script.value
        }, { timeout: 300000 })

        if (res.data.jobId) {
            jobId.value = res.data.jobId
            pollStatus()
        } else {
            throw new Error('Failed to start generation')
        }
    } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to generate')
        currentStep.value = 2
    } finally {
        loading.value = false
    }
}

const pollStatus = async () => {
    try {
        const res = await api.get(`/ai/video-status/${jobId.value}`)
        const status = res.data.status

        if (status === 'completed' && res.data.videoUrl) {
            generatedVideoUrl.value = res.data.videoUrl
            toast.success('Video generated successfully!')
        } else if (status === 'failed') {
            toast.error('Generation failed')
            currentStep.value = 2
        } else {
            generationStatus.value = res.data.progress ? `Processing: ${res.data.progress}%` : 'AI is thinking...'
            setTimeout(pollStatus, 3000)
        }
    } catch (error) {
        console.error('Polling error:', error)
        setTimeout(pollStatus, 5000)
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

const handleUpload = () => {
    toast.info('Feature coming soon: Saving to media library')
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
    padding-top: 40px;
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
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;

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
        }

        &.active {
            border-color: #6366f1;
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

.voice-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.voice-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    &.active {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
    }

    .voice-icon {
        font-size: 20px;
    }

    .voice-info {
        display: flex;
        flex-direction: column;

        .name {
            font-weight: 600;
            color: #fff;
        }

        .desc {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
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
</style>
