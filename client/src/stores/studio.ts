import { defineStore } from 'pinia';
import { computed, onUnmounted } from 'vue';
import api from '@/utils/api';
import { toast } from 'vue-sonner';
import { useProjectStore } from './project.js';
import { SceneType, Guest, ResourceAsset } from './studio/types';
import { createStudioState } from './studio/state';
import type { StudioContext } from './studio/context';
import { createSceneActions } from './studio/scene';
import { createGuestsActions } from './studio/guests';
import { createShowActions } from './studio/show';
import { createControlActions } from './studio/control';

export * from './studio/types';

export const useStudioStore = defineStore('studio', () => {
    const state = createStudioState();
    const ctx: StudioContext = { state, fns: {} };
    const sceneActions = createSceneActions(ctx);
    const guestsActions = createGuestsActions(ctx);
    const showActions = createShowActions(ctx);
    const controlActions = createControlActions(ctx);
    Object.assign(ctx.fns, sceneActions, guestsActions, showActions, controlActions);

    const { godModeEnabled, humanFreeMode, streamingContext, embeddedVideoUrl, liveSubtitlesEnabled, currentCaption, streamRatio, highlightedProduct, v2cMatch, assetGeneration, showOnboarding, activeScene, nextScene, scenes, transitionType, isTransitioning, activeEffects, overlays, liveGuests, waitingGuests, guestJoinLink, coHosts, projectTeam, maxGuests, currentProjectId, guestPermissions, visualSettings, backgroundAssets, featuredProducts, liveProducts, activeProductId, activeFlashSale, currentSessionId, viewerCount, engagement, health, sessionInfra, myGuestId, isLive, liveTime, viralMoments, activePeak, isInfiniteMode, bRollLibrary, autoDirectorSettings, currentSpeakerId, studioVibe, vibeScore, chatVelocity, intentScore, autoCameraEnabled, activeGraphicContent, activePoll, activeScript, scriptIndex, showProfiles, activeQuest, metricsHistory, verifiedFacts, activeRecap, userProgress, contextData, userWallet, storeCatalog, leaderboardData, isScreenSharing, screenStreamId, resourcePool, activeMediaId, bgmId, guestSlotMap, availableGuestSlots, hasProducts, demoMode, shadowStats, arSettings } = state;
    const { setBgm, switchScene, setCameraFocus, addCustomScene, removeScene, addEffect, removeEffect, toggleEffect, addOverlay, removeOverlay, updateOverlay, updateVisualSettings, resetVisualSettings, addCustomBackground, updateARSettings } = sceneActions;
    const { generateInvite, generateGuestLink, addGuest, approveGuest, rejectGuest, removeGuest, updateGuestStatus, muteGuest, toggleGuestCamera, kickGuest, assignGuestToSlot, swapWithHost, addCoHost, removeCoHost, hasPermission, fetchCollaborators } = guestsActions;
    const { toggleDemoMode, setSpeakerFocus, updateStudioVibe, setAutoCamera, updateGraphicContent, createShowScript, castVote, startShow, nextShowStep, updateMetrics, updateV2CMatch, updateScriptState, executeShowStep, fetchCommerceProducts, fetchCommerceReport, showcaseProduct, removeProduct, updateProductScarcity, setTranslationMode, triggerStreamSummary, appendHighlightChunk, captureHighlight, fetchShadowStats, fetchSessionInfra, startFlashSale, endFlashSale, fetchAnalytics, updateEngagement } = showActions;
    const { toggleGodMode, updateAutoDirector, triggerQuest, updateQuestProgress, applyContextPreset, broadcastCurrentState, applyRemoteState, updateHealth } = controlActions;

    onUnmounted(() => {
        // Socket cleanup handled by ActionSyncService
    });

    return {
        currentProjectId,
        projectTeam,
        fetchCollaborators,
        // State
        activeScene,
        nextScene,
        scenes,
        transitionType,
        isTransitioning,
        activeEffects,
        overlays,
        liveGuests,
        waitingGuests,
        guestJoinLink,
        coHosts,
        maxGuests,
        guestPermissions,
        showOnboarding,
        visualSettings,
        featuredProducts,
        liveProducts,
        activeProductId,
        activeFlashSale,
        // AI & Performance
        aiEnabled: computed(() => visualSettings.value.aiEnabled),
        currentSessionId,
        viewerCount,
        engagement,
        health,
        godModeEnabled,
        activeQuest,
        triggerQuest,
        updateQuestProgress,
        autoDirectorSettings,
        myGuestId,
        backgroundAssets,
        vibeScore,
        chatVelocity,
        intentScore,
        streamingContext,
        embeddedVideoUrl,

        // Computed
        guestSlotMap,
        availableGuestSlots,
        // liveProducts, // Duplicate removed

        // liveGuests, // liveGuests is now a state variable
        hasProducts,

        // Actions
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
        generateInvite,
        generateGuestLink,
        addGuest,
        approveGuest,
        rejectGuest,
        removeGuest,
        updateGuestStatus,
        muteGuest,
        toggleGuestCamera,
        kickGuest,
        assignGuestToSlot,
        swapWithHost,
        addCoHost,

        removeCoHost,
        hasPermission,
        showcaseProduct,
        removeProduct,
        updateProductScarcity,
        setTranslationMode,
        triggerStreamSummary,
        startFlashSale,
        endFlashSale,
        captureHighlight,
        viralMoments,
        shadowStats,
        fetchShadowStats,
        demoMode,
        toggleDemoMode,
        fetchCommerceProducts,
        fetchCommerceReport,
        updateEngagement,
        fetchAnalytics,
        updateHealth,
        toggleGodMode,
        updateAutoDirector,
        isInfiniteMode,
        sessionInfra,
        fetchSessionInfra,
        appendHighlightChunk,
        broadcastCurrentState,
        applyRemoteState,
        updateVisualSettings,
        arSettings,
        updateARSettings,
        resetVisualSettings,
        addCustomBackground,
        activePeak,
        humanFreeMode,
        applyContextPreset,

        // Screen Sharing & Resources
        isScreenSharing,
        screenStreamId,
        resourcePool,
        activeMediaId,
        bgmId,
        addResource(resource: ResourceAsset) {
            resourcePool.value.unshift(resource);
        },
        removeResource(id: string) {
            resourcePool.value = resourcePool.value.filter(r => r.id !== id);
        },
        metricsHistory,
        verifiedFacts,
        activeRecap,
        setMedia(id: string | null) {
            activeMediaId.value = id;
            broadcastCurrentState();
        },
        setBgm,
        currentSpeakerId,
        studioVibe,
        setSpeakerFocus,
        updateStudioVibe,
        updateMetrics,
        autoCameraEnabled,
        activeGraphicContent,
        bRollLibrary,
        liveSubtitlesEnabled,
        currentCaption,
        streamRatio,
        highlightedProduct,
        v2cMatch,
        updateV2CMatch,
        assetGeneration,
        linkProductToAidolClip(productId: string, clipUrl: string, eventName?: string) {
            // Update the live products library mapping
            // This would normally be persisted to the DB
            const product = liveProducts.value.find(p => p.id === productId);
            if (product) {
                if (eventName) {
                    product.eventClip = product.eventClip || {};
                    product.eventClip[eventName] = clipUrl;
                } else {
                    product.video = clipUrl;
                }
            }
            toast.success('Product linked to AI clip!');
        },

        highlightProduct(productId: string | null) {
            if (!productId) {
                highlightedProduct.value = null;
                return;
            }
            // Search liveProducts first, then fall back to featuredProducts
            let product = liveProducts.value.find(p => p.id === productId || p._id === productId);
            if (!product) {
                product = featuredProducts.value.find((p: any) => p.id === productId || p._id === productId);
            }
            if (product) {
                highlightedProduct.value = product;
                // Also ensure liveProducts is in sync so NeuralShowrunner commerce works
                if (!liveProducts.value.find(p => p.id === productId || p._id === productId)) {
                    liveProducts.value = [...featuredProducts.value];
                }

                this.setProductQRVisibility(productId, true);
            }
        },

        setProductQRVisibility(productId: string, visible: boolean) {
            const product = liveProducts.value.find(p => p.id === productId || p._id === productId);
            if (product) {
                product.showQR = visible;
            }
        },

        updateIntentScore(score: number) {
            // Logic to automatically show QR if intent is high
            const threshold = 0.7;
            if (score > threshold && highlightedProduct.value) {
                highlightedProduct.value.showQR = true;
            }
        },
        setAutoCamera,
        activeScript,
        scriptIndex,
        updateGraphicContent,
        createShowScript,
        startShow,
        nextShowStep,
        executeShowStep,
        updateScriptState,
        activePoll,
        contextData,
        isLive,
        liveTime,
        castVote,
        userProgress,
        userWallet,
        storeCatalog,
        leaderboardData,
        showProfiles,
        async fetchShowProfiles() {
            try {
                const { data } = await api.get('/show/profiles');
                showProfiles.value = data;
                return data;
            } catch (error) {
                console.error('[StudioStore] Failed to fetch show profiles:', error);
                throw error;
            }
        },

        // Gamification Actions
        async fetchUserProgress() {
            try {
                const { data } = await api.get('/gamification/progress');
                userProgress.value = data;
                return data;
            } catch (error) {
                console.error('[StudioStore] Failed to fetch user progress:', error);
            }
        },

        async fetchLeaderboard() {
            if (!godModeEnabled.value) return; // Gate: Only fetch if God Mode (Gaming Mode) is enabled
            
            try {
                const { data } = await api.get('/gamification/leaderboard');
                leaderboardData.value = data;
                return data;
            } catch (error) {
                console.error('[StudioStore] Failed to fetch leaderboard:', error);
            }
        },

        async processGamificationEvent(event: string, payload: any) {
            if (event === 'gamification:update') {
                userProgress.value = payload;
                // Re-fetch leaderboard when progress updates significantly or periodically
                await this.fetchLeaderboard();
            } else if (event === 'gamification:levelup') {
                // UI shows the level up popup via AchievementPopup.vue watching window events
                window.dispatchEvent(new CustomEvent('gamification:levelup', { detail: payload }));
                userProgress.value.level = payload.level;
            }
        },

        async draftMoment(momentId: string) {
            const projectStore = useProjectStore();
            const moment = viralMoments.value.find(m => m.id === momentId);
            
            if (!moment) {
                toast.error('Moment not found');
                return;
            }

            try {
                toast.info('Drafting viral moment to editor...');
                const project = await projectStore.createFromMoment(moment);
                
                if (project && project._id) {
                    return project;
                }
            } catch (error: any) {
                console.error('Failed to draft moment:', error);
                toast.error('Failed to create project draft');
            }
        },

        async publishMoment(momentId: string, platformAccountIds?: string[]) {
            const projectStore = useProjectStore();
            const moment = viralMoments.value.find(m => m.id === momentId);
            
            if (!moment) {
                toast.error('Moment not found');
                return;
            }

            try {
                toast.info('Preparing viral clip for publication...');
                
                const project = await projectStore.createFromMoment(moment);
                if (!project || !project._id) throw new Error('Failed to create project for syndication');

                let targets = platformAccountIds;
                if (!targets || targets.length === 0) {
                   const res : any = await api.get('/platform-accounts');
                   targets = res.data.accounts.filter((a: any) => a.isActive && ['tiktok', 'youtube', 'facebook'].includes(a.platform)).map((a: any) => a._id);
                }

                if (!targets || targets.length === 0) {
                    toast.warning('No active social accounts found. Moment drafted to editor instead.');
                    return project;
                }

                const publishRes : any = await api.post('/syndication/publish-video', {
                    projectId: project._id,
                    s3Key: moment.s3Key,
                    platformAccountIds: targets,
                    metadata: {
                        title: project.title,
                        description: moment.reason || 'Viral clip from live stream'
                    }
                });

                toast.success('Viral clip is now being published!');
                return { project, results: publishRes.data };

            } catch (error: any) {
                console.error('Failed to publish moment:', error);
                toast.error('Failed to publish viral moment');
            }
        },

        // ============================================
        // Actions: AI Co-Host Layout Management
        // ============================================

        /**
         * Returns the ideal "base" scene based on guest count, context, and human presence.
         */
        getAutoBaseScene(countOverride?: number): SceneType {
            const count = countOverride !== undefined ? countOverride : liveGuests.value.length;
            const context = (streamingContext.value as string);
            
            if (humanFreeMode.value) {
                // Side-by-Side layouts are specifically for Sales context
                if (context === 'sales' || context === 'music') {
                    if (count <= 1) return 'shoutout';
                    if (count === 2) return 'sale_duo';
                    return 'sale_trio';
                }
                else if(context === 'education' || context === 'gaming' || context === 'sport'){
                    return 'pip';
                }
                else if(context === 'talkshow'){
                    return 'interview';
                }
                else if(context === 'news'){
                    return 'standard';
                }
                else if(context === 'gameshow'){
                    return 'grid';
                }
                
                
                // Generic Human-Free fallbacks
                if (count === 0) return 'standard';
                if (count === 1) return 'shoutout';
                return 'interview';
            }
            
            return 'standard';
        },

        /**
         * Add an AI Influencer as a co-host guest and auto-adapt the scene layout.
         */
        addAICoHostToStudio(coHostEntityId: string, coHostName: string) {
            const existing = liveGuests.value.find(g => g.uuid === coHostEntityId);
            if (existing) return; // Already present

            const aiGuest: Guest = {
                uuid: coHostEntityId,
                name: coHostName,
                type: 'ai',
                status: 'live',
                audioEnabled: true,
                videoEnabled: true,
            };

            this.addGuest(aiGuest);

            // Auto-adapt to Side-by-Side layouts
            const ideal = this.getAutoBaseScene();
            this.switchScene(ideal);

            toast.success(`${coHostName} joined the session`);
        },

        /**
         * Remove an AI co-host and restore appropriate layout.
         */
        removeAICoHostFromStudio(coHostEntityId: string) {
            this.removeGuest(coHostEntityId);

            const ideal = this.getAutoBaseScene();
            this.switchScene(ideal);
        }
    };
});
