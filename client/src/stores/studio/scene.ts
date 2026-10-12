// Scenes, effects, overlays, background music and visual settings (moved verbatim from the studio store setup function).
import { TransitionType, Scene, Effect, Overlay, DEFAULT_VISUAL_SETTINGS, ARFilterSettings } from './types';
import type { StudioContext } from './context';

export function createSceneActions(ctx: StudioContext) {
    const { activeScene, nextScene, scenes, transitionType, isTransitioning, activeEffects, overlays, liveGuests, activeArchiveId, visualSettings, backgroundAssets, isRemoteUpdate, bgmId } = ctx.state;
    const assignGuestToSlot = (...args: any[]) => ctx.fns.assignGuestToSlot(...args);
    const broadcastCurrentState = (...args: any[]) => ctx.fns.broadcastCurrentState(...args);

    // ============================================
    // Actions: Audio & Performance
    // ============================================

    function setBgm(id: string | null) {
        bgmId.value = id;
        console.log(`[Studio] Background music set to: ${id}`);
        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    // ============================================
    // Actions: Scene Management
    // ============================================

    async function switchScene(sceneId: string, transition: TransitionType = transitionType.value) {
        const scene = scenes.value.find(s => s.id === sceneId);
        if (!scene || scene.id === activeScene.value.id) return;

        isTransitioning.value = true;
        transitionType.value = transition;
        nextScene.value = scene;

        // Simulate transition duration
        await new Promise(resolve => setTimeout(resolve, transition === 'instant' ? 0 : 600));

        activeScene.value = scene;
        nextScene.value = null;
        isTransitioning.value = false;

        console.log(`[Studio] Switched to scene: ${scene.name}`);

        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    async function setCameraFocus(target: string) {
        // AI Director Logic
        console.log(`[Studio] AI Director focusing on: ${target}`);

        if (target === 'host') {
            // Standard Host View
            if (activeScene.value.id !== 'standard') {
                await switchScene('standard');
            }
        } else if (target === 'wide') {
            // Wide Shot (Grid or Full)
             // If multiple guests, go grid. If solo, go wide/standard
             if (liveGuests.value.length == 1) {
                 if (activeScene.value.id !== 'interview') await switchScene('interview');
             }
             else if (liveGuests.value.length > 1) {
                 if (activeScene.value.id !== 'grid') await switchScene('grid');
             } 
             else {
                 if (activeScene.value.id !== 'fullscreen') await switchScene('fullscreen');
             }
        } else if (target === 'screen') {
            // Screen Share Focus (Pip or SideBySide)
            if (activeScene.value.id !== 'pip') {
                await switchScene('pip'); 
                // TODO: Update pip layout to ensure source is 'screen'
                // This requires scene mutation or dynamic source mapping which is complex.
                // For now, assuming pip scene handles 'main' as screen if sharing.
            }
        } else {
            // Target is likely a Guest ID
            const guest = liveGuests.value.find(g => g.uuid === target || g.socketId === activeArchiveId.value);
            // Also check for AI guests activeArchiveId match? 
            
            if (guest) {
                // Focus on Guest (Shoutout)
                // Map guest to slot 0 (guest1)
                assignGuestToSlot(target, 0); 
                if (activeScene.value.id !== 'shoutout') {
                    await switchScene('shoutout');
                }
            } else {
                console.warn(`[Studio] Target focus ${target} - guest not found`);
                // Fallback to host
                await switchScene('standard');
            }
        }
    }

    function addCustomScene(scene: Scene) {
        scenes.value.push(scene);
    }

    function removeScene(sceneId: string) {
        scenes.value = scenes.value.filter(s => s.id !== sceneId);
    }

    // ============================================
    // Actions: Effects
    // ============================================

    function addEffect(effect: Effect) {
        activeEffects.value.push(effect);
    }

    function removeEffect(effectId: string) {
        activeEffects.value = activeEffects.value.filter(e => e.id !== effectId);
    }

    function toggleEffect(effectId: string) {
        const effect = activeEffects.value.find(e => e.id === effectId);
        if (effect) effect.enabled = !effect.enabled;
    }

    // // Audience Quest Actions
    // function triggerQuest(quest: Quest) {
    //     // Prevent concurrent quests
    //     if (activeQuest.value && !activeQuest.value.completed) return;
    //     activeQuest.value = quest;
    // }

    // function updateQuestProgress(amount: number) {
    //     if (!activeQuest.value || activeQuest.value.completed) return;
        
    //     activeQuest.value.current += amount;
    //     if (activeQuest.value.current >= activeQuest.value.target) {
    //         activeQuest.value.current = activeQuest.value.target;
    //         activeQuest.value.completed = true;
    //     }
    // }

    // ============================================
    // Actions: Overlays
    // ============================================

    function addOverlay(overlay: Overlay) {
        overlays.value.push(overlay);
    }

    function removeOverlay(overlayId: string) {
        overlays.value = overlays.value.filter(o => o.id !== overlayId);
    }

    function updateOverlay(overlayId: string, updates: Partial<Overlay>) {
        const overlay = overlays.value.find(o => o.id === overlayId);
        if (overlay) Object.assign(overlay, updates);
    }

    // ============================================
    // Return
    // ============================================

    function updateVisualSettings(settings: Partial<typeof visualSettings.value>) {
        visualSettings.value = {
            ...visualSettings.value,
            ...settings
        };
        broadcastCurrentState();
    }

    function resetVisualSettings() {
        visualSettings.value = { ...DEFAULT_VISUAL_SETTINGS };
        broadcastCurrentState();
    }

    const addCustomBackground = (asset: any) => {
        backgroundAssets.value.push(asset);
    };

    function updateARSettings(settings: Partial<ARFilterSettings>) {
        visualSettings.value.ar = { ...visualSettings.value.ar, ...settings };
        broadcastCurrentState();
    }

    return {
        setBgm,
        switchScene,
        setCameraFocus,
        addCustomScene,
        removeScene,
        addEffect,
        removeEffect,
        toggleEffect,
        addOverlay,
        removeOverlay,
        updateOverlay,
        updateVisualSettings,
        resetVisualSettings,
        addCustomBackground,
        updateARSettings,
    };
}
