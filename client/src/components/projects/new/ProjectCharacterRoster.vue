<template>
  <div class="character-roster animate-up">
    <div class="roster-header">
      <div class="title-wrap">
        <h3 class="title">{{ $t('projects.new.characterRoster') }}</h3>
        <p class="subtitle">{{ $t('projects.new.characterRosterDesc') }}</p>
      </div>
      <el-button type="primary" round @click="$emit('approve')" :loading="loading">
        {{ $t('projects.new.lockAndContinue') }}
      </el-button>
    </div>

    <div class="roster-grid">
      <div v-for="char in characters" :key="char.char_id" class="character-card">
        <div class="card-glow"></div>
        <div class="char-header">
          <div class="avatar-stub">
            <span class="initial">{{ char.name.charAt(0) }}</span>
          </div>
          <div class="char-meta">
            <span class="char-id">#{{ char.char_id }}</span>
            <h4 class="char-name">{{ char.name }}</h4>
          </div>
        </div>

        <div class="char-body">
          <div class="trait-row">
            <span class="label">SPECIES:</span>
            <span class="value">{{ char.species }}</span>
          </div>
          <div class="trait-row">
            <span class="label">BUILD:</span>
            <span class="value">{{ char.body_build }}</span>
          </div>
          <div class="trait-row">
            <span class="label">HAIR:</span>
            <span class="value">{{ char.hair }}</span>
          </div>
          <div class="trait-row">
            <span class="label">OUTFIT:</span>
            <span class="value">{{ char.outfit_top }}, {{ char.outfit_bottom }}</span>
          </div>
          
          <div class="char-description">
            {{ char.description }}
          </div>
        </div>

        <div class="char-footer">
          <div class="voice-badge">
            <el-icon><Microphone /></el-icon>
            {{ char.tts_config.voice_id }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Microphone } from '@element-plus/icons-vue';

defineProps<{
  characters: any[];
  loading?: boolean;
}>();

defineEmits(['approve']);
</script>

<style scoped lang="scss">
.character-roster {
  margin-top: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 2rem;
  padding: 2rem;
  backdrop-filter: blur(20px);
}

.roster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  .title {
    font-size: 1.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    margin: 0;
    color: #fff;
  }

  .subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0.2rem 0 0;
  }
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.character-card {
  position: relative;
  background: rgba(10, 10, 10, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    transform: translateY(-5px);
    .card-glow { opacity: 0.1; }
  }

  .card-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at top right, var(--el-color-primary), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.char-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.avatar-stub {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #333, #111);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--el-color-primary);
}

.char-meta {
  display: flex;
  flex-direction: column;

  .char-id {
    font-size: 0.7rem;
    font-family: 'Fira Code', monospace;
    color: var(--el-color-primary);
    opacity: 0.8;
  }

  .char-name {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
    color: #fff;
  }
}

.char-body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.trait-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;

  .label {
    font-weight: 900;
    color: rgba(255, 255, 255, 0.3);
  }

  .value {
    color: #fff;
    font-weight: 600;
  }
}

.char-description {
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 0.8rem;
}

.char-footer {
  display: flex;
  justify-content: flex-end;
}

.voice-badge {
  background: rgba(var(--el-color-primary-rgb), 0.1);
  color: var(--el-color-primary);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.4rem 0.8rem;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
