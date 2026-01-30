<template>
    <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" width="900px"
        class="project-creation-dialog glass-modal" :show-close="true" :close-on-click-modal="true" destroy-on-close
        align-center>
        <template #header>
            <div class="dialog-header">
                <h2>Start New Project</h2>
                <p>Choose how you want to begin your creative journey</p>
            </div>
        </template>

        <div class="creation-options-grid">
            <div v-for="(opt, idx) in options" :key="idx" class="creation-card" @click="handleSelect(opt)">
                <div class="card-visual" :class="opt.class">
                    <component :is="opt.icon" theme="outline" size="32" />
                </div>
                <div class="card-info">
                    <h3>{{ opt.label }}</h3>
                    <p>{{ opt.desc }}</p>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import {
    MagicWand, User, Link, Copy, FileText, Monitor, Camera, Plus
} from '@icon-park/vue-next'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])
const router = useRouter()

const options = [
    {
        label: 'AI Video',
        desc: 'Generate from text/script',
        icon: MagicWand,
        class: 'bg-gradient-purple',
        value: 'ai-video'
    },
    {
        label: 'AI Avatar',
        desc: 'Talking head video',
        icon: User,
        class: 'bg-gradient-blue',
        value: 'avatar'
    },
    {
        label: 'Product Ads',
        desc: 'From Product URL',
        icon: Link,
        class: 'bg-gradient-green',
        value: 'product-ads'
    },
    {
        label: 'Clone Style',
        desc: 'Clone from video URL',
        icon: Copy,
        class: 'bg-gradient-orange',
        value: 'clone-style'
    },
    {
        label: 'Live Studio',
        desc: 'Live streaming',
        icon: Monitor,
        class: 'bg-gradient-pink',
        value: 'live-studio'
    },
    {
        label: 'Presentation',
        desc: 'From slides/PPT',
        icon: Monitor,
        class: 'bg-gradient-cyan',
        value: 'presentation'
    },
    {
        label: 'Record',
        desc: 'Screen & Camera',
        icon: Camera,
        class: 'bg-gradient-red',
        value: 'record'
    },
    {
        label: 'Blank Project',
        desc: 'Start from scratch',
        icon: Plus,
        class: 'bg-white-10',
        value: 'blank'
    }
]

// const handleSelect = (opt: any) => {
//     emit('select', opt.value)
//     emit('update:modelValue', false)
// }

const handleSelect = (opt: any) => {
    emit('update:modelValue', false)
    switch (opt.value) {
        case 'ai-video':
        case 'script-to-video':
            router.push('/projects/new')
            break
        case 'blank':
            router.push('/projects/new?mode=blank')
            break
        case 'product-ads':
            router.push('/projects/new?mode=product-ads')
            break
        case 'avatar':
            router.push('/projects/new?mode=avatar')
            break
        case 'clone-style':
            router.push('/projects/new?mode=clone')
            break
        case 'presentation':
            router.push('/projects/new?mode=presentation')
            break
        case 'record':
            router.push('/recorder')
            break
        case 'live-studio':
            router.push('/live/studio')
            break
        default:
            router.push('/projects/new')
    }
}
</script>

<style lang="scss">
.glass-modal {
    background: rgba(18, 18, 18, 0.8) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px !important;

    .el-dialog__header {
        margin-right: 0;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .el-dialog__title {
        color: #fff;
    }

    .el-dialog__body {
        padding: 30px;
    }
}
</style>

<style lang="scss" scoped>
.dialog-header {
    h2 {
        font-size: 24px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 4px;
        background: linear-gradient(to right, #fff, #999);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    p {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        margin: 0;
    }
}

.creation-options-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;

    @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.creation-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), transparent);
        opacity: 0;
        transition: opacity 0.3s;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

        &::before {
            opacity: 1;
        }
    }
}

.card-visual {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24px;
    position: relative;
    overflow: hidden;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.2));
    }

    &.bg-gradient-purple {
        background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
        color: #4a1d96;
    }

    &.bg-gradient-blue {
        background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        color: #0f4c75;
    }

    &.bg-gradient-green {
        background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
        color: #1b5e20;
    }

    &.bg-gradient-orange {
        background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);
        color: #e65100;
    }

    &.bg-gradient-pink {
        background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
        color: #4a148c;
    }

    &.bg-gradient-cyan {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #006064;
    }

    &.bg-gradient-red {
        background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
        color: #b71c1c;
    }

    &.bg-white-10 {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
}

.card-info {
    h3 {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 4px;
    }

    p {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
        line-height: 1.4;
    }
}
</style>
