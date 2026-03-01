/**
 * Keyboard Shortcuts Composable
 * Manages global keyboard shortcuts for the video editor
 */

import { onMounted, onUnmounted, ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { useUIStore } from '@/stores/ui';
import { toast } from 'vue-sonner';
import { defaultFont } from 'video-editor/constants/fonts';

export interface KeyboardShortcut {
    id: string;
    name: string;
    description: string;
    category: 'playback' | 'editing' | 'timeline' | 'selection' | 'effects' | 'general';
    keys: string[]; // e.g., ['ctrl', 'c'] or ['space']
    action: () => void;
    enabled: boolean;
}

const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
    // Playback
    { id: 'play-pause', name: 'Play/Pause', description: 'Toggle playback', category: 'playback', keys: ['space'], enabled: true },
    { id: 'rewind', name: 'Rewind', description: 'Rewind playback', category: 'playback', keys: ['j'], enabled: true },
    { id: 'forward', name: 'Fast Forward', description: 'Fast forward playback', category: 'playback', keys: ['l'], enabled: true },
    { id: 'pause', name: 'Pause', description: 'Pause playback', category: 'playback', keys: ['k'], enabled: true },
    { id: 'goto-start', name: 'Go to Start', description: 'Jump to timeline start', category: 'playback', keys: ['home'], enabled: true },
    { id: 'goto-end', name: 'Go to End', description: 'Jump to timeline end', category: 'playback', keys: ['end'], enabled: true },

    // Editing
    { id: 'copy', name: 'Copy', description: 'Copy selected element', category: 'editing', keys: ['ctrl', 'c'], enabled: true },
    { id: 'paste', name: 'Paste', description: 'Paste element', category: 'editing', keys: ['ctrl', 'v'], enabled: true },
    { id: 'cut', name: 'Cut', description: 'Cut selected element', category: 'editing', keys: ['ctrl', 'x'], enabled: true },
    { id: 'delete', name: 'Delete', description: 'Delete selected element', category: 'editing', keys: ['delete'], enabled: true },
    { id: 'undo', name: 'Undo', description: 'Undo last action', category: 'editing', keys: ['ctrl', 'z'], enabled: true },
    { id: 'redo', name: 'Redo', description: 'Redo last action', category: 'editing', keys: ['ctrl', 'y'], enabled: true },
    { id: 'duplicate', name: 'Duplicate', description: 'Duplicate selected element', category: 'editing', keys: ['ctrl', 'd'], enabled: true },
    { id: 'split-scene', name: 'Split Scene', description: 'Split active scene at playhead', category: 'editing', keys: ['s'], enabled: true },

    // Timeline
    { id: 'zoom-in', name: 'Zoom In', description: 'Zoom in timeline', category: 'timeline', keys: ['+'], enabled: true },
    { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom out timeline', category: 'timeline', keys: ['-'], enabled: true },
    { id: 'frame-forward', name: 'Next Frame', description: 'Move forward one frame', category: 'timeline', keys: ['arrowright'], enabled: true },
    { id: 'frame-forward', name: 'Next Frame', description: 'Move forward one frame', category: 'timeline', keys: ['arrowright'], enabled: true },
    { id: 'frame-backward', name: 'Previous Frame', description: 'Move backward one frame', category: 'timeline', keys: ['arrowleft'], enabled: true },
    { id: 'add-marker', name: 'Add Marker', description: 'Add marker at playhead', category: 'timeline', keys: ['m'], enabled: true },

    // Selection
    { id: 'select-all', name: 'Select All', description: 'Select all elements', category: 'selection', keys: ['ctrl', 'a'], enabled: true },
    { id: 'deselect', name: 'Deselect', description: 'Clear selection', category: 'selection', keys: ['escape'], enabled: true },

    // Effects & Tools
    { id: 'effects-panel', name: 'Effects Panel', description: 'Toggle effects panel', category: 'effects', keys: ['ctrl', 'e'], enabled: true },
    { id: 'text-tool', name: 'Text Tool', description: 'Add text element', category: 'effects', keys: ['ctrl', 't'], enabled: true },
    { id: 'import', name: 'Import Media', description: 'Open import dialog', category: 'general', keys: ['ctrl', 'i'], enabled: true },

    // General
    { id: 'save', name: 'Save Project', description: 'Save current project', category: 'general', keys: ['ctrl', 's'], enabled: true },
    { id: 'export', name: 'Export Video', description: 'Open export dialog', category: 'general', keys: ['ctrl', 'shift', 'e'], enabled: true },
    { id: 'shortcuts-panel', name: 'Shortcuts Panel', description: 'Show keyboard shortcuts', category: 'general', keys: ['ctrl', 'shift', 'k'], enabled: true },
];

export function useKeyboardShortcuts() {
    const editor = useEditorStore();
    const canvas = useCanvasStore();
    const uiStore = useUIStore();
    const shortcuts = ref<KeyboardShortcut[]>([]);
    const showShortcutsPanel = ref(false);

    const localStorageKey = computed(() => `${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_keyboard_shortcuts`);

    // Load custom shortcuts from localStorage
    const loadShortcuts = () => {
        const saved = localStorage.getItem(localStorageKey.value);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                shortcuts.value = parsed.map((s: any) => ({
                    ...s,
                    action: getActionForShortcut(s.id)
                }));
            } catch (e) {
                console.error('Failed to load shortcuts:', e);
                initializeDefaultShortcuts();
            }
        } else {
            initializeDefaultShortcuts();
        }
    };

    const initializeDefaultShortcuts = () => {
        shortcuts.value = DEFAULT_SHORTCUTS.map(s => ({
            ...s,
            action: getActionForShortcut(s.id)
        }));
    };

    const saveShortcuts = () => {
        const toSave = shortcuts.value.map(({ action, ...rest }) => rest);
        localStorage.setItem(localStorageKey.value, JSON.stringify(toSave));
    };

    const getActionForShortcut = (id: string): (() => void) => {
        const actions: Record<string, () => void> = {
            'play-pause': () => {
                if (canvas.timeline?.playing) {
                    canvas.timeline.pause();
                } else {
                    canvas.timeline?.play();
                }
            },
            'rewind': () => {
                const current = editor.currentTime || 0;
                editor.seekToGlobalTime(Math.max(0, current - 5));
            },
            'forward': () => {
                const current = editor.currentTime || 0;
                const max = (editor.totalDuration || 0) / 1000;
                editor.seekToGlobalTime(Math.min(max, current + 5));
            },
            'pause': () => canvas.timeline?.pause(),
            'goto-start': () => canvas.timeline?.set('seek', 0),
            'goto-end': () => canvas.timeline?.set('seek', (canvas.timeline?.duration || 0) / 1000),
            'copy': () => canvas.cloner?.copy(),
            'paste': () => canvas.cloner?.paste(),
            'cut': () => {
                canvas.cloner?.copy();
                if (canvas.selection?.active) {
                    canvas.instance?.remove(canvas.selection.active);
                }
            },
            'delete': () => {
                if (canvas.selection?.active) {
                    if ((canvas.selection.active as any).type === 'audio') {
                        canvas.audio?.delete((canvas.selection.active as any).id);
                    } else {
                        canvas.instance?.remove(canvas.selection.active);
                    }
                }
            },
            'undo': () => canvas.history?.undo(),
            'redo': () => canvas.history?.redo(),
            'duplicate': () => canvas.cloner?.clone(),
            'split-scene': () => editor.splitSceneAtPlayhead(),
            'add-marker': () => {
                const current = editor.currentTime || 0;
                editor.addMarker(current, `Marker ${editor.markers.length + 1}`);
                toast.success('Marker added');
            },
            'zoom-in': () => {
                const current = editor.timelineZoom;
                editor.setTimelineZoom(Math.min(5, current + 0.2));
            },
            'zoom-out': () => {
                const current = editor.timelineZoom;
                editor.setTimelineZoom(Math.max(0.2, current - 0.2));
            },
            'frame-forward': () => {
                const current = canvas.timeline?.seek || 0;
                const fps = editor.fps || 30;
                canvas.timeline?.set('seek', (current + (1000 / fps)) / 1000);
            },
            'frame-backward': () => {
                const current = canvas.timeline?.seek || 0;
                const fps = editor.fps || 30;
                canvas.timeline?.set('seek', Math.max(0, current - (1000 / fps)) / 1000);
            },
            'select-all': () => {
                const all = canvas.instance?.getObjects().filter(o => !o.excludeFromTimeline);
                if (all && all.length > 0) {
                    const selection = new (window as any).fabric.ActiveSelection(all, { canvas: canvas.instance });
                    canvas.instance?.setActiveObject(selection);
                    canvas.instance?.requestRenderAll();
                }
            },
            'deselect': () => {
                canvas.instance?.discardActiveObject();
                canvas.instance?.requestRenderAll();
            },
            'effects-panel': () => editor.setActiveSidebarRight(editor.sidebarRight === 'effects' ? null : 'effects'),
            'text-tool': () => canvas.canvas?.onAddText('New Text', defaultFont, 40, 400),
            'import': () => editor.setActiveSidebarLeft('upload'),
            'save': () => editor.saveProject(),
            'export': () => {
                const exportDialog = (window as any).__exportDialog;
                if (exportDialog && exportDialog.open) {
                    exportDialog.open();
                } else {
                    toast.info('Export dialog loading...');
                }
            },
            'shortcuts-panel': () => {
                showShortcutsPanel.value = !showShortcutsPanel.value;
            }
        };

        return actions[id] || (() => console.warn(`No action for shortcut: ${id}`));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing in input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const pressedKeys: string[] = [];
        if (e.ctrlKey || e.metaKey) pressedKeys.push('ctrl');
        if (e.shiftKey) pressedKeys.push('shift');
        if (e.altKey) pressedKeys.push('alt');

        const key = e.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
            pressedKeys.push(key);
        }

        // Find matching shortcut
        const shortcut = shortcuts.value.find(s => {
            if (!s.enabled) return false;
            if (s.keys.length !== pressedKeys.length) return false;
            return s.keys.every(k => pressedKeys.includes(k));
        });

        if (shortcut) {
            e.preventDefault();
            e.stopPropagation();
            shortcut.action();
        }
    };

    const updateShortcut = (id: string, keys: string[]) => {
        const shortcut = shortcuts.value.find(s => s.id === id);
        if (shortcut) {
            shortcut.keys = keys;
            saveShortcuts();
        }
    };

    const toggleShortcut = (id: string) => {
        const shortcut = shortcuts.value.find(s => s.id === id);
        if (shortcut) {
            shortcut.enabled = !shortcut.enabled;
            saveShortcuts();
        }
    };

    const resetToDefaults = () => {
        initializeDefaultShortcuts();
        saveShortcuts();
        toast.success('Keyboard shortcuts reset to defaults');
    };

    onMounted(() => {
        loadShortcuts();
        window.addEventListener('keydown', handleKeyDown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });

    return {
        shortcuts,
        showShortcutsPanel,
        updateShortcut,
        toggleShortcut,
        resetToDefaults,
        saveShortcuts
    };
}
