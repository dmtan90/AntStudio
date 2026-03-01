<template>
    <div class="presentation-setup animate-up">
        <div class="setup-card">
            <div class="card-header">
                <div class="icon-wrapper">
                    <monitor theme="filled" size="32" fill="#fff" />
                </div>
                <h2>{{ t('projects.new.setup.presentation.title') }}</h2>
                <p>{{ t('projects.new.setup.presentation.desc') }}</p>
            </div>

            <div class="section-title">
                <user theme="outline" size="18" fill="currentColor" />
                <span>{{ t('projects.new.setup.presentation.presenterAvatar') }}</span>
            </div>

            <div class="avatars-grid">
                <div v-for="avatar in mediaStore.resources" :key="avatar._id"
                    :class="['avatar-item', { selected: selectedAvatarId === avatar._id }]"
                    @click="toggleAvatar(avatar._id)">
                    <img :src="avatar.thumbnails?.[0] || avatar.url" alt="Avatar" />
                    <div class="check-overlay">
                        <check theme="filled" size="20" fill="#fff" />
                    </div>
                </div>
                <div v-if="mediaStore.resources.length === 0" class="no-avatars">
                    {{ t('projects.new.setup.presentation.noAvatars') }}
                </div>
            </div>

            <div class="section-title">
                <upload-one theme="outline" size="18" fill="currentColor" />
                <span>{{ t('projects.new.setup.presentation.uploadSlides') }}</span>
            </div>

            <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
                <div class="upload-content">
                    <upload-one theme="outline" size="48" fill="#6366f1" />
                    <h3>{{ t('projects.new.setup.presentation.uploadPresentation') }}</h3>
                    <p>{{ t('projects.new.setup.presentation.support') }}</p>
                    <button class="btn-select">{{ t('projects.new.setup.presentation.selectFile') }}</button>
                </div>
                <input type="file" ref="fileInput" accept=".pdf,.pptx" style="display: none"
                    @change="handleFileSelect" />
            </div>

            <div class="actions">
                <button class="btn-cancel" @click="$router.push('/dashboard')">{{ t('common.cancel') }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor, UploadOne, User, Check, Close } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useMediaStore } from '@/stores/media'
import { useI18n } from 'vue-i18n';

const router = useRouter()
const projectStore = useProjectStore()
const mediaStore = useMediaStore()
const { t } = useI18n()

const loading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedAvatarId = ref<string | null>(null)

const triggerUpload = () => fileInput.value?.click()

onMounted(async () => {
    await mediaStore.fetchMedia('avatar')
})

const handleFileSelect = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) processFile(file)
}

const handleDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files[0]
    if (file) processFile(file)
}

const toggleAvatar = (id: string) => {
    selectedAvatarId.value = selectedAvatarId.value === id ? null : id
}

const processFile = async (file: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)) {
        // Basic type check
    }

    const toastId = toast.loading(t('projects.new.setup.presentation.toasts.processing'))

    try {
        // Simulate uploading/processing delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        const res = await projectStore.createProject({
            title: file.name.replace(/\.[^/.]+$/, "") + ' (Presentation)',
            aspectRatio: '16:9',
            mode: 'presentation',
            metadata: {
                sourceFile: file.name,
                avatarMediaId: selectedAvatarId.value || undefined, // Pass selected avatar
                useAvatar: !!selectedAvatarId.value
            }
        })

        toast.success(t('projects.new.setup.presentation.toasts.success'), { id: toastId })
        router.push(`/projects/${res.project._id}/editor`)
    } catch (error) {
        toast.error(t('projects.new.setup.presentation.toasts.failed'), { id: toastId })
    }
}
</script>

<style lang="scss" scoped>
.presentation-setup {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 40px 20px;
    padding-bottom: 100px;
}

.setup-card {
    width: 100%;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 40px;
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.card-header {
    text-align: center;

    .icon-wrapper {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, rgba(79, 172, 254, 0.2), rgba(0, 242, 254, 0.1));
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
    }

    h2 {
        font-size: 24px;
        color: #fff;
        margin: 0 0 8px;
    }

    p {
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
    }
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
    }
}

.avatars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
    margin-bottom: 20px;

    .avatar-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s;

        &:hover {
            transform: translateY(-2px);
        }

        &.selected {
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);

            .check-overlay {
                opacity: 1;
            }
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .check-overlay {
            position: absolute;
            inset: 0;
            background: rgba(99, 102, 241, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
    }

    .no-avatars {
        grid-column: 1 / -1;
        text-align: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
        border: 1px dashed rgba(255, 255, 255, 0.1);
    }
}

.upload-area {
    border: 2px dashed rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.05);

        .upload-content {
            transform: translateY(-2px);
        }
    }
}

.upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    h3 {
        font-size: 16px;
        color: #fff;
        margin: 0;
    }

    p {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.4);
        margin: 0;
    }

    .btn-select {
        margin-top: 8px;
        background: #fff;
        color: #000;
        border: none;
        padding: 8px 20px;
        border-radius: 100px;
        font-size: 13px;
        font-weight: 600;
        pointer-events: none;
    }
}

.actions {
    display: flex;
    justify-content: center;

    .btn-cancel {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
        }
    }
}
</style>
