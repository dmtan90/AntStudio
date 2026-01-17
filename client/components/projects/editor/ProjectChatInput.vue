<template>
  <div class="flow-interface-v2">
    <div class="input-container-glass">
      <!-- Toolbar -->
      <!-- <div class="input-toolbar"> -->
        <!-- <div class="toolbar-left"> -->
          <!-- <GDropdown placement="bottom-start">
            <div class="tool-badge">
              <component :is="activeRatioIcon" theme="outline" size="14" />
              <span>{{ form.aspectRatio }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="form.aspectRatio === '16:9'" @click="handleRatioChange('16:9')">16:9 {{ t('projects.new.flow.landscape') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '9:16'" @click="handleRatioChange('9:16')">9:16 {{ t('projects.new.flow.portrait') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '1:1'" @click="handleRatioChange('1:1')">1:1 {{ t('projects.new.flow.square') }}</el-dropdown-item>
                <el-dropdown-item :disabled="form.aspectRatio === '4:3'" @click="handleRatioChange('4:3')">4:3 {{ t('projects.new.flow.classic') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </GDropdown>

          <GDropdown placement="bottom-start">
            <div class="tool-badge">
              <magic-wand theme="outline" size="14" />
              <span>{{ form.videoStyle }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="form.videoStyle === 'Cinematic'" @click="handleStyleChange('Cinematic')">Cinematic</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === 'Realistic'" @click="handleStyleChange('Realistic')">Realistic</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === 'Anime'" @click="handleStyleChange('Anime')">Anime</el-dropdown-item>
                <el-dropdown-item :disabled="form.videoStyle === '3D Render'" @click="handleStyleChange('3D Render')">3D Render</el-dropdown-item>
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
              <label>Target Duration</label>
              <GSlider v-model="form.targetDuration" :min="15" :max="7200" />
              <div class="slider-val">{{ formatDuration(form.targetDuration) }}</div>
            </div>
          </GPopover> -->
        <!-- </div> -->
        <!-- <div class="toolbar-right"> -->
          <!-- <button class="reset-btn-tool" @click="$emit('reset-flow')" title="Reset Project & Clear Memory">
            <refresh theme="outline" size="12" />
            <span>Reset Flow</span>
          </button> -->
        <!-- </div> -->
      <!-- </div> -->

      <!-- Prompt -->
      <div class="prompt-body">
        <textarea 
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          :placeholder="t('projects.new.topicPlaceholder')" 
          @keydown="handleKeydown" 
          ref="inputRef"
          class="chat-input"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="input-footer">
        <div class="footer-left">
          <div class="attach-trigger" @click="triggerFileUpload" :title="t('projects.editor.chat.attachFiles')">
            <paperclip theme="outline" size="20" />
            <input type="file" ref="fileInput" style="display: none" multiple @change="$emit('on-file-selected', $event)" />
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
          <button v-else class="send-circle" :disabled="!modelValue.trim() && !selectedFiles.length" @click="$emit('start-analysis')">
            <arrow-right theme="outline" size="20" />
          </button>
        </div>
      </div>

      <!-- Suggestions -->
      <div v-if="!hasResults && !loading" class="quick-suggestions animate-up">
        <button v-for="sug in quickSuggestions" :key="sug" @click="$emit('apply-suggestion', sug)" class="sug-chip">{{ sug }}</button>
      </div>
      
      <!-- Mentions -->
      <div v-if="showMentions" class="mention-list-glass">
        <div class="mention-header">{{ t('projects.editor.chat.mentionFiles') }}</div>
        <div v-for="file in selectedFiles" :key="file.name" @click="$emit('insert-mention', file.name)" class="mention-item">
          <file-text theme="outline" size="14" />
          <span>{{ file.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Monitor, Iphone, Square, Tv, MagicWand, Time as TimeIcon,
  Paperclip, ArrowRight, FileText, CloseSmall, Refresh
} from '@icon-park/vue-next'
import GDropdown from '~/components/ui/GDropdown.vue'
import GPopover from '~/components/ui/GPopover.vue'
import GSlider from '~/components/ui/GSlider.vue'

const { t } = useTranslations()

const props = withDefaults(defineProps<{
  modelValue: string
  selectedFiles?: File[]
  loading: boolean
  form?: any
  quickSuggestions?: string[]
  hasResults?: boolean
  showMentions?: boolean
}>(), {
  selectedFiles: () => [],
  quickSuggestions: () => [],
  hasResults: false,
  showMentions: false
})

const emit = defineEmits([
  'update:modelValue', 'handle-enter', 'on-file-selected', 
  'remove-file', 'start-analysis', 'cancel-analysis', 
  'reset-flow', 'apply-suggestion', 'insert-mention'
])

const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileUpload = () => fileInput.value?.click()

const activeRatioIcon = computed(() => {
  if (!props.form) return Monitor
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

const handleStyleChange = (val: string) => { if (props.form) props.form.videoStyle = val }
const handleRatioChange = (val: string) => { if (props.form) props.form.aspectRatio = val }

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
  position: relative; top: 0px; left: 0; right: 0;
  display: flex; justify-content: center; padding: 0px; z-index: 100;
}

.input-container-glass {
  width: 100%; max-width: 800px; @include glass-card;
  background: rgba(15, 15, 15, 0.85); border-radius: 28px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.1); position: relative;
}

.input-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 12px; }
  .tool-badge {
    display: flex; align-items: center; gap: 8px; padding: 6px 14px;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px; font-size: 12px; font-weight: 500; color: #fff;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
  }
}

.prompt-body {
  padding: 4px 8px;
  textarea {
    width: 100%; background: transparent; border: none; color: #fff;
    font-size: 16px; line-height: 1.5; resize: none; outline: none;
    min-height: 50px; /* Equivalent to roughly 2-3 rows */
    max-height: 150px; /* Equivalent to roughly 6-7 rows */
    &::placeholder { color: rgba(255, 255, 255, 0.2); }
  }
}

.input-footer {
  display: flex; justify-content: space-between; align-items: center; padding: 4px;
  .footer-left {
    display: flex; align-items: center; gap: 12px;
    .attach-trigger { color: $text-muted; cursor: pointer; &:hover { color: #fff; } }
  }
  .footer-right {
    display: flex; align-items: center; gap: 16px;
    .send-circle {
      width: 40px; height: 40px; background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; color: #fff;
      cursor: pointer; transition: all 0.3s;
      &:hover:not(:disabled) { background: #fff; color: #000; transform: scale(1.05); }
      &:disabled { opacity: 0.2; cursor: not-allowed; }
      &.cancel-mode {
        background: rgba(255, 77, 79, 0.1); border-color: rgba(255, 77, 79, 0.3);
        color: #ff4d4f; &:hover { background: #ff4d4f; color: #fff; }
      }
    }
  }
}

.tuning-panel {
  padding: 16px; display: flex; flex-direction: column; gap: 16px;
  label { font-size: 12px; color: $text-muted; margin-bottom: 6px; display: block; }
  .slider-val { font-size: 12px; color: #fff; text-align: right; margin-top: 4px; }
}

.quick-suggestions {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
  padding: 0 16px 12px; justify-content: flex-start;
  .sug-chip {
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px; padding: 6px 14px; font-size: 11px; color: rgba(255, 255, 255, 0.5);
    cursor: pointer; transition: all 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); color: #fff; }
  }
}

.mention-list-glass {
  position: absolute; top: 45px; left: 16px; width: 200px; @include glass-card;
  background: rgba(10, 10, 10, 0.98); border-radius: 12px; padding: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; gap: 4px;
  z-index: 1000; border: 1px solid rgba(255, 255, 255, 0.15);
  .mention-header { font-size: 10px; text-transform: uppercase; color: rgba(255, 255, 255, 0.3); padding: 4px 12px; letter-spacing: 1px; }
  .mention-item {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border-radius: 6px; cursor: pointer; color: rgba(255, 255, 255, 0.7); font-size: 12px;
    transition: all 0.2s; &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
}

.selected-files-list { display: flex; gap: 8px; overflow-x: auto; max-width: 400px; &::-webkit-scrollbar { display: none; } }
.mini-file-tag {
  display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #fff;
  i { cursor: pointer; &:hover { color: #ff4d4f; } }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.reset-btn-tool {
  background: rgba(255, 50, 50, 0.1); border: 1px solid rgba(255, 0, 0, 0.2);
  border-radius: 100px; padding: 4px 10px; display: flex; align-items: center; gap: 6px;
  color: #ff6b6b; font-size: 11px; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(255, 50, 50, 0.2); border-color: rgba(255, 0, 0, 0.4); transform: translateY(-1px); }
}
</style>
