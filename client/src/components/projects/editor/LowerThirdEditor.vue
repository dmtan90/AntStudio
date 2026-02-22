<template>
    <el-dialog v-model="visible"
        :title="isEdit ? t('projects.editor.lowerThird.edit') : t('projects.editor.lowerThird.add')" width="600px"
        @close="handleClose">
        <div class="space-y-6">
            <!-- Text Input -->
            <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                    {{ t('projects.editor.lowerThird.text') }}
                </label>
                <el-input v-model="formData.text" :placeholder="t('projects.editor.lowerThird.textPlaceholder')"
                    maxlength="50" show-word-limit />
            </div>

            <!-- Subtitle Input -->
            <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                    {{ t('projects.editor.lowerThird.subtitle') }} ({{ t('common.optional') }})
                </label>
                <el-input v-model="formData.subtitle" :placeholder="t('projects.editor.lowerThird.subtitlePlaceholder')"
                    maxlength="40" show-word-limit />
            </div>

            <!-- Style Selector -->
            <div>
                <label class="block text-sm font-medium text-white/70 mb-3">
                    {{ t('projects.editor.lowerThird.style') }}
                </label>
                <div class="grid grid-cols-2 gap-3">
                    <div v-for="style in styles" :key="style.value"
                        class="relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden"
                        :class="formData.style === style.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'"
                        @click="formData.style = style.value as 'default' | 'minimal' | 'bold' | 'gradient'">
                        <div class="p-4">
                            <div class="text-sm font-bold text-white mb-1">{{ style.label }}</div>
                            <div class="text-xs text-white/50">{{ style.description }}</div>
                        </div>
                        <div v-if="formData.style === style.value" class="absolute top-2 right-2">
                            <div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check class="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Position Selector -->
            <div>
                <label class="block text-sm font-medium text-white/70 mb-3">
                    {{ t('projects.editor.lowerThird.position') }}
                </label>
                <div class="flex gap-2">
                    <button v-for="pos in positions" :key="pos.value"
                        class="flex-1 px-4 py-2 rounded-lg border transition-all text-sm font-medium"
                        :class="formData.position === pos.value ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-white/70 hover:border-white/20'"
                        @click="formData.position = pos.value as 'bottom-left' | 'bottom-center' | 'bottom-right'">
                        {{ pos.label }}
                    </button>
                </div>
            </div>

            <!-- Animation Selector -->
            <div>
                <label class="block text-sm font-medium text-white/70 mb-3">
                    {{ t('projects.editor.lowerThird.animation') }}
                </label>
                <div class="flex gap-2">
                    <button v-for="anim in animations" :key="anim.value"
                        class="flex-1 px-4 py-2 rounded-lg border transition-all text-sm font-medium"
                        :class="formData.animation === anim.value ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-white/70 hover:border-white/20'"
                        @click="formData.animation = anim.value as 'fade' | 'slide' | 'none'">
                        {{ anim.label }}
                    </button>
                </div>
            </div>

            <!-- Timing Controls -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-white/70 mb-2">
                        {{ t('projects.editor.lowerThird.startTime') }} (s)
                    </label>
                    <el-input-number v-model="formData.startTime" :min="0" :max="maxStartTime" :step="0.1"
                        :precision="1" class="w-full" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-white/70 mb-2">
                        {{ t('projects.editor.lowerThird.duration') }} (s)
                    </label>
                    <el-input-number v-model="formData.duration" :min="1" :max="30" :step="0.5" :precision="1"
                        class="w-full" />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
                <el-button type="primary" @click="handleSave" :disabled="!formData.text">
                    {{ t('common.save') }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Check } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()

interface LowerThirdData {
    id?: string
    text: string
    subtitle?: string
    startTime: number
    duration: number
    style: 'default' | 'minimal' | 'bold' | 'gradient'
    position: 'bottom-left' | 'bottom-center' | 'bottom-right'
    animation: 'fade' | 'slide' | 'none'
}

interface Props {
    modelValue: boolean
    lowerThird?: LowerThirdData
    maxStartTime?: number
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'save', data: LowerThirdData): void
}

const props = withDefaults(defineProps<Props>(), {
    maxStartTime: 60
})

const emit = defineEmits<Emits>()

const visible = ref(props.modelValue)
const isEdit = ref(false)

const formData = reactive<LowerThirdData>({
    text: '',
    subtitle: '',
    startTime: 0,
    duration: 5,
    style: 'default',
    position: 'bottom-left',
    animation: 'fade'
})

const styles = [
    { value: 'default', label: 'Default', description: 'Glassmorphic bar' },
    { value: 'minimal', label: 'Minimal', description: 'Text with shadow' },
    { value: 'bold', label: 'Bold', description: 'Solid color bar' },
    { value: 'gradient', label: 'Gradient', description: 'Gradient background' }
]

const positions = [
    { value: 'bottom-left', label: 'Left' },
    { value: 'bottom-center', label: 'Center' },
    { value: 'bottom-right', label: 'Right' }
]

const animations = [
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'none', label: 'None' }
]

watch(() => props.modelValue, (val) => {
    visible.value = val
    if (val && props.lowerThird) {
        isEdit.value = true
        Object.assign(formData, props.lowerThird)
    } else {
        isEdit.value = false
        formData.text = ''
        formData.subtitle = ''
        formData.startTime = 0
        formData.duration = 5
        formData.style = 'default'
        formData.position = 'bottom-left'
        formData.animation = 'fade'
    }
})

watch(visible, (val) => {
    emit('update:modelValue', val)
})

const handleClose = () => {
    visible.value = false
}

const handleSave = () => {
    emit('save', {
        ...formData,
        id: formData.id || `lt_${Date.now()}`
    })
    visible.value = false
}
</script>

<style scoped>
:deep(.el-dialog) {
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-dialog__header) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.el-dialog__footer) {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.el-input__inner) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
}

:deep(.el-input-number) {
    width: 100%;
}

:deep(.el-input-number .el-input__inner) {
    text-align: left;
}
</style>
