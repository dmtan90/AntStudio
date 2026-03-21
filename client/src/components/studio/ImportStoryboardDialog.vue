<template>
  <div v-if="visible" class="import-overlay" @click.self="$emit('close')">
    <div class="import-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-title">
          <div class="icon">🎬</div>
          <div>
            <h2>IMPORT FROM PROJECT</h2>
            <p>Select a completed project to load its storyboard as a live script.</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Project List -->
      <div class="project-list" v-if="!converting">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading projects...</span>
        </div>
        <div v-else-if="projects.length === 0" class="empty-state">
          No completed projects with storyboards found.
        </div>
        <div 
          v-else
          v-for="proj in projects"
          :key="proj._id"
          class="project-item"
          :class="{ selected: selectedId === proj._id }"
          @click="selectedId = proj._id"
        >
          <div class="proj-thumb">
            <img v-if="proj.thumbnail" :src="proj.thumbnail" alt="thumbnail" />
            <div v-else class="thumb-placeholder">{{ proj.title?.charAt(0) }}</div>
          </div>
          <div class="proj-info">
            <div class="proj-title">{{ proj.title }}</div>
            <div class="proj-meta">
              <span>{{ proj.storyboard?.length || 0 }} segments</span>
              <span>·</span>
              <span>{{ proj.videoStyle || 'Cinematic' }}</span>
            </div>
          </div>
          <div class="proj-check" v-if="selectedId === proj._id">✓</div>
        </div>
      </div>

      <!-- Converting State -->
      <div v-if="converting" class="converting-state">
        <div class="spinner large"></div>
        <p>Converting storyboard to live script...</p>
        <p class="sub">The AI is mapping each scene to a live action.</p>
      </div>

      <!-- Footer -->
      <div class="dialog-footer" v-if="!converting">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button class="import-btn" :disabled="!selectedId" @click="doImport">
          🎬 Import & Load Script
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import api from '@/utils/api';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(['close', 'script-loaded']);

const projects = ref<any[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(false);
const converting = ref(false);

watch(() => props.visible, async (v) => {
  if (!v) return;
  loading.value = true;
  selectedId.value = null;
  try {
    const res: any = await api.get('/projects?limit=20&hasStoryboard=true');
    // Filter to only those with a storyboard
    projects.value = (res?.data?.data || res?.data?.projects || []).filter((p: any) => p.storyboard?.length > 0);
  } catch {
    projects.value = [];
  } finally {
    loading.value = false;
  }
}, { immediate: false });

async function doImport() {
  if (!selectedId.value) return;
  converting.value = true;
  try {
    const res: any = await api.post(`/projects/${selectedId.value}/convert-to-script`);
    if (res?.data?.success) {
      emit('script-loaded', res.data.data.script);
      emit('close');
    }
  } catch (err) {
    console.error('[ImportStoryboard] Conversion failed:', err);
  } finally {
    converting.value = false;
  }
}
</script>

<style scoped lang="scss">
.import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-dialog {
  width: 560px;
  max-height: 80vh;
  background: #0a0f1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.8);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);

  .header-title {
    display: flex;
    gap: 1rem;
    align-items: center;

    .icon {
      font-size: 2rem;
      width: 48px;
      height: 48px;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    h2 {
      font-size: 0.9rem;
      font-weight: 900;
      color: #fff;
      margin: 0 0 4px;
      letter-spacing: 0.04em;
    }

    p {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.4);
      margin: 0;
    }
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: rgba(255, 255, 255, 0.5);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
  }
}

.project-list {
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;

  .loading-state, .empty-state, .converting-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
  }

  .project-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); }
    &.selected { border-color: rgba(59, 130, 246, 0.5); background: rgba(59, 130, 246, 0.08); }

    .proj-thumb {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
      .thumb-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        font-weight: 900;
        color: #fff;
      }
    }

    .proj-info {
      flex: 1;
      .proj-title { font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
      .proj-meta { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); display: flex; gap: 6px; }
    }

    .proj-check {
      font-size: 0.9rem;
      color: #3b82f6;
      font-weight: 900;
    }
  }
}

.converting-state {
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  p { color: rgba(255, 255, 255, 0.8); font-size: 0.9rem; margin: 0; }
  .sub { color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; }
}

.dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;

  button {
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.6);
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }

  .import-btn {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: #fff;
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    &:not(:disabled):hover { transform: scale(1.03); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
  }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  &.large { width: 36px; height: 36px; border-width: 3px; }
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
