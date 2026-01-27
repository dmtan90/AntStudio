<template>
    <div class="product-ads-setup animate-up">
        <div class="setup-container">
            <!-- Steps Header -->
            <div class="steps-header">
                <div v-for="(step, idx) in steps" :key="idx" class="step-item"
                    :class="{ active: currentStep === idx + 1, completed: currentStep > idx + 1 }">
                    <div class="step-circle">{{ idx + 1 }}</div>
                    <span>{{ step }}</span>
                    <div v-if="idx < steps.length - 1" class="step-line"></div>
                </div>
            </div>

            <!-- Step 1: Input Source -->
            <transition name="fade-slide" mode="out-in">
                <div v-if="currentStep === 1" class="step-content">
                    <div class="header-section">
                        <h2>Product Source</h2>
                        <p>Enter your product page URL or upload marketing assets.</p>
                    </div>

                    <div class="source-options">
                        <div class="option-card" :class="{ active: sourceType === 'url' }" @click="sourceType = 'url'">
                            <link-one theme="outline" size="24" />
                            <span>Product URL</span>
                        </div>
                        <div class="option-card" :class="{ active: sourceType === 'upload' }"
                            @click="sourceType = 'upload'">
                            <upload-one theme="outline" size="24" />
                            <span>Upload Assets</span>
                        </div>
                    </div>

                    <div v-if="sourceType === 'url'" class="input-form">
                        <label>Product Page URL</label>
                        <input v-model="productUrl" type="text" placeholder="https://shopee.vn/product/..."
                            class="glow-input" />
                    </div>

                    <div v-else class="upload-area">
                        <div class="dropzone">
                            <plus theme="outline" size="32" />
                            <p>Drag images here or click to upload</p>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Analysis & Review -->
                <div v-else-if="currentStep === 2" class="step-content">
                    <div class="header-section">
                        <h2>Product Analysis</h2>
                        <p>AI has extracted the following details. Review before creating.</p>
                    </div>

                    <div class="analysis-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Product Name</label>
                                <input v-model="analysisData.name" class="glow-input" />
                            </div>
                            <div class="form-group">
                                <label>Price</label>
                                <input v-model="analysisData.price" class="glow-input" />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Key Selling Points</label>
                            <textarea v-model="analysisData.description" class="glow-input" rows="3"></textarea>
                        </div>

                        <div class="form-group">
                            <label>Brand Vibe</label>
                            <div class="tags">
                                <span v-for="tag in analysisData.vibe" :key="tag" class="tag">{{ tag }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Template -->
                <div v-else-if="currentStep === 3" class="step-content">
                    <div class="header-section">
                        <h2>Select Template</h2>
                        <p>Choose a style for your product ad.</p>
                    </div>

                    <div class="templates-grid">
                        <div v-for="tpl in templates" :key="tpl.id" class="tpl-card"
                            :class="{ active: selectedTemplate === tpl.id }" @click="selectedTemplate = tpl.id">
                            <div class="tpl-preview" :style="{ backgroundColor: tpl.color }"></div>
                            <span>{{ tpl.name }}</span>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- Footer Actions -->
            <div class="setup-footer">
                <button v-if="currentStep > 1" class="btn-back" @click="currentStep--">Back</button>
                <button v-else class="btn-cancel" @click="$router.push('/dashboard')">Cancel</button>

                <button class="btn-next" :disabled="loading" @click="handleNext">
                    <span v-if="loading">Processing...</span>
                    <span v-else>{{ currentStep === 3 ? 'Create Project' : 'Next' }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { toast } from 'vue-sonner'
import { LinkOne, UploadOne, Plus } from '@icon-park/vue-next'

const router = useRouter()
const projectStore = useProjectStore()

const steps = ['Source', 'Analysis', 'Template']
const currentStep = ref(1)
const sourceType = ref('url')
const productUrl = ref('')
const loading = ref(false)
const selectedTemplate = ref(1)

const analysisData = reactive({
    name: 'Sony WH-1000XM5',
    price: '$349.00',
    description: 'Industry-leading noise cancellation, 30-hour battery life, and crystal-clear hands-free calling.',
    vibe: ['Modern', 'Sleek', 'Premium']
})

const templates = [
    { id: 1, name: 'Dynamic Promo', color: '#6366f1' },
    { id: 2, name: 'Minimal Showcase', color: '#10b981' },
    { id: 3, name: 'TikTok Viral', color: '#f43f5e' },
    { id: 4, name: 'Cinematic Reveal', color: '#8b5cf6' }
]

const handleNext = async () => {
    if (currentStep.value === 1) {
        if (!productUrl.value && sourceType.value === 'url') return toast.error('Please enter a URL')

        loading.value = true
        // Mock API Call
        setTimeout(() => {
            loading.value = false
            currentStep.value++
        }, 1500)
        return
    }

    if (currentStep.value === 2) {
        currentStep.value++
        return
    }

    if (currentStep.value === 3) {
        createProject()
    }
}

const createProject = async () => {
    loading.value = true
    try {
        const res = await projectStore.createProject({
            title: `${analysisData.name} Ad`,
            aspectRatio: '9:16',
            mode: 'product-ads'
        })

        // In a real flow, we would pass analysisData to the project store or initialize API
        toast.success('Project created!')
        router.push(`/projects/${res.project._id}/editor`)
    } catch (error) {
        toast.error('Failed to create project')
    } finally {
        loading.value = false
    }
}
</script>

<style lang="scss" scoped>
.product-ads-setup {
    width: 100%;
    height: 100%;
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
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(20px);
}

.steps-header {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 40px;

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
}

.step-content {
    flex: 1;
    min-height: 400px;
}

.header-section {
    text-align: center;
    margin-bottom: 30px;

    h2 {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #fff;
    }

    p {
        color: rgba(255, 255, 255, 0.6);
    }
}

.source-options {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 30px;

    .option-card {
        width: 160px;
        height: 120px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        &.active {
            background: rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
            color: #fff;
        }
    }
}

.glow-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: #fff;
    outline: none;
    font-size: 16px;
    transition: all 0.3s;

    &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
}

.upload-area {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 60px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.05);
    }
}

.analysis-form {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
    }

    .tags {
        display: flex;
        gap: 8px;

        .tag {
            background: rgba(99, 102, 241, 0.2);
            color: #818cf8;
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 12px;
        }
    }
}

.templates-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;

    .tpl-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        border: 1px solid transparent;

        &:hover {
            transform: translateY(-4px);
        }

        &.active {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.1);
        }

        .tpl-preview {
            width: 100%;
            aspect-ratio: 9/16;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        span {
            font-size: 13px;
            color: #fff;
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
