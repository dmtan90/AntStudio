<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyboardShortcuts, type KeyboardShortcut } from 'video-editor/composables/useKeyboardShortcuts';
import { ElDialog, ElInput, ElSwitch, ElButton, ElTabs, ElTabPane } from 'element-plus';
import { Keyboard, Close, Refresh, Search } from '@icon-park/vue-next';

const { shortcuts, showShortcutsPanel, updateShortcut, toggleShortcut, resetToDefaults } = useKeyboardShortcuts();
const { t } = useI18n();

const searchQuery = ref('');
const editingShortcut = ref<string | null>(null);
const recordingKeys = ref<string[]>([]);

const categories = computed(() => {
    const cats = new Set(shortcuts.value.map(s => s.category));
    return Array.from(cats);
});

const filteredShortcuts = computed(() => {
    if (!searchQuery.value) return shortcuts.value;
    const query = searchQuery.value.toLowerCase();
    return shortcuts.value.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.keys.join('+').toLowerCase().includes(query)
    );
});

const shortcutsByCategory = computed(() => {
    const result: Record<string, KeyboardShortcut[]> = {};
    categories.value.forEach(cat => {
        result[cat] = filteredShortcuts.value.filter(s => s.category === cat);
    });
    return result;
});

const formatKeys = (keys: string[]) => {
    return keys.map(k => {
        const keyMap: Record<string, string> = {
            'ctrl': '⌘',
            'shift': '⇧',
            'alt': '⌥',
            'arrowleft': '←',
            'arrowright': '→',
            'arrowup': '↑',
            'arrowdown': '↓',
            'space': 'Space',
            'delete': 'Del',
            'home': 'Home',
            'end': 'End'
        };
        return keyMap[k.toLowerCase()] || k.toUpperCase();
    }).join(' + ');
};

const startRecording = (id: string) => {
    editingShortcut.value = id;
    recordingKeys.value = [];
};

const handleKeyRecord = (e: KeyboardEvent) => {
    if (!editingShortcut.value) return;

    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');

    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        keys.push(key);
    }

    if (keys.length > 0 && !keys.every(k => ['ctrl', 'shift', 'alt'].includes(k))) {
        recordingKeys.value = keys;
    }
};

const saveRecording = () => {
    if (editingShortcut.value && recordingKeys.value.length > 0) {
        updateShortcut(editingShortcut.value, recordingKeys.value);
        editingShortcut.value = null;
        recordingKeys.value = [];
    }
};

const cancelRecording = () => {
    editingShortcut.value = null;
    recordingKeys.value = [];
};

const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
        'playback': t('videoEditor.shortcuts.categories.playback'),
        'editing': t('videoEditor.shortcuts.categories.editing'),
        'timeline': t('videoEditor.shortcuts.categories.timeline'),
        'selection': t('videoEditor.shortcuts.categories.selection'),
        'effects': t('videoEditor.shortcuts.categories.effects'),
        'general': t('videoEditor.shortcuts.categories.general')
    };
    return labels[cat] || cat;
};
</script>

<template>
    <el-dialog v-model="showShortcutsPanel" title="" :width="800" class="shortcuts-dialog" @keydown="handleKeyRecord">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                    <Keyboard theme="filled" size="20" class="text-brand-primary" />
                </div>
                <div>
                    <h2 class="text-lg font-black text-white uppercase tracking-wider">{{ t('videoEditor.shortcuts.title') }}</h2>
                    <p class="text-[10px] text-white/40 font-bold uppercase">{{ t('videoEditor.shortcuts.subtitle') }}</p>
                </div>
            </div>
            <button @click="showShortcutsPanel = false"
                class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <Close size="16" class="text-white/60" />
            </button>
        </div>

        <!-- Search & Actions -->
        <div class="flex items-center gap-3 mb-6">
            <div class="flex-1 relative">
                <Search size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <el-input v-model="searchQuery" :placeholder="t('videoEditor.shortcuts.searchPlaceholder')" class="pl-10" size="large" />
            </div>
            <el-button @click="resetToDefaults" size="large" class="!bg-white/5 !border-white/10 !text-white/60">
                <Refresh size="16" class="mr-2" />
                {{ t('videoEditor.shortcuts.reset') }}
            </el-button>
        </div>

        <!-- Shortcuts List -->
        <el-tabs type="border-card" class="shortcuts-tabs">
            <el-tab-pane v-for="cat in categories" :key="cat" :label="getCategoryLabel(cat)">
                <div class="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    <div v-for="shortcut in shortcutsByCategory[cat]" :key="shortcut.id"
                        class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-bold text-white">{{ shortcut.name }}</span>
                                <el-switch v-model="shortcut.enabled" size="small"
                                    @change="toggleShortcut(shortcut.id)" />
                            </div>
                            <p class="text-[10px] text-white/40 font-medium">{{ shortcut.description }}</p>
                        </div>

                        <div class="flex items-center gap-3">
                            <!-- Current Keys Display -->
                            <div v-if="editingShortcut !== shortcut.id"
                                class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
                                <span class="text-xs font-mono font-bold text-brand-primary">
                                    {{ formatKeys(shortcut.keys) }}
                                </span>
                            </div>

                            <!-- Recording Mode -->
                            <div v-else
                                class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary/20 border border-brand-primary/50 animate-pulse">
                                <span class="text-xs font-mono font-bold text-brand-primary">
                                    {{ recordingKeys.length > 0 ? formatKeys(recordingKeys) : t('videoEditor.shortcuts.pressKeys') }}
                                </span>
                            </div>

                            <!-- Edit Button -->
                            <button v-if="editingShortcut !== shortcut.id" @click="startRecording(shortcut.id)"
                                class="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-white/5 hover:bg-brand-primary/20 text-[10px] font-bold text-white/60 hover:text-brand-primary transition-all uppercase">
                                {{ t('videoEditor.shortcuts.edit') }}
                            </button>

                            <!-- Save/Cancel Buttons -->
                            <div v-else class="flex items-center gap-2">
                                <button @click="saveRecording"
                                    class="px-2 py-1 rounded-md bg-brand-primary/20 text-[10px] font-bold text-brand-primary uppercase">
                                    {{ t('videoEditor.shortcuts.save') }}
                                </button>
                                <button @click="cancelRecording"
                                    class="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-white/60 uppercase">
                                    {{ t('videoEditor.shortcuts.cancel') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>

        <!-- Footer Tip -->
        <div class="mt-6 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
            <p class="text-[10px] text-brand-primary/80 font-bold uppercase">
                💡 {{ t('videoEditor.shortcuts.tip') }}
            </p>
        </div>
    </el-dialog>
</template>

<style scoped>
.shortcuts-dialog :deep(.el-dialog__header) {
    display: none;
}

.shortcuts-dialog :deep(.el-dialog__body) {
    padding: 24px;
    background: #0a0a0a;
    border-radius: 16px;
}

.shortcuts-tabs :deep(.el-tabs__header) {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.1);
}

.shortcuts-tabs :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.shortcuts-tabs :deep(.el-tabs__item.is-active) {
    color: rgb(59, 130, 246);
    background: rgba(59, 130, 246, 0.1);
}

.shortcuts-tabs :deep(.el-tabs__content) {
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}
</style>
