<template>
  <div class="flow-interface-v2">
    <div class="input-container-glass">
      <!-- Toolbar -->
      <div class="input-toolbar">
        <div class="toolbar-left">
          <GDropdown placement="bottom-start">
            <div class="tool-badge">
              <component :is="activeRatioIcon" theme="outline" size="14" />
              <span>{{ form.aspectRatio }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="form.aspectRatio === '16:9'" @click="handleRatioChange('16:9')">16:9 {{
                  t('projects.new.flow.landscape') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '9:16'" @click="handleRatioChange('9:16')">9:16 {{
                  t('projects.new.flow.portrait') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '1:1'" @click="handleRatioChange('1:1')">1:1 {{
                  t('projects.new.flow.square') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '4:3'" @click="handleRatioChange('4:3')">4:3 {{
                  t('projects.new.flow.classic') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </GDropdown>

          <GDropdown placement="bottom-start">
            <div class="tool-badge">
              <magic-wand theme="outline" size="14" />
              <span>{{ t('projects.new.flow.' + form.videoStyle.toLowerCase().replace(' ', '')) }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="form.videoStyle === 'Cinematic'"
                  @click="handleStyleChange('Cinematic')">{{ t('projects.new.flow.cinematic') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === 'Realistic'"
                  @click="handleStyleChange('Realistic')">{{ t('projects.new.flow.realistic') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === 'Anime'"
                  @click="handleStyleChange('Anime')">{{ t('projects.new.flow.anime') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === '3D Render'" @click="handleStyleChange('3D Render')">{{ t('projects.new.flow.threeDRender') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </GDropdown>

          <GPopover placement="top" width="240px">
            <template #reference>
              <div class="tool-badge">
                <time-icon theme="outline" size="14" />
                <span>{{ formatDuration(form.targetDuration) }}</span>
              </div>
            </template>
            <div class="tuning-panel">
              <label>{{ t('projects.new.flow.targetDuration') }}</label>
              <GSlider v-model="form.targetDuration" :min="15" :max="7200" :step="5" />
              <div class="slider-val">{{ formatDuration(form.targetDuration) }}</div>
            </div>
          </GPopover>
        </div>
        <div class="toolbar-right">
          <button class="reset-btn-tool" @click="$emit('reset-flow')" :title="t('projects.new.flow.resetTitle')">
            <refresh theme="outline" size="12" />
            <span>{{ t('projects.new.flow.resetFlow') }}</span>
          </button>
        </div>
      </div>

      <!-- Prompt -->
      <div class="prompt-body">
        <textarea :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          :placeholder="t('projects.new.topicPlaceholder')" @keydown="handleKeydown" ref="inputRef"
          class="chat-input"></textarea>
      </div>

      <!-- Actions -->
      <div class="input-footer">
        <div class="footer-left">
          <div class="attach-trigger" @click="triggerFileUpload" :title="t('projects.new.flow.attachFiles')">
            <paperclip theme="outline" size="20" />
            <input type="file" ref="fileInput" style="display: none" multiple
              @change="$emit('on-file-selected', $event)" />
          </div>
          <div class="selected-files-list">
            <div v-for="(file, idx) in selectedFiles" :key="idx" class="mini-file-tag">
              <file-text theme="outline" size="12" />
              <span>{{ file.name }}</span>
              <close-small theme="outline" size="14" @click="$emit('remove-file', idx)" />
            </div>
          </div>
        </div>
        <div class="footer-right">
          <button v-if="loading" class="send-circle cancel-mode" @click="$emit('cancel-analysis')">
            <close-small theme="outline" size="20" />
          </button>
          <button v-else class="send-circle" :disabled="!modelValue.trim() && !selectedFiles.length"
            @click="$emit('start-analysis')">
            <arrow-right theme="outline" size="20" />
          </button>
        </div>
      </div>

      <!-- Suggestions -->
      <div v-if="!hasResults && !loading" class="quick-suggestions animate-up">
        <button v-for="sug in quickSuggestions" :key="sug" @click="$emit('apply-suggestion', sug)" class="sug-chip">{{
          sug
        }}</button>
      </div>

      <!-- Mentions -->
      <div v-if="showMentions" class="mention-list-glass">
        <div class="mention-header">{{ t('projects.new.flow.mentionHeader') }}</div>
        <div v-for="file in selectedFiles" :key="file.name" @click="$emit('insert-mention', file.name)"
          class="mention-item">
          <file-text theme="outline" size="14" />
          <span>{{ file.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Monitor, Iphone, Square, Tv, MagicWand, Time as TimeIcon,
  Paperclip, ArrowRight, FileText, CloseSmall, Refresh
} from '@icon-park/vue-next'
import GDropdown from '@/components/ui/GDropdown.vue'
import GPopover from '@/components/ui/GPopover.vue'
import GSlider from '@/components/ui/GSlider.vue'
import ProjectCreationOptions from './ProjectCreationOptions.vue'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
  selectedFiles: File[]
  loading: boolean
  form: any
  quickSuggestions: string[]
  hasResults: boolean
  showMentions: boolean
}>()

const emit = defineEmits([
  'update:modelValue', 'handle-enter', 'on-file-selected',
  'remove-file', 'start-analysis', 'cancel-analysis',
  'reset-flow', 'apply-suggestion', 'insert-mention'
])

const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileUpload = () => fileInput.value?.click()

const activeRatioIcon = computed(() => {
  switch (props.form.aspectRatio) {
    case '9:16': return Iphone
    case '1:1': return Square
    case '4:3': return Tv
    default: return Monitor
  }
})

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const handleStyleChange = (val: string) => { props.form.videoStyle = val }
const handleRatioChange = (val: string) => { props.form.aspectRatio = val }

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
  inputRef
})

watch(() => props.modelValue, () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 200) + 'px'
  }
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('handle-enter', e)
  }
}
</script>

<style lang="scss" scoped>
.flow-interface-v2 {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  z-index: 100;
  animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.input-container-glass {
  width: 100%;
  max-width: 860px;
  background: rgba(14, 14, 14, 0.6);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 32px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 
    0 30px 60px rgba(0, 0, 0, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  position: relative;
  transition: all 0.3s ease;

  &:focus-within {
    background: rgba(14, 14, 14, 0.8);
    box-shadow: 
      0 40px 80px rgba(0, 0, 0, 0.9),
      inset 0 0 0 1px rgba(59, 130, 246, 0.2);
  }
}

.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tool-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
  }
}

.prompt-body {
  padding: 12px 12px 4px;

  textarea {
    width: 100%;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.6;
    resize: none;
    outline: none;
    min-height: 40px;
    max-height: 200px;
    font-family: inherit;

    &::placeholder {
      color: rgba(255, 255, 255, 0.2);
      font-weight: 400;
    }
  }
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;

  .footer-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .attach-trigger {
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;

      &:hover {
        color: #fff;
        transform: scale(1.1);
      }
    }
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .send-circle {
      width: 44px;
      height: 44px;
      background: #fff;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);

      &:hover:not(:disabled) {
        transform: scale(1.1) rotate(-10deg);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
      }

      &:disabled {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.1);
        cursor: not-allowed;
        box-shadow: none;
      }

      &.cancel-mode {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;

        &:hover {
          background: #ef4444;
          color: #fff;
        }
      }
    }
  }
}

.tuning-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  label {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
    display: block;
  }

  .slider-val {
    font-size: 14px;
    font-weight: 900;
    color: #fff;
    text-align: right;
    margin-top: 4px;
  }
}

.quick-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 12px 12px;
  justify-content: flex-start;

  .sug-chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px;
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
      transform: translateY(-1px);
    }
  }
}

.mention-list-glass {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  width: 240px;
  background: rgba(14, 14, 14, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .mention-header {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    padding: 8px 12px;
    letter-spacing: 0.1em;
  }

  .mention-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
  }
}

.selected-files-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  max-width: 400px;
  padding: 4px 0;

  &::-webkit-scrollbar { display: none; }
}

.mini-file-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;

  i {
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    &:hover { opacity: 1; color: #ef4444; }
  }
}

@keyframes slideInUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.reset-btn-tool {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 100px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    transform: translateY(-1px);
  }
}
</style>
