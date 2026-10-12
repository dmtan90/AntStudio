// God mode, auto-director, quests and state synchronization (moved verbatim from the studio store setup function).
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { toast } from 'vue-sonner';
import { StreamingContext, StreamHealth, AutoDirectorConfig, Quest } from './types';
import type { StudioContext } from './context';

export function createControlActions(ctx: StudioContext) {
    const { t, godModeEnabled, humanFreeMode, streamingContext, highlightedProduct, activeScene, liveGuests, waitingGuests, visualSettings, featuredProducts, liveProducts, activeProductId, activeFlashSale, health, autoDirectorSettings, studioVibe, activeQuest, userProgress, isRemoteUpdate } = ctx.state;
    const showcaseProduct = (...args: any[]) => ctx.fns.showcaseProduct(...args);
    const switchScene = (...args: any[]) => ctx.fns.switchScene(...args);
    const updateStudioVibe = (...args: any[]) => ctx.fns.updateStudioVibe(...args);

    // ============================================
    // Actions: Synchronization
    // ============================================

    let broadcastTimeout: any = null;

    // ============================================
    // Actions: God Mode
    // ============================================

    function toggleGodMode() {
        godModeEnabled.value = !godModeEnabled.value;
        autoDirectorSettings.value.enabled = godModeEnabled.value;
    }

    function updateAutoDirector(settings: Partial<AutoDirectorConfig>) {
        Object.assign(autoDirectorSettings.value, settings);
    }

    // Quest Actions
    function triggerQuest(quest: Quest) {
        // Prevent concurrent quests
        if (activeQuest.value && !activeQuest.value.completed) return;
        activeQuest.value = { ...quest, current: 0, completed: false };
        console.log(`[Studio] Triggering Quest: ${quest.title}`);
    }

    function updateQuestProgress(amount: number) {
        if (!activeQuest.value || activeQuest.value.completed) return;
        
        activeQuest.value.current = Math.min(activeQuest.value.target, activeQuest.value.current + amount);
        
        if (activeQuest.value.current >= activeQuest.value.target) {
            activeQuest.value.completed = true;
            userProgress.value.xp += activeQuest.value.rewardXp;
            
            // Wire i18n for quest completion toast
            toast.success(t('studio.quests.success'), {
                description: t('studio.quests.rewardUnlocked', { reward: `${activeQuest.value.rewardXp} XP` })
            });

            // Auto-clear quest display after 15 seconds
            setTimeout(() => {
                if (activeQuest.value?.completed) activeQuest.value = null;
            }, 15000);
        }
    }

    function applyContextPreset(context: StreamingContext) {
        streamingContext.value = context;
        console.log(`[Studio] Applying Context Preset: ${context}`);

        // Default: Enable Human Free Mode for everything except 'general'
        humanFreeMode.value = context !== 'general';
        godModeEnabled.value = context !== 'general';
        autoDirectorSettings.value.enabled = context !== 'general';

        switch (context) {
            case 'sales':
                updateStudioVibe('hype');
                visualSettings.value.ai.autonomousProduction = true;
                visualSettings.value.specialOverlays.showSponsorship = true;
                visualSettings.value.atmosphereEffect = 'glitter';
                
                // Ensure default background is set for Sales
                if (!visualSettings.value.background.assetUrl) {
                    visualSettings.value.background.mode = 'virtual';
                    visualSettings.value.background.assetUrl = '/bg/pro-studio.jpg';
                    visualSettings.value.background.isAssetVideo = false;
                }

                switchScene('standard');
                // Auto-showcase first product if available to match "front and center" design
                if (liveProducts.value.length > 0) {
                    showcaseProduct(liveProducts.value[0]);
                }
                break;
            case 'talkshow':
                updateStudioVibe('professional');
                autoDirectorSettings.value.autoSwitchOnSpeaker = true;
                visualSettings.value.atmosphereEffect = 'fireflies';
                switchScene('interview');
                break;
            case 'news':
                updateStudioVibe('professional');
                visualSettings.value.showTicker = true;
                visualSettings.value.accessibility.captions = true;
                visualSettings.value.atmosphereEffect = null;
                switchScene('standard');
                break;
            case 'music':
                updateStudioVibe('hype');
                visualSettings.value.arEnabled = true;
                visualSettings.value.atmosphereEffect = 'bubbles';
                switchScene('standard');
                break;
            case 'gameshow':
                updateStudioVibe('hype');
                visualSettings.value.specialOverlays.confetti = true;
                visualSettings.value.atmosphereEffect = 'glitter';
                switchScene('supergrid');
                break;
            case 'game_streaming':
                updateStudioVibe('hype');
                switchScene('screen_focus'); // Game/Screen main, Host in PiP
                autoDirectorSettings.value.autoPivotEnabled = true;
                visualSettings.value.atmosphereEffect = 'sakura';
                break;
            case 'sport':
                updateStudioVibe('dramatic');
                switchScene('screen_focus'); // Match/Screen main, Host in PiP
                visualSettings.value.showLowerThird = true;
                autoDirectorSettings.value.autoPublishViral = true;
                visualSettings.value.atmosphereEffect = 'glitter';
                break;
            case 'commentary':
                updateStudioVibe('chill');
                switchScene('screen_focus'); // Content main, Host in PiP
                visualSettings.value.atmosphereEffect = 'fireflies';
                break;
            case 'education':
                updateStudioVibe('professional');
                visualSettings.value.showLowerThird = true;
                visualSettings.value.accessibility.captions = true;
                switchScene('screen_focus'); // Slides/Screen main, Teacher in PiP
                visualSettings.value.atmosphereEffect = null;
                break;
            case 'general':
            default:
                updateStudioVibe('neutral');
                visualSettings.value.atmosphereEffect = 'snow';
                switchScene('standard');
                break;
        }

        // Emit environmental shift for AI awareness
        window.dispatchEvent(new CustomEvent('environmental:shift', {
            detail: {
                context,
                vibe: studioVibe.value,
                effect: visualSettings.value.atmosphereEffect
            }
        }));
        
        broadcastCurrentState();
        
        const modeName = t(`studio.contextSelector.modes.${context}.name`);
        toast.success(t('studio.messages.contextApplied', { mode: modeName }));
    }

    function broadcastCurrentState() {
        if (broadcastTimeout) clearTimeout(broadcastTimeout);
        broadcastTimeout = setTimeout(() => {
            ActionSyncService.broadcastStudioState({
                activeSceneId: activeScene.value.id,
                activeProductId: activeProductId.value,
                activeFlashSale: activeFlashSale.value,
                activeGuests: liveGuests.value.map(g => ({
                    uuid: g.uuid,
                    name: g.name,
                    type: g.type,
                    avatar: g.avatar,
                    status: g.status,
                    audioEnabled: g.audioEnabled,
                    videoEnabled: g.videoEnabled,
                    slotIndex: g.slotIndex,
                    joinedAt: g.joinedAt,
                    streamId: (g as any).stream?.id || g.streamId // Ensure we send the stream ID
                }))
            });
            broadcastTimeout = null;
        }, 120);
    }

    function applyRemoteState(state: any) {
        isRemoteUpdate.value = true;
        try {
            if (state.activeSceneId && state.activeSceneId !== activeScene.value.id) {
                switchScene(state.activeSceneId);
            }
            if (state.activeProductId !== undefined) {
                if (!state.activeProductId) {
                    highlightedProduct.value = null;
                } else {
                    const product = liveProducts.value.find(p => p.id === state.activeProductId || p._id === state.activeProductId) ||
                                  featuredProducts.value.find((p: any) => p.id === state.activeProductId || p._id === state.activeProductId);
                    if (product) highlightedProduct.value = product;
                }
            }
            if (state.activeFlashSale !== undefined) {
                activeFlashSale.value = state.activeFlashSale;
            }
            if (state.activeGuests && Array.isArray(state.activeGuests)) {
                // Determine if we need to update guests
                // We naively replace the list but we should check if it actually changed to avoid reactivity thrashing if possible
                // For now, simple replacement is safer for consistency

                // Preserve local stream objects if they were somehow attached (though useStudioP2P handles streams)
                // We just update the metadata
                const newGuestIds = new Set(state.activeGuests.map((g: any) => g.uuid));

                // Sync liveGuests
                liveGuests.value = state.activeGuests;

                // Also cleanup waiting guests if they are now live
                waitingGuests.value = waitingGuests.value.filter(g => !newGuestIds.has(g.uuid));
            }
        } finally {
            setTimeout(() => {
                isRemoteUpdate.value = false;
            }, 100);
        }
    }

    function updateHealth(stats: Partial<StreamHealth>) {
        //console.log("[Store] Updating health with stats:", stats);
        health.value = { 
            ...health.value, 
            ...stats 
        };
        
        if (health.value.bitrate < 500 || health.value.rtt > 300) {
            health.value.status = 'poor';
        } else if (health.value.bitrate < 1500 || health.value.rtt > 150) {
            health.value.status = 'fair';
        } else {
            health.value.status = 'good';
        }
    }

    return {
        toggleGodMode,
        updateAutoDirector,
        triggerQuest,
        updateQuestProgress,
        applyContextPreset,
        broadcastCurrentState,
        applyRemoteState,
        updateHealth,
    };
}
