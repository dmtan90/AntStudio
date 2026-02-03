```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ChromePicker, tinycolor } from 'vue-color';
import { ColorFilter as Pipette, Time as History, ApplicationOne as Presets } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { darkHexCodes, lightHexCodes, pastelHexCodes } from 'video-editor/constants/editor';
import { cn } from '@/utils/ui';
import { useUIStore } from '@/stores/ui';

interface Props {
  modelValue: string;
  label?: string;
  showPresets?: boolean;
  showRecent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Color',
  showPresets: true,
  showRecent: true
});

const emit = defineEmits(['update:modelValue', 'change']);

const uiStore = useUIStore();
const localStorageKey = computed(() => `${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_recent_colors`);

const recentColors = ref<string[]>([]);
const activeTab = ref<'presets' | 'recent'>('presets');
const eyeDropperStatus = !!window.EyeDropper;

// Load recent colors from localStorage
onMounted(() => {
  const stored = localStorage.getItem(localStorageKey.value);
  if (stored) {
    try {
      recentColors.value = JSON.parse(stored);
    } catch (e) {
      recentColors.value = [];
    }
  }
});

const saveRecentColor = (color: string) => {
  if (!color || color === 'transparent') return;
  
  // Clean color to hex
  const hex = tinycolor(color).toHexString();
  
  const filtered = recentColors.value.filter(c => c.toLowerCase() !== hex.toLowerCase());
  recentColors.value = [hex, ...filtered].slice(0, 10); // Changed slice to 10
  localStorage.setItem(localStorageKey.value, JSON.stringify(recentColors.value));
};

const internalColor = computed({
  get: () => props.modelValue,
  set: (val: any) => {
    const hex = typeof val === 'string' ? val : tinycolor(val.hex || val).toHexString();
    emit('update:modelValue', hex);
    emit('change', hex);
  }
});

const handlePickerUpdate = (val: any) => {
  const hex = tinycolor(val.hex).toHexString();
  emit('update:modelValue', hex);
  emit('change', hex);
};

const selectColor = (hex: string) => {
  internalColor.value = hex;
  saveRecentColor(hex);
};

const openEyeDropper = async () => {
  if (!eyeDropperStatus) return;
  try {
    // @ts-ignore
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();
    selectColor(result.sRGBHex);
  } catch (e) {
    console.error('Eyedropper failed:', e);
  }
};

const allPresets = [
  { name: 'Light', colors: lightHexCodes },
  { name: 'Dark', colors: darkHexCodes },
  { name: 'Pastel', colors: pastelHexCodes }
];

</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Main Picker -->
    <div class="rounded-2xl overflow-hidden border border-white/10 dark-picker-override shadow-2xl bg-black/20">
      <ChromePicker 
        :model-value="internalColor" 
        @update:model-value="handlePickerUpdate"
        class="!w-full !shadow-none !bg-transparent" 
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button 
        v-if="eyeDropperStatus" 
        class="flex-1 flex items-center justify-center gap-2.5 h-10 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/20 hover:text-brand-primary active:scale-95 transition-all text-white/40 shadow-sm group" 
        @click="openEyeDropper"
      >
        <Pipette :size="16" class="group-hover:rotate-12 transition-transform" />
        <span class="text-[10px] font-bold uppercase tracking-widest">Eyedropper</span>
      </button>
    </div>

    <!-- Tabs for Presets/Recent -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between px-1">
        <div class="flex gap-4">
          <button 
            @click="activeTab = 'presets'"
            :class="cn('text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2', activeTab === 'presets' ? 'text-brand-primary' : 'text-white/20 hover:text-white/40')"
          >
            <Presets :size="12" />
            Presets
          </button>
          <button 
            v-if="showRecent"
            @click="activeTab = 'recent'"
            :class="cn('text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2', activeTab === 'recent' ? 'text-brand-primary' : 'text-white/20 hover:text-white/40')"
          >
            <History :size="12" />
            Recent
          </button>
        </div>
      </div>

      <!-- Presets View -->
      <div v-if="activeTab === 'presets'" class="flex flex-col gap-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        <div v-for="group in allPresets" :key="group.name" class="flex flex-col gap-3">
          <span class="text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">{{ group.name }}</span>
          <div class="grid grid-cols-8 gap-2">
            <button
              v-for="code in group.colors"
              :key="code"
              @click="selectColor(code)"
              class="w-full aspect-square rounded-lg border border-white/5 transition-all hover:scale-125 hover:z-10 hover:shadow-xl hover:border-white/20"
              :style="{ backgroundColor: code }"
            />
          </div>
        </div>
      </div>

      <!-- Recent View -->
      <div v-else-if="activeTab === 'recent'" class="flex flex-col gap-3 min-h-[100px]">
        <div v-if="recentColors.length > 0" class="grid grid-cols-8 gap-2">
          <button
            v-for="code in recentColors"
            :key="code"
            @click="selectColor(code)"
            class="w-full aspect-square rounded-lg border border-white/5 transition-all hover:scale-125 hover:z-10 hover:shadow-xl hover:border-white/20"
            :style="{ backgroundColor: code }"
          />
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center gap-2 py-8 opacity-20">
          <History :size="24" />
          <span class="text-[8px] font-bold uppercase tracking-widest">No recent colors</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark-picker-override :deep(.vc-chrome) {
    background: transparent !important;
    box-shadow: none !important;
}

.dark-picker-override :deep(.vc-chrome-body) {
    background: transparent !important;
    padding: 16px 0 !important;
}

.dark-picker-override :deep(.vc-chrome-fields-wrap) {
    padding-top: 12px !important;
}

.dark-picker-override :deep(.vc-input__input) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    color: white !important;
    box-shadow: none !important;
    height: 28px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 10px !important;
    text-align: center !important;
}

.dark-picker-override :deep(.vc-input__label) {
    color: rgba(255, 255, 255, 0.2) !important;
    font-size: 8px !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    margin-top: 6px !important;
    letter-spacing: 0.1em !important;
}

.dark-picker-override :deep(.vc-chrome-alpha-wrap),
.dark-picker-override :deep(.vc-chrome-hue-wrap) {
    height: 12px !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.dark-picker-override :deep(.vc-chrome-color-wrap) {
    width: 36px !important;
    height: 36px !important;
}

.dark-picker-override :deep(.vc-chrome-active-color) {
    border-radius: 10px !important;
    border: 2px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
}

.dark-picker-override :deep(.vc-chrome-toggle-btn) {
  display: none !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
