<template>
    <div class="creation-options-grid animate-up-delayed">
        <div v-for="(opt, idx) in options" :key="idx" class="creation-card" @click="$emit('select', opt)">
            <div class="card-visual" :class="opt.class">
                <component :is="opt.icon" theme="outline" size="24" />
            </div>
            <div class="card-info">
                <h3>{{ opt.label }}</h3>
                <p>{{ opt.desc }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    MagicWand, User, Link, Copy, FileText, Monitor, Camera, Plus, Broadcast
} from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const options = computed(() => [
    {
        label: t('projects.new.options.aiVideo.label'),
        desc: t('projects.new.options.aiVideo.desc'),
        icon: MagicWand,
        class: 'bg-gradient-purple',
        value: 'ai-video'
    },
    {
        label: t('projects.new.options.aiAvatar.label'),
        desc: t('projects.new.options.aiAvatar.desc'),
        icon: User,
        class: 'bg-gradient-blue',
        value: 'avatar'
    },
    {
        label: t('projects.new.options.urlToVideo.label'),
        desc: t('projects.new.options.urlToVideo.desc'),
        icon: Link,
        class: 'bg-gradient-green',
        value: 'url-to-video'
    },
    {
        label: t('projects.new.options.cloneStyle.label'),
        desc: t('projects.new.options.cloneStyle.desc'),
        icon: Copy,
        class: 'bg-gradient-orange',
        value: 'clone-style'
    },
    {
        label: t('projects.new.options.scriptToVideo.label'),
        desc: t('projects.new.options.scriptToVideo.desc'),
        icon: FileText,
        class: 'bg-gradient-pink',
        value: 'script-to-video'
    },
    {
        label: t('projects.new.options.presentation.label'),
        desc: t('projects.new.options.presentation.desc'),
        icon: Monitor,
        class: 'bg-gradient-cyan',
        value: 'presentation'
    },
    {
        label: t('projects.new.options.record.label'),
        desc: t('projects.new.options.record.desc'),
        icon: Camera,
        class: 'bg-gradient-red',
        value: 'record'
    },
    {
        label: t('projects.new.options.liveStream.label'),
        desc: t('projects.new.options.liveStream.desc'),
        icon: Broadcast,
        class: 'bg-gradient-indigo',
        value: 'live-stream'
    },
    {
        label: t('projects.new.options.blank.label'),
        desc: t('projects.new.options.blank.desc'),
        icon: Plus,
        class: 'bg-white-10',
        value: 'blank'
    }
])

defineEmits(['select'])
</script>

<style lang="scss" scoped>
.creation-options-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
    padding: 8px 0;

    @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.creation-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }
}

.card-visual {
    width: 100%;
    height: 80px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    margin-bottom: 4px;

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

    &.bg-gradient-indigo {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
    }

    &.bg-white-10 {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
}

.card-info {
    h3 {
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 2px;
    }

    p {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
        line-height: 1.3;
    }
}

.animate-up-delayed {
    animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}
</style>
