<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.2s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandStoryboard = !msg.expandStoryboard">
      <div class="bar-content">
        <movie-board theme="outline" size="18"/>
        <span>{{ t('projects.new.results.storyboard.summaryBar') }} <span class="status-updated">{{ t('projects.new.results.storyboard.isUpdated') }}</span></span>
        <span class="segment-count">{{ (msg.result.cumulative?.storyboard || msg.result.storyboard || []).length }} SEGMENTS</span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandStoryboard ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div v-if="msg.expandStoryboard" class="storyboard-content-wrapper">
      <div class="storyboard-details-expanded">
        <div 
          v-for="seg in (msg.result.cumulative?.storyboard || msg.result.storyboard)" 
          :key="seg.order" 
          class="segment-card"
          :class="{ 'is-editing': editingIndex === seg.order }"
          @mouseup="$emit('text-selection', $event, `Segment #${seg.order}`)"
        >
          <!-- Segment Header -->
          <div class="seg-header">
            <div class="seg-order">#{{ seg.order }}</div>
            <div class="seg-actions">
              <button class="action-btn edit-btn" :title="'Edit segment'" @click.stop="startEdit(seg)">
                <edit theme="outline" size="12" />
              </button>
              <button 
                class="action-btn respin-btn" 
                :title="'Re-spin this segment'"
                :disabled="respinning === seg.order"
                @click.stop="$emit('respin', seg)"
              >
                <loading-three theme="outline" size="12" :class="{ 'spin': respinning === seg.order }"/>
              </button>
            </div>
          </div>

          <!-- Display Mode -->
          <div v-if="editingIndex !== seg.order" class="seg-info">
            <h4>{{ seg.title }}</h4>
            <p>{{ seg.description }}</p>
            <div class="seg-meta">
              <GTag size="sm" class="max-w-[90px] overflow-hidden justify-start">
                <el-text truncate line-clamp="2" class="text-inherit">{{ seg.cameraAngle || seg.cameraDetails?.framing }}</el-text>
              </GTag>
              <span>{{ seg.duration }}s</span>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="seg-edit-form">
            <div class="form-field">
              <label>Title</label>
              <input v-model="editBuffer.title" class="seg-input" />
            </div>
            <div class="form-field">
              <label>Description</label>
              <textarea v-model="editBuffer.description" class="seg-textarea" rows="3"></textarea>
            </div>
            <div class="form-field-row">
              <div class="form-field">
                <label>Duration (s)</label>
                <input v-model.number="editBuffer.duration" type="number" class="seg-input" />
              </div>
            </div>
            <div class="edit-actions">
              <button class="save-btn" @click.stop="saveEdit(seg)">Save</button>
              <button class="cancel-btn" @click.stop="editingIndex = null">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!approved" class="stage-navigation">
        <p class="stage-hint">{{ t('projects.new.results.storyboard.hint') || 'Review the storyboard segments above. You can edit or re-spin individual segments before approving.' }}</p>
        <button
          class="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-primary text-black font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group"
          @click.stop="$emit('approve')">
          <magic-wand theme="outline" size="20" class="group-hover:rotate-12 transition-transform" />
          {{ t('projects.new.results.storyboard.approveBtn') || 'Approve & Create Project' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { MovieBoard, ArrowRight, MagicWand, Edit, LoadingThree } from '@icon-park/vue-next';
import GTag from '@/components/ui/GTag.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  msg: any;
  approved?: boolean;
  respinning?: number | null;
}>();

const emit = defineEmits(['text-selection', 'approve', 'respin', 'segment-update']);

const editingIndex = ref<number | null>(null);
const editBuffer = reactive({ title: '', description: '', duration: 5 });

function startEdit(seg: any) {
  editingIndex.value = seg.order;
  editBuffer.title = seg.title;
  editBuffer.description = seg.description;
  editBuffer.duration = seg.duration;
}

function saveEdit(seg: any) {
  emit('segment-update', {
    ...seg,
    title: editBuffer.title,
    description: editBuffer.description,
    duration: editBuffer.duration
  });
  editingIndex.value = null;
}
</script>

<style lang="scss" scoped>
.storyboard-collapsible {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 8px;

  &:hover { 
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.storyboard-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;

  .bar-content {
    display: flex;
    align-items: center;
    gap: 16px;
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;

    i { color: #3b82f6; }
    .status-updated { color: rgba(255, 255, 255, 0.4); font-weight: 600; font-size: 13px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .segment-count { font-size: 11px; font-weight: 900; color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 3px 8px; border-radius: 6px; }
  }

  .collapsible-icon {
    color: rgba(255, 255, 255, 0.2); 
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    &.expanded { transform: rotate(90deg); color: #fff; }
  }
}

.storyboard-details-expanded {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  
  .segment-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);

      .seg-actions { opacity: 1; }
    }

    &.is-editing {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, 0.05);
    }
    
    .seg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .seg-order { font-size: 11px; font-weight: 900; color: rgba(255, 255, 255, 0.2); text-transform: uppercase; letter-spacing: 0.1em; }

    .seg-actions {
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &.edit-btn {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.6);
        &:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
      }

      &.respin-btn {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
        &:hover { background: rgba(59, 130, 246, 0.25); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
      }
    }

    .seg-info {
      h4 { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 6px; letter-spacing: -0.01em; }
      p { font-size: 12px; color: rgba(255, 255, 255, 0.5); line-height: 1.6; }
      .seg-meta { 
        margin-top: 12px; 
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex; 
        gap: 12px; 
        align-items: center; 
        font-size: 12px;
        font-weight: 700;
        span { color: #fff; }
      }
    }

    .seg-edit-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;

      label {
        font-size: 10px;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .form-field-row {
      display: flex;
      gap: 10px;
      .form-field { flex: 1; }
    }

    .seg-input, .seg-textarea {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 10px;
      color: #fff;
      font-size: 13px;
      width: 100%;
      resize: vertical;
      font-family: inherit;

      &:focus { outline: none; border-color: rgba(59, 130, 246, 0.5); }
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      padding-top: 4px;

      button {
        flex: 1;
        padding: 8px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
        transition: all 0.2s;
      }

      .save-btn {
        background: #3b82f6;
        color: #fff;
        &:hover { background: #2563eb; }
      }

      .cancel-btn {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);
        &:hover { background: rgba(255, 255, 255, 0.1); }
      }
    }
  }
}

.storyboard-content-wrapper {
  display: flex;
  flex-direction: column;
}

.stage-navigation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px 0;
  margin: 0 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .stage-hint {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
    text-align: center;
    max-width: 400px;
    line-height: 1.6;
  }
}

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
