<template>
    <div class="presentation-setup animate-up">
        <div class="setup-card">
            <div class="card-header">
                <div class="icon-wrapper">
                    <monitor theme="filled" size="32" fill="#fff" />
                </div>
                <h2>Presentation to Video</h2>
                <p>Convert your slides into an engaging video instantly.</p>
            </div>

            <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
                <div class="upload-content">
                    <upload-one theme="outline" size="48" fill="#6366f1" />
                    <h3>Upload Presentation</h3>
                    <p>Support PDF, PPTX (Max 50MB)</p>
                    <button class="btn-select">Select File</button>
                </div>
                <input type="file" ref="fileInput" accept=".pdf,.pptx" style="display: none"
                    @change="handleFileSelect" />
            </div>

            <div class="actions">
                <button class="btn-cancel" @click="$router.push('/dashboard')">Cancel</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor, UploadOne } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const projectStore = useProjectStore()
const fileInput = ref<HTMLInputElement | null>(null)

const triggerUpload = () => fileInput.value?.click()

const handleFileSelect = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) processFile(file)
}

const handleDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files[0]
    if (file) processFile(file)
}

const processFile = async (file: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)) {
        // Basic type check, might need looser check for convenience
        // toast.error('Invalid file type')
        // allowing flow for now for demo
    }

    // Mock Processing
    const toastId = toast.loading('Uploading and processing slides...')

    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))

        const res = await projectStore.createProject({
            title: file.name.replace(/\.[^/.]+$/, "") + ' (Presentation)',
            aspectRatio: '16:9',
            mode: 'presentation'
        })

        toast.success('Presentation converted!', { id: toastId })
        router.push(`/projects/${res.project._id}/editor`)
    } catch (error) {
        toast.error('Failed to convert presentation', { id: toastId })
    }
}
</script>

<style lang="scss" scoped>
.presentation-setup {
    width: 100%;
    padding-top: 60px;
    display: flex;
    justify-content: center;
}

.setup-card {
    width: 100%;
    max-width: 500px;
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
    transition: transform 0.3s;

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

        &:hover {
            color: #fff;
        }
    }
}

.animate-up {
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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
