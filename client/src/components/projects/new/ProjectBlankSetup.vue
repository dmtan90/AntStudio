<template>
    <div class="blank-setup-container animate-up">
        <div class="setup-card">
            <div class="card-header">
                <div class="icon-wrapper">
                    <plus theme="filled" size="32" fill="#fff" />
                </div>
                <h2>Start Blank Project</h2>
                <p>Start from scratch with a clean canvas. Choose your settings to begin.</p>
            </div>

            <div class="form-group">
                <label>Project Title</label>
                <div class="input-wrapper">
                    <textarea v-model="form.title" placeholder="Enter project title..." class="title-input" rows="1"
                        @keydown.enter.prevent="createProject"></textarea>
                </div>
            </div>

            <div class="form-group">
                <label>Aspect Ratio</label>
                <div class="ratio-grid">
                    <div v-for="ratio in ratios" :key="ratio.value" class="ratio-card justify-center"
                        :class="{ active: form.aspectRatio === ratio.value }" @click="form.aspectRatio = ratio.value">
                        <div class="ratio-preview" :style="{ aspectRatio: ratio.cssRatio }"></div>
                        <span>{{ ratio.label }}</span>
                        <small>{{ ratio.desc }}</small>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="btn-cancel" @click="$router.push('/dashboard')">Cancel</button>
                <button class="btn-create" :disabled="!form.title.trim() || loading" @click="createProject">
                    <span v-if="loading">Creating...</span>
                    <span v-else>Create Project</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@icon-park/vue-next'
import { useProjectStore } from '@/stores/project'
import { toast } from 'vue-sonner'

const router = useRouter()
const projectStore = useProjectStore()
const loading = ref(false)

const form = reactive({
    title: '',
    aspectRatio: '16:9'
})

const ratios = [
    { value: '16:9', label: '16:9', desc: 'Landscape', cssRatio: '16/9' },
    { value: '9:16', label: '9:16', desc: 'Portrait', cssRatio: '9/16' },
    { value: '1:1', label: '1:1', desc: 'Square', cssRatio: '1/1' },
    { value: '4:3', label: '4:3', desc: 'Classic', cssRatio: '4/3' }
]

const createProject = async () => {
    if (!form.title.trim()) return

    loading.value = true
    try {
        const res = await projectStore.createProject({
            title: form.title,
            aspectRatio: form.aspectRatio,
            mode: 'blank'
        })

        toast.success('Project created successfully')
        router.push({ name: 'project-editor', params: { id: res.project._id }, query: { mode: "studio" } })
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to create project')
    } finally {
        loading.value = false
    }
}
</script>

<style lang="scss" scoped>
.blank-setup-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
}

.setup-card {
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
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    h2 {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px;
        background: linear-gradient(to right, #fff, #aaa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    p {
        color: rgba(255, 255, 255, 0.6);
        font-size: 15px;
        margin: 0;
    }
}

.form-group {
    label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
}

.title-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    font-size: 18px;
    color: #fff;
    outline: none;
    resize: none;
    transition: all 0.3s;

    &:focus {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
    }

    &::placeholder {
        color: rgba(255, 255, 255, 0.2);
    }
}

.ratio-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    @media (max-width: 600px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.ratio-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    &.active {
        background: rgba(255, 255, 255, 0.15);
        border-color: #fff;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
    }

    .ratio-preview {
        width: 32px;
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 4px;
        margin-bottom: 4px;
    }

    span {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
    }

    small {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
    }
}

.actions {
    display: flex;
    gap: 12px;
    margin-top: 12px;

    button {
        flex: 1;
        height: 48px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);

        &:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }
    }

    .btn-create {
        background: #fff;
        border: none;
        color: #000;

        &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 255, 255, 0.2);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
